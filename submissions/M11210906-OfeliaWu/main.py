import os
import uuid
import json
from typing import List

from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import prompts
from database import engine, get_db

load_dotenv()
# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BDD AI Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# API endpoint for generating BDD
@app.post("/api/generate-bdd")
async def generate_bdd(
    files: List[UploadFile] = File(default=[]),
    language: str = Form(...),
    db: Session = Depends(get_db)
):
    session_id = str(uuid.uuid4())
    saved_files_metadata = []
    gemini_contents = []
    
    # Prepend System Prompt
    user_prompt = prompts.BDD_SYSTEM_PROMPT + f"\n\nPlease generate BDD scenarios for the attached materials. Requested Language: {'English' if language == 'en' else 'Traditional Chinese'}."
    gemini_contents.append(user_prompt)
    
    # Save and parse uploaded files
    for file in files:
        if not file.filename:
            continue
            
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
            
        saved_files_metadata.append({
            "original_name": file.filename,
            "saved_path": file_path,
            "content_type": file.content_type
        })
        
        # Process for Gemini
        if file.content_type.startswith('image/'):
            img = Image.open(io.BytesIO(content))
            gemini_contents.append(img)
        elif file.content_type == 'application/pdf':
            uploaded_file = genai.upload_file(path=file_path)
            gemini_contents.append(uploaded_file)
        elif file.content_type.startswith('text/') or file.content_type == 'text/csv':
            gemini_contents.append(content.decode('utf-8', errors='ignore'))
        else:
            gemini_contents.append(f"File attachment: {file.filename}")
        
    status = "success"
    error_message = None
    
    try:
        response = model.generate_content(gemini_contents)
        bdd_output = response.text.strip()
        # Remove markdown codeblocks if AI accidentally included them
        if bdd_output.startswith("```"):
            lines = bdd_output.split('\n')
            if len(lines) >= 2:
                bdd_output = '\n'.join(lines[1:-1])
    except Exception as e:
        import re
        error_str = str(e)
        print(f"Gemini API Error: {error_str}")
        error_message = error_str
        
        # Check for rate limit (429) errors
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            status = "rate_limited"
            # Try to extract seconds from error message like "retry after 27s"
            match = re.search(r'retry after (\d+)', error_str, re.IGNORECASE)
            retry_seconds = int(match.group(1)) if match else 30
            
            # Save the rate limited record before returning
            db_record = models.GenerationRecord(
                session_id=session_id,
                language=language,
                bdd_output="",
                uploaded_files=json.dumps(saved_files_metadata, ensure_ascii=False),
                status=status,
                error_message=error_message
            )
            db.add(db_record)
            db.commit()
            
            return {
                "status": "rate_limited",
                "retry_after": retry_seconds,
                "bdd": ""
            }
        
        status = "error"
        bdd_output = "系統忙碌中或 AI 服務暫時無法連線，請稍後再試。"
        
    # Save record to database
    db_record = models.GenerationRecord(
        session_id=session_id,
        language=language,
        bdd_output=bdd_output if status == "success" else "",
        uploaded_files=json.dumps(saved_files_metadata, ensure_ascii=False),
        status=status,
        error_message=error_message
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    return {"status": status, "session_id": session_id, "bdd": bdd_output, "record_id": db_record.id}

@app.get("/api/admin/records")
def get_admin_records(include_hidden: bool = False, sort_by_pin: bool = True, db: Session = Depends(get_db)):
    query = db.query(models.GenerationRecord)
    if not include_hidden:
        query = query.filter(models.GenerationRecord.is_hidden == False)
    
    # Sorting logic
    if sort_by_pin:
        records = query.order_by(models.GenerationRecord.is_pinned.desc(), models.GenerationRecord.created_at.desc()).all()
    else:
        records = query.order_by(models.GenerationRecord.created_at.desc()).all()
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "session_id": r.session_id,
            "created_at": r.created_at.isoformat() + "Z",
            "language": r.language,
            "files": json.loads(r.uploaded_files) if r.uploaded_files else [],
            "bdd_snippet": r.bdd_output[:100] + "..." if r.bdd_output else "",
            "bdd_full": r.bdd_output or "",
            "status": r.status,
            "error_message": r.error_message,
            "is_hidden": r.is_hidden,
            "is_pinned": r.is_pinned,
            "audit_report": r.audit_report
        })
    return {"records": result}

@app.delete("/api/admin/records/{record_id}")
def hide_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.GenerationRecord).filter(models.GenerationRecord.id == record_id).first()
    if not record:
        return {"status": "error", "message": "Record not found"}, 404
    
    # Soft delete: just hide it from the user
    record.is_hidden = True
    db.commit()
    return {"status": "success", "message": "Record hidden"}

@app.delete("/api/admin/records")
def hide_all_records(db: Session = Depends(get_db)):
    # Soft delete all
    db.query(models.GenerationRecord).update({models.GenerationRecord.is_hidden: True})
    db.commit()
    return {"status": "success", "message": "All records hidden"}


@app.post("/api/audit-stateless")
async def audit_stateless(data: dict):
    bdd_text = data.get("bdd_text")
    if not bdd_text:
        return {"status": "error", "message": "No BDD content to audit"}

    try:
        # Call AI for audit
        model_audit = genai.GenerativeModel('gemini-3.1-flash-lite-preview')
        audit_prompt = f"{prompts.BDD_AUDIT_PROMPT}\n\n待審核內容：\n{bdd_text}"
        
        response = model_audit.generate_content(audit_prompt)
        audit_json_str = response.text
        
        if "```json" in audit_json_str:
            audit_json_str = audit_json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in audit_json_str:
            audit_json_str = audit_json_str.split("```")[1].split("```")[0].strip()
            
        return {"status": "success", "report": json.loads(audit_json_str)}
    except Exception as e:
        print(f"Stateless audit error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/admin/records/{record_id}/audit")
async def audit_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.GenerationRecord).filter(models.GenerationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    if not record.bdd_output:
        return {"status": "error", "message": "No BDD content to audit"}

    try:
        # Call AI for audit
        model = genai.GenerativeModel('gemini-3.1-flash-lite-preview')
        audit_prompt = f"{prompts.BDD_AUDIT_PROMPT}\n\n待審核內容：\n{record.bdd_output}"
        
        response = model.generate_content(audit_prompt)
        audit_json_str = response.text
        
        # Clean up JSON if AI wrapped it in markdown code blocks
        if "```json" in audit_json_str:
            audit_json_str = audit_json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in audit_json_str:
            audit_json_str = audit_json_str.split("```")[1].split("```")[0].strip()
            
        # Validate JSON
        json.loads(audit_json_str) 
        
        # Save to DB
        record.audit_report = audit_json_str
        db.commit()
        
        return {"status": "success", "report": json.loads(audit_json_str)}
    except Exception as e:
        print(f"Audit error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/api/admin/records/{record_id}/pin")
async def toggle_pin(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.GenerationRecord).filter(models.GenerationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    record.is_pinned = not record.is_pinned
    db.commit()
    return {"status": "success", "is_pinned": record.is_pinned}

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve admin page
@app.get("/admin")
def get_admin_page():
    from fastapi.responses import FileResponse
    admin_path = os.path.join(os.path.dirname(__file__), "frontend/public/admin.html")
    return FileResponse(admin_path)

# This serves the index.html at the root URL
static_path = os.path.join(os.path.dirname(__file__), "frontend/dist")
app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable if available (for Render/Heroku)
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
