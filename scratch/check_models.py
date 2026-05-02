import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("錯誤: 找不到 GEMINI_API_KEY，請確認 .env 檔案內容。")
else:
    try:
        genai.configure(api_key=api_key)
        print(f"正在查詢 API Key ({api_key[:8]}...) 支援的模型...\n")
        
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"模型名稱: {m.name}")
                print(f"顯示名稱: {m.display_name}")
                print("-" * 30)
                
    except Exception as e:
        print(f"發生錯誤: {e}")
