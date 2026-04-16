/**
 * 個人記帳工具 - 核心邏輯 (OAuth 2.0 版)
 * 功能：Google Sheets 讀寫、自動日期排序、本月收支統計
 */

// ==========================================
// [設定區] 請填寫你的 Google 資訊
// ==========================================
const CLIENT_ID = '669448025168-lbe49f2atcmu5alnio8c5vavt9839uqi.apps.googleusercontent.com';
const SPREADSHEET_ID = '1GELKUq2CW_Qj8btBN0d5HT3YfGKQPInb6px2LD8u9ak';
// ==========================================

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// DOM 元件選取
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const appContent = document.getElementById('app_content');
const form = document.getElementById('record_form');
const recordTableBody = document.getElementById('record_table_body');

/**
 * 1. 初始化 Google API 客戶端
 */
function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
    });
}

/**
 * 2. 初始化 Google Identity Services (OAuth)
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // 稍後在 handleAuthClick 定義
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        authorizeButton.style.display = 'block';
    }
}

/**
 * 3. 登入與登出處理
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);

        // 登入成功後切換 UI
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        appContent.style.display = 'block';

        // 初始化設定
        document.getElementById('input_date').valueAsDate = new Date();

        // 載入資料
        await refreshAllData();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        appContent.style.display = 'none';
    }
}

/**
 * 4. 資料獲取與處理
 */
async function refreshAllData() {
    await fetchOptions(); // 取得下拉選單內容
    await fetchRecords(); // 取得並排序記帳紀錄
}

// 取得 [欄位表] 並填入下拉選單
async function fetchOptions() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: '欄位表!A2:C',
        });

        const rows = response.result.values || [];
        let types = new Set(), categories = new Set(), payments = new Set();

        rows.forEach(row => {
            if (row[0]) types.add(row[0]);
            if (row[1]) categories.add(row[1]);
            if (row[2]) payments.add(row[2]);
        });

        populateSelect('input_type', types);
        populateSelect('input_category', categories);
        populateSelect('input_payment', payments);
    } catch (err) {
        console.error('取得欄位表失敗:', err);
    }
}

function populateSelect(id, dataSet) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    dataSet.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.text = item;
        select.appendChild(opt);
    });
}

// 取得 [記帳紀錄] 並按日期排序
async function fetchRecords() {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: '記帳紀錄!A2:G',
        });

        let rows = response.result.values || [];

        // 日期排序邏輯：最新日期在最上方
        rows.sort((a, b) => {
            const dateA = new Date(a[1]);
            const dateB = new Date(b[1]);
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            // 若日期相同，按 ID (Timestamp) 排序
            return b[0].localeCompare(a[0]);
        });

        renderTable(rows);
        calculateDashboard(rows);
    } catch (err) {
        console.error('取得紀錄失敗:', err);
    }
}

/**
 * 5. UI 渲染與計算
 */
function renderTable(sortedRows) {
    recordTableBody.innerHTML = '';
    // 顯示排序後的前 15 筆
    const displayRows = sortedRows.slice(0, 15);

    displayRows.forEach(row => {
        const [id, date, type, category, amount, desc] = row;
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${date}</td>
      <td><span class="badge ${type === '收入' ? 'bg-success' : 'bg-danger'}">${type}</span></td>
      <td>${category}</td>
      <td>${desc}</td>
      <td class="text-end fw-bold">$${Number(amount).toLocaleString()}</td>
    `;
        recordTableBody.appendChild(tr);
    });
}

function calculateDashboard(sortedRows) {
    // 獲取目前月份 YYYY-MM
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let income = 0;
    let expense = 0;
    let catTotals = {};

    sortedRows.forEach(row => {
        const [id, date, type, category, amount] = row;
        const val = Number(amount) || 0;

        // 只統計本月資料
        if (date && date.startsWith(currentMonth)) {
            if (type === '收入') {
                income += val;
            } else {
                expense += val;
                catTotals[category] = (catTotals[category] || 0) + val;
            }
        }
    });

    document.getElementById('summary_income').innerText = `$${income.toLocaleString()}`;
    document.getElementById('summary_expense').innerText = `$${expense.toLocaleString()}`;

    renderCategoryBreakdown(catTotals, expense);
}

function renderCategoryBreakdown(totals, totalExpense) {
    const container = document.getElementById('category_breakdown');
    container.innerHTML = '';

    if (totalExpense === 0) {
        container.innerHTML = '<p class="text-muted text-center mb-0">本月尚無支出紀錄</p>';
        return;
    }

    // 排序分類支出
    const sortedCat = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    sortedCat.forEach(([name, val]) => {
        const percent = Math.round((val / totalExpense) * 100);
        container.innerHTML += `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span>${name}</span>
          <small class="text-muted">$${val.toLocaleString()} (${percent}%)</small>
        </div>
        <div class="progress">
          <div class="progress-bar" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
    });
}

/**
 * 6. 提交表單 (新增紀錄)
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = '儲存中...';

    const newRow = [
        Date.now().toString(), // ID
        document.getElementById('input_date').value,
        document.getElementById('input_type').value,
        document.getElementById('input_category').value,
        document.getElementById('input_amount').value,
        document.getElementById('input_description').value,
        document.getElementById('input_payment').value
    ];

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: '記帳紀錄!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });

        // 清空部分欄位
        document.getElementById('input_amount').value = '';
        document.getElementById('input_description').value = '';

        // 重新載入資料 (會觸發重新排序)
        await fetchRecords();

    } catch (err) {
        console.error('新增失敗:', err);
        alert('新增失敗，請檢查權限設定');
    } finally {
        btn.disabled = false;
        btn.innerText = '新增紀錄';
    }
});

// 監聽按鈕點擊
authorizeButton.onclick = handleAuthClick;
signoutButton.onclick = handleSignoutClick;

// 開始載入 Google 腳本
window.onload = () => {
    gapiLoaded();
    gisLoaded();
};