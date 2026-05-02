# BDD AI Generator (Lavender Theme)

這是一個基於 AI 的行為驅動開發 (BDD) 規格生成工具，採用優雅的 Lavender 線性風格設計。支援從圖片、文件與影片素材自動產出高品質的 Gherkin 規格，並提供專業的品質診斷分析。

## 核心功能
- **AI 規格生成**：支援多種素材格式 (PDF, PNG, JPG, TXT, MP4)。
- **專業品質診斷**：基於 1-5 分 Likert 量表的專家級 BDD 品質評估。
- **線性風格設計**：深色模式優化，高對比薰衣草紫視覺系統。
- **版本管理**：支援歷史版本預覽與對照分析。

## 介面預覽
![BDD AI Generator 介面預覽](screenshot.png)

## 快速開始

### 本地開發
1. 安裝 Python 依賴：
   ```bash
   pip install -r requirements.txt
   ```
2. 設定環境變數：建立 `.env` 檔案並填入您的 Google API Key：
   ```
   GEMINI_API_KEY=您的金鑰
   ```
3. 啟動後端伺服器：
   ```bash
   python main.py
   ```
4. 訪問 `http://localhost:8000` 即可開始使用。

### 部署指南 (推薦使用 Render)
1. 將此專案推送到您的 GitHub 倉庫。
2. 在 **Render.com** 建立一個新的 **Web Service**。
3. 連結您的 GitHub 倉庫。
4. 在 **Environment** 設定中，新增一個環境變數：
   - Key: `GEMINI_API_KEY`
   - Value: (您的 Google AI Studio API Key)
5. 設定啟動指令：`python main.py`。

## 安全與隱私
- **無持久化儲存**：在免費託管平台上，重啟後資料庫會自動重置，保護測試資料不外流。
- **敏感資訊保護**：`.env` 與 `.db` 已包含在 `.gitignore` 中，確保 API Key 安全。

## 授權
MIT License
