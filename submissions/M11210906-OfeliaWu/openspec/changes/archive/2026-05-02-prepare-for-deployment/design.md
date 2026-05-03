## Context

目前系統後端使用 FastAPI，資料庫為 SQLite。前端為 Vite 靜態資源。API 金鑰與資料庫路徑目前為本地配置，尚未針對公開部署進行優化。

## Goals / Non-Goals

**Goals:**

- 確保 API 金鑰不會洩露至 Git。
- 提供無需資料庫紀錄即可運行的診斷 API。
- 提供完整的部署說明文件。

**Non-Goals:**

- 實作完整的使用者認證系統（作業階段暫不考慮）。
- 遷移資料庫至 PostgreSQL。

## Decisions

### 使用 .gitignore 排除敏感檔案

- **決策**：建立一個包含 `.env`, `*.db`, `uploads/`, `venv/`, `__pycache__/`, `dist/` 的 `.gitignore`。
- **理由**：防止本地開發環境的快取、虛擬環境、敏感金鑰與測試資料被推送到公開倉庫。

### 新增無狀態診斷 API (/api/audit-stateless)

- **決策**：在 `main.py` 新增一個接收 `bdd_text` 參數的 POST 接口，直接調用 Gemini 進行評估並回傳 JSON。
- **理由**：現有的 `/api/admin/records/{id}/audit` 強依賴資料庫紀錄 ID。對於新產生的 BDD，直接傳送文字評估可以減少資料庫操作，且符合「不收集資料」的需求。

### 更新前端 BDD 診斷流程

- **決策**：修改 `bdd.js` 的 `auditQuality` 方法，使其接受 `bddText` 或 `recordId`。如果是剛產出的 BDD，優先使用 `bddText` 調用新接口。
- **理由**：讓使用者在產出 BDD 後能立即看到評分，無需等待資料庫同步。

## Risks / Trade-offs

- **[風險] API 濫用** → **[緩解]** 在託管平台（如 Render）設定基本限流。
- **[權衡] 無持久化儲存** → **[緩解]** 診斷結果仍會顯示在前端 UI 中供使用者複製。
