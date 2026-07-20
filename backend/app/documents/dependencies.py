from fastapi import Depends, HTTPException
from uuid import UUID
from app.services.auth import get_current_user
from .service import document_service

def get_document_service():
    return document_service
