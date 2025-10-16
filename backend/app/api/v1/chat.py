from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
import google.generativeai as genai
from app.core.config import settings
from pydantic import BaseModel

class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # "user" or "assistant"

class ChatRequest(BaseModel):
    message: str
    chat_history: List[ChatMessage] = []

router = APIRouter()

# Configure Gemini
genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
model = genai.GenerativeModel('gemini-pro')

@router.post("/chat")
async def chat_with_ai(request: ChatRequest) -> Dict[str, str]:
    try:
        # Create prompt with travel context
        base_prompt = """You are a helpful AI travel assistant for TravelBudgetFX. 
        You help users with:
        - Travel budgeting advice
        - Currency exchange insights
        - Cost-saving tips for different destinations
        - Local price level information
        - Best times to exchange money
        Please provide concise, practical advice focused on the financial aspects of travel."""

        # Format chat history for context
        conversation = [base_prompt]
        for msg in request.chat_history:
            conversation.append(f"{msg.role}: {msg.content}")
        conversation.append(f"user: {request.message}")

        # Get response from Gemini
        chat = model.start_chat(history=[])
        response = chat.send_message("\n".join(conversation))

        return {
            "response": response.text,
            "role": "assistant"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )