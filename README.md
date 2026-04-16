# MyLedger

一個基於 Google Sheets API 與 OAuth 2.0 身分驗證的輕量化個人記帳工具。

## 📖 專案簡介
GridLedger 是一個純前端的網頁應用程式，旨在將 Google 試算表轉化為功能強大的後端資料庫（Headless CMS）。使用者可以透過此工具直接讀寫雲端試算表，實現資料隨身帶走、不依賴特定伺服器的私有記帳方案。

## 🚀 核心功能
* **OAuth 2.0 安全驗證**：不使用 API Key，完全透過 Google 官方授權機制進行身分驗證，保障個人資料安全。
* **自動化日期排序**：具備智慧排序邏輯，補記歷史帳目時，系統會自動將資料插入正確的日期位置。
* **動態欄位管理**：自動從試算表的「欄位表」讀取分類與支付方式，無需修改程式碼即可自定義選單。
* **收支儀表板**：自動過濾並計算當月收支總額，並以比例圖表呈現支出分布。
* **響應式 UI**：基於 Bootstrap 5 開發，支援手機與桌面端操作。

## 🛠️ 技術架構
* **前端核心**：Vanilla JavaScript (ES6+), HTML5, CSS3
* **樣式框架**：Bootstrap 5
* **資料儲存**：Google Sheets API v4
* **授權機制**：Google Identity Services

## ⚙️ 環境設定與安裝

### 1. 準備 Google 試算表
請於 Google Drive 建立一份試算表，並包含以下兩個工作表：

* **工作表一：[記帳紀錄]**
    * 標題列（第 1 列）：`ID`, `Date`, `Type`, `Category`, `Amount`, `Description`, `Payment`
* **工作表二：[欄位表]**
    * 標題列（第 1 列）：`Type`, `Category`, `Payment`
    * 下方填入預設的收支類型、消費分類與支付工具。

### 2. 建立 Google Cloud 憑證
1.  進入 [Google Cloud Console](https://console.cloud.google.com/)。
2.  建立新專案，並於「API 和服務」中搜尋並啟用 **Google Sheets API**。
3.  設定「OAuth 同意畫面」（User Type 選擇「外部」，填寫基本資訊）。
4.  於「憑證」頁面點擊「建立憑證」 -> **OAuth 2.0 用戶端 ID**。
5.  應用程式類型選擇 **「網頁應用程式」**。
6.  **重要**：在「已授權的 JavaScript 來源」中加入你預計執行的 URL（例如：`http://localhost:5500`）。

### 3. 設定變數
將取得的資訊填入 `script.js` 頂部的常數中：
```javascript
const CLIENT_ID = '你的_CLIENT_ID.apps.googleusercontent.com';
const SPREADSHEET_ID = '你的_試算表_ID_字串';