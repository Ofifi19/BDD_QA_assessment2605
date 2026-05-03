## Context

目前前端程式碼（HTML、CSS、JS）是全手動維護的 Vanilla JS 架構，並沒有建置流程。所有靜態檔案皆放置於專案根目錄或其子目錄 (`js/`, `css/`)，並由 FastAPI 的 `StaticFiles` 掛載。這使得我們在將應用程式部署至雲端對外發布時，必須手動透過 URL query 參數 (`?v=10`) 處理快取更新，且容易遇到 JS 檔案全域變數互相污染的問題。

## Goals / Non-Goals

**Goals:**
- 導入 Vite 建立前端打包流程。
- 將原有的 JS 腳本轉換為 ES6 Modules 互相引用，消除全域變數（如 `bddGen`, `historyMgr`）。
- 讓 Vite 輸出帶有 Hash 檔名的資源，交給 FastAPI 伺服，確保生產環境快取更新無痛。
- 維持現有的 Vanilla JS 技術堆疊。

**Non-Goals:**
- 不改變任何 UI 外觀或既有的業務流程。
- 不引入任何前端 UI 框架 (React, Vue 等)。
- 不改變後端處理資料庫或呼叫 AI API 的核心邏輯。

## Decisions

### 採用 Vite 建立獨立的前端資料夾
目前前端代碼與後端代碼混在同一個目錄。我們決定在根目錄建立 `frontend` 資料夾（或透過 `npx create-vite-app frontend`），然後將現有的 `index.html`, `js/`, `css/` 全部移入。Vite 預設打包輸出的 `dist` 目錄將會是我們正式提供靜態檔案的地方。
*Alternative:* 將整個專案根目錄直接當作 Vite 根目錄。這會讓 Node.js 配置檔和 Python 配置檔混雜，較不乾淨。

### 採用 ES6 Module 改寫 JS 檔案
現有腳本如 `bdd.js` 定義了 `class BddGenerator`，然後在 `app.js` 初始化。我們決定在這些腳本加入 `export default BddGenerator;`，並在 `app.js` 裡 `import`。
*Alternative:* 依賴原有的全局範圍。雖然 Vite 可以打包，但不使用 ES Module 會失去 Vite 的靜態分析和 Tree-shaking 效益，且變數依舊可能衝突。

### FastAPI 掛載 Vite 的 dist 目錄
在 `main.py` 裡，將 `app.mount("/", StaticFiles(directory=".", html=True), name="static")` 替換為 `app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")`。在開發時期，開發者可以平行啟動 FastAPI 與 Vite dev server，或者將 Vite build 完再執行 FastAPI。

## Risks / Trade-offs

- [開發流程改變] 開發時不再是單純修改 HTML 後重整即可，必須跑 `npm run dev` 啟動前端開發伺服器，或每次編譯後跑後端。
  - Mitigation: 可以在文件或 `package.json` 加入方便的啟動腳本。
- [跨域存取 (CORS)] 開發期間，Vite (通常在 5173 port) 需要打 FastAPI (8000 port) 的 API，可能會遇到 CORS 或路徑錯誤。
  - Mitigation: 在 Vite 中配置 `server.proxy`，將 `/api` 請求導向 `localhost:8000`。
