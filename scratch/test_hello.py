import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

print(f"測試金鑰: {os.getenv('GEMINI_API_KEY')[:10]}...")
print(f"測試模型: gemini-2.5-flash")

try:
    response = model.generate_content("Say hello in one word.")
    print(f"測試成功！AI 回覆: {response.text}")
except Exception as e:
    print(f"\n❌ 測試失敗！錯誤訊息原文如下：\n")
    print(str(e))
