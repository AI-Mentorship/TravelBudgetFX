from fastapi import APIRouter, Depends, HTTPException, status
from app.core.supabase import get_supabase
from app.models.schemas import TravelBudgetCreate, TravelBudget
from typing import List
import uuid

router = APIRouter()

@router.post("/", response_model=TravelBudget)
async def create_budget(budget: TravelBudgetCreate, user_id: str):
    try:
        supabase = get_supabase()
        data = {
            **budget.model_dump(),
            "id": str(uuid.uuid4()),
            "user_id": user_id,
        }
        result = supabase.table("travel_budgets").insert(data).execute()
        return result.data[0]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not configured"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[TravelBudget])
async def get_user_budgets(user_id: str):
    try:
        supabase = get_supabase()
        result = supabase.table("travel_budgets").select("*").eq("user_id", user_id).execute()
        return result.data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not configured"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{budget_id}", response_model=TravelBudget)
async def get_budget(budget_id: str):
    try:
        supabase = get_supabase()
        result = supabase.table("travel_budgets").select("*").eq("id", budget_id).single().execute()
        return result.data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not configured"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )