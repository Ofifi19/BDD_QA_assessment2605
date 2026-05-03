## Why

目前系統以前端 `<script src="...">` 順序掛載 JS 檔案，不僅可能造成全域變數污染，在部署至雲端對外開放時更容易遭遇嚴重的瀏覽器快取 (Cache) 問題。導入 Vite 可以在建置過程中自動對靜態資源加上 Hash，完美解決快取無法自動更新的痛點，同時提升程式碼模組化程度與未來可維護性。

## What Changes

- 初始化 Vite 專案（採用 Vanilla JS 架構）。
- 將現有的 `index.html`、`css/`、及所有的 JavaScript 檔案 (`app.js`, `bdd.js`, `history.js`, `upload.js`) 遷移至 Vite 的來源結構下，並將腳本改寫為標準的 ES6 Modules 進行互相引用。
- 後端 `main.py` 將調整靜態檔案的掛載路徑，改為直接指向 Vite 打包後所產生的 `dist` 目錄。

## Non-Goals

- 本次變更為純技術性重構，不改變或新增任何現有的前端介面功能、使用者操作流程。
- 不改變任何 BDD 規格生成與品質診斷的後端核心 AI 邏輯。
- 不引入如 React、Vue 等重量級前端框架，維持輕量化的 Vanilla JS。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected specs: (none)
- Affected code:
  - New: `package.json`, `vite.config.js` 等相關 Vite 配置檔
  - Modified: `main.py` (修改掛載靜態資源的路徑)，`index.html` (改用 Vite 的 ES Module 載入)，所有現有前端 JS 檔案 (轉為 import/export 語法)
  - Removed: 原本前端依賴路徑的手動 Cache Busting 寫法 (`?v=10`)
