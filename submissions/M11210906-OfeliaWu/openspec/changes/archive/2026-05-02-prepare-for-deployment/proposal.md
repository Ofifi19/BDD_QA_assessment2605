## Why

目前專案已完成核心功能開發，需要推送到 GitHub 以供展示與交作業使用。為了確保資安、控制成本並提供穩定的公開存取，必須移除敏感資訊、建立部署規範，並提供不依賴資料庫 ID 的「直接品質診斷」功能。

## What Changes

- **安全性增強**：新增 `.gitignore` 以防止 `.env` (API Keys)、`bdd_generator.db` (資料庫) 與 `uploads/` (使用者上傳素材) 被推送到公開倉庫。
- **API 擴充**：新增 `/api/audit-stateless` 接口，允許前端直接傳送 BDD 文字進行診斷，而非透過資料庫紀錄 ID。
- **前端適配**：調整前端 `bdd.js` 與 `app.js`，在產出 BDD 後立即使用新接口進行診斷，確保流程即時性。
- **部署規範**：新增 `README.md`，提供詳細的部署指南。

## Capabilities

### New Capabilities

- `stateless-audit`: 提供無需資料庫 ID 的 BDD 規格品質診斷能力。
- `deployment-config`: 提供專案部署所需的環境配置與安全規範。

### Modified Capabilities

(none)

## Impact

- 影響程式碼：
  - 新增: `.gitignore`, `README.md`
  - 修改: `main.py`, `frontend/src/js/bdd.js`, `frontend/src/js/app.js`
