from fastapi import APIRouter, Depends, HTTPException, status
from app.core.supabase import supabase
from app.models.schemas import TravelBudgetCreate, TravelBudget
from typing import List
import uuid

router = APIRouter()

@router.post("/", response_model=TravelBudget)
async def create_budget(budget: TravelBudgetCreate, user_id: str):
    try:
        data = {
            **budget.model_dump(),
            "id": str(uuid.uuid4()),
            "user_id": user_id,
        }
        result = supabase.table("travel_budgets").insert(data).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[TravelBudget])
async def get_user_budgets(user_id: str):
    try:
        result = supabase.table("travel_budgets").select("*").eq("user_id", user_id).execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{budget_id}", response_model=TravelBudget)
async def get_budget(budget_id: str):
    try:
        result = supabase.table("travel_budgets").select("*").eq("id", budget_id).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )