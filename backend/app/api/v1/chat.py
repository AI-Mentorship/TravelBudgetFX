from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Optional
import google.generativeai as genai
from app.core.config import settings
from pydantic import BaseModel
import os

class ChatMessage(BaseModel):
    content: str
    role: str = "user"  # "user" or "assistant"

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []

router = APIRouter()

#  GLOBAL STATE FOR FLOW
travel_state = {
    "stage": 0,   # which question we are on
    "destination": None,
    "budget": None,
    "dates": None,
    "duration": None,
    "itinerary_generated": False
}

# SYSTEM INSTRUCTION
SYSTEM_INSTRUCTION = """You are a helpful AI travel assistant for TravelBudgetFX. 
You help users with:
- Travel budgeting advice
- Creating detailed day-by-day itineraries
- Currency exchange insights
- Cost-saving tips for different destinations
- Local price level information
- Best times to exchange money
- Travel planning and recommendations

When generating an itinerary:
1. Create a structured day-by-day plan
2. Include specific activities, timings, and locations
3. Provide estimated costs for each activity
4. Consider the user's budget constraints
5. Factor in meal times, rest periods, and travel time between locations
6. Include budget-friendly alternatives
7. Add local tips and money-saving advice

After generating the itinerary, ALWAYS ask:
"Would you like me to export this itinerary as a PDF?"
"""

model = None

def get_model():
    """Get or initialize the Gemini model"""
    global model
    
    api_key = (
        settings.GOOGLE_AI_API_KEY 
        or settings.GEMINI_API_KEY 
        or os.getenv("GOOGLE_AI_API_KEY") 
        or os.getenv("GEMINI_API_KEY")
    )
    
    if not api_key:
        raise ValueError("Gemini API key missing!")

    try:
        genai.configure(api_key=api_key)
    except:
        raise ValueError("Gemini configuration failed.")

    if model is None:
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=SYSTEM_INSTRUCTION
        )

    return model


#  FLOW MANAGER
# --------------------                    
def process_flow(user_msg: str):
    global travel_state
    stage = travel_state["stage"]

    # ---------------------------
    # STAGE 0 : Ask Destination
    # ---------------------------
    if stage == 0:
        travel_state["stage"] = 1
        return "Great! Where are you planning to travel?"

    # ---------------------------
    # STAGE 1 : Store Destination to\
    Ask Budget
    # ---------------------------
    if stage == 1:
        travel_state["destination"] = user_msg
        travel_state["stage"] = 2
        return "Nice choice! What's your total budget for the trip?"

    # ---------------------------
    # STAGE 2 : Store Budget to Ask Dates
    # ---------------------------
    if stage == 2:
        travel_state["budget"] = user_msg
        travel_state["stage"] = 3
        return "Got it! What are your travel dates?"

    # ---------------------------
    # STAGE 3 : Store Dates to Ask Duration
    # ---------------------------
    if stage == 3:
        travel_state["dates"] = user_msg
        travel_state["stage"] = 4
        return "Great! How many days will you be staying?"

    # ---------------------------
    #STAGE 4 : Store Duration to Generate Itinerary
    # ---------------------------
    if stage == 4:
        travel_state["duration"] = user_msg
        travel_state["stage"] = 5
        travel_state["itinerary_generated"] = True

        # Trigger itinerary creation
        return "Perfect! Generating your day-by-day itinerary now..."

    # ---------------------------
    # STAGE 5:  Ask for PDF (AUTOMATICALLY)
    # ---------------------------
    if stage == 5 and travel_state["itinerary_generated"]:
        travel_state["stage"] = 6
        return "Would you like me to export the itinerary as a PDF? (yes/no)"

    # ---------------------------
    # STAGE 6: User responds about PDF
    # ---------------------------
    if stage == 6:
        if user_msg.lower() in ["yes", "y"]:
            travel_state["stage"] = 7
            return "Great! Generating your PDF now..."
        else:
            travel_state["stage"] = 0
            return "No problem! Let me know if you need anything else."

    return None


# ----------------------------------------
#    MAIN ROUTE
# ----------------------------------------
@router.post("")
async def chat_with_ai(request: ChatRequest) -> Dict[str, str]:
    """Chat with the AI assistant using Gemini"""

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    try:
        gemini_model = get_model()

        # Ask flow manager first
        flow_reply = process_flow(request.message)
        if flow_reply:
            return {"response": flow_reply, "role": "assistant"}

        # Build chat history
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
