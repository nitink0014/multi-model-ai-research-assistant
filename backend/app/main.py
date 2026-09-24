from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Depends
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.pdf_service import extract_text_from_pdf
from app.utils.chunking import chunk_text
from app.services.document_service import (
    add_document,
    get_documents,
    clear_document
)
from app.services.chat_service import (
    chat_with_ai,
    clear_history,
    get_all_sessions,
    get_session_messages
)

from io import BytesIO
from app.services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
    verify_access_token
)
import os
app = FastAPI()
security = HTTPBearer()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    question: str
    context: str = ""


class ClearChatRequest(BaseModel):
    session_id: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    user = verify_access_token(token)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return user


@app.get("/")
def home():
    return {
        "message": "Multi-Model AI Research Assistant API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/auth/signup")
def signup(request: SignupRequest):

    if len(request.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

    user = create_user(
        request.name,
        request.email,
        request.password
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    return {
        "message": "Account created successfully",
        "user": user
    }

@app.post("/auth/login")
def login(request: LoginRequest):

    user = authenticate_user(
        request.email,
        request.password
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user)

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/upload")
async def upload_pdf(
    session_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    content = await file.read()

    file_size = len(content)

    pdf_file = BytesIO(content)

    text = extract_text_from_pdf(
        pdf_file
    )

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from PDF"
        )

    chunks = chunk_text(
        text,
        chunk_size=1000,
        overlap=200
    )

    add_document(
        user_id,
        session_id,
        file.filename,
        chunks
    )

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size": file_size,
        "text_length": len(text),
        "chunk_count": len(chunks),
        "message": "PDF uploaded and indexed successfully"
    }
@app.get("/documents")
def get_user_documents(
    session_id: str,
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    return {
        "session_id": session_id,
        "documents": get_documents(
            user_id,
            session_id
        )
    }

@app.delete("/documents/{filename}")
def delete_document(
    filename: str,
    session_id: str,
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    clear_document(
        user_id,
        session_id,
        filename
    )

    return {
        "message": "Document deleted successfully",
        "filename": filename
    }

@app.post("/chat")
def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    result = chat_with_ai(
        user_id,
        request.session_id,
        request.question,
        request.context
    )

    return result

@app.post("/chat/clear")
def clear_chat(
    request: ClearChatRequest,
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    clear_history(
        user_id,
        request.session_id
    )

    return {
        "message": "Chat history cleared successfully"
    }

@app.get("/sessions")
def get_sessions(
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    return {
        "sessions": get_all_sessions(
            user_id
        )
    }

@app.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    current_user=Depends(get_current_user)
):

    user_id = current_user["user_id"]

    return {
        "session_id": session_id,
        "messages": get_session_messages(
            user_id,
            session_id
        )
    }