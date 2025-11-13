from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Optional
import google.generativeai as genai
from app.core.config import settings
from pydantic import BaseModel

class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # "user" or "assistant"

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []

router = APIRouter()

# Configure Gemini
try:
    genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
    # Try gemini-1.5-flash first (faster), fallback to gemini-pro if not available
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
    except:
        model = genai.GenerativeModel('gemini-pro')
except Exception as e:
    print(f"Warning: Failed to configure Gemini: {e}")
    model = None

@router.post("")
async def chat_with_ai(request: ChatRequest) -> Dict[str, str]:
    if not model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API not configured. Please check GOOGLE_AI_API_KEY in environment variables."
        )
    
    try:
        # Create prompt with travel context
        base_prompt = """You are a helpful AI travel assistant for TravelBudgetFX. 
        You help users with:
        - Travel budgeting advice
        - Currency exchange insights
        - Cost-saving tips for different destinations
        - Local price level information
        - Best times to exchange money
        - Travel planning and recommendations
        Please provide concise, practical advice focused on the financial aspects of travel. 
        Be friendly, helpful, and conversational."""

        # Build conversation history
        chat_history = []
        for msg in request.chat_history or []:
            if msg.role == "user":
                chat_history.append({"role": "user", "parts": [msg.content]})
            elif msg.role == "assistant":
                chat_history.append({"role": "model", "parts": [msg.content]})

        # Start chat with history
        chat = model.start_chat(history=chat_history)
        
        # Send message with base prompt context
        full_message = f"{base_prompt}\n\nUser: {request.message}"
        response = chat.send_message(full_message)

        return {
            "response": response.text,
            "role": "assistant"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error communicating with Gemini API: {str(e)}"
        )