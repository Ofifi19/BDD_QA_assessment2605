from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
import datetime
from database import Base

class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    language = Column(String, default="zh-TW")
    bdd_output = Column(Text, nullable=True)
    uploaded_files = Column(Text, nullable=True) # Will store JSON string of file paths
    status = Column(String, default="success") # success, error, rate_limited
    error_message = Column(Text, nullable=True)
    is_hidden = Column(Boolean, default=False) # For soft delete on user frontend
    is_pinned = Column(Boolean, default=False) # New: For pinning to top
    audit_report = Column(Text, nullable=True) # Stores JSON quality report
