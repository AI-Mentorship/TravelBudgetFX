from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Optional
import google.generativeai as genai
from app.core.config import settings
from pydantic import BaseModel
import os

class ChatMessage(BaseModel):
    content: str
    role: str = "user"

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []
    
    # Trip data coming from frontend
    destination: Optional[str] = None
    budget: Optional[str] = None
    dates: Optional[str] = None
    duration: Optional[str] = None

router = APIRouter()

SYSTEM_INSTRUCTION = """You are a helpful AI travel assistant for TravelBudgetFX.

When the user sends trip details (destination, budget, dates, duration),
you must generate a complete day-by-day itinerary with pricing, activities,
local tips, total approximate cost, and budget breakdown.

AFTER generating the itinerary:
Always ask the user:
"Would you like me to export this itinerary as a PDF?"
"""

model = None

def get_model():
    global model

    api_key = (
        settings.GOOGLE_AI_API_KEY
        or settings.GEMINI_API_KEY
        or os.getenv("GOOGLE_AI_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )

    if not api_key:
        raise ValueError("Gemini API key missing!")

    genai.configure(api_key=api_key)

    if model is None:
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=SYSTEM_INSTRUCTION
        )

    return model


@router.post("")
async def chat_with_ai(request: ChatRequest) -> Dict[str, str]:

    # If frontend sent trip data, skip ALL questions
    if request.destination and request.budget and request.dates and request.duration:
        gemini_model = get_model()

        itinerary_prompt = f"""
        Create a **complete day-by-day itinerary** for this trip:
        
        Destination: {request.destination}
        Budget: {request.budget}
        Travel Dates: {request.dates}
        Duration: {request.duration} days

        Include:
        - Morning, afternoon, evening activities
        - Food spots + cost
        - Travel logistics
        - Entry fees / ticket prices
        - Local tips
        - Money-saving options
        - Total approximate cost summary
        
        After generating the itinerary, ask:
        "Would you like me to export this itinerary as a PDF?"
        """

        response = gemini_model.generate_content(itinerary_prompt)

        return {
            "response": response.text,
            "role": "assistant"
        }

    # Otherwise fallback to normal chat
    try:
        gemini_model = get_model()
        
        chat_history = []
        if request.chat_history:
            for msg in request.chat_history:
                chat_history.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [msg.content]
                })

        chat = gemini_model.start_chat(history=chat_history)
        response = chat.send_message(request.message)

        return {
            "response": response.text,
            "role": "assistant"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )
