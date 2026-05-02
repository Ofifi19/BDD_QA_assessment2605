## 1. Vite 專案初始化

- [x] 1.1 執行 `npx -y create-vite-app@latest frontend --template vanilla` (採用 Vite 建立獨立的前端資料夾)
- [x] 1.2 清理 frontend 預設的 boilerplate 檔案，保留空架構。

## 2. 靜態資源搬遷與模組化 (採用 ES6 Module 改寫 JS 檔案)

- [x] 2.1 將 `css/` 資料夾移至 `frontend/src/css/`，將 `index.html` 移至 `frontend/`。
- [x] 在後台品質分數欄位旁顯示(i) 評分說明，讓使用者點擊後可顯示以下資訊
- [x] 2.2 將 `js/app.js`, `js/bdd.js`, `js/history.js`, `js/upload.js` 移至 `frontend/src/js/`，並改寫為標準的 ES6 export/import 格式。
- [x] 2.3 修改 `frontend/index.html`，改以 `<script type="module" src="/src/js/app.js"></script>` 載入。

## 3. FastAPI 後端調整 (FastAPI 掛載 Vite 的 dist 目錄)

- [x] 3.1 修改 `main.py` 的靜態資料夾掛載設定，將原先的 `directory="."` 調整為指向 Vite 構建出的 `frontend/dist` 目錄。
- [x] 3.2 於 `main.py` 的 `get_admin_page` 路由，更新讀取 `admin.html` 的路徑對應。

## 4. 驗證與測試

- [x] 4.1 在 `frontend` 目錄下執行 `npm run build`，確認 `dist` 中正確產生 hash JS 檔。
- [x] 4.2 啟動 `main.py`，開啟首頁與後台，確認所有 UI 功能、診斷按鈕與比對對話框行為皆與重構前一致。

- [x] 關於分數單位 本質量指數以百分比 (%) 為單位計算，代表該規格與 BDD 專家標準的契合程度。 90-100% 極致優質 結構嚴謹且意圖清晰，幾乎不需要人工微調。 70-89% 良好 可能僅在普及性或精簡性上有輕微細節瑕疵。 60% 以下 結構性問題 混入過多操作細節或意圖不單一，強烈建議優化