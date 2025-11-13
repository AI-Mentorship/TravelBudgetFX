from fastapi import APIRouter, Depends, HTTPException, status
from app.core.supabase import get_supabase
from app.models.schemas import UserCreate, User
from typing import Dict

router = APIRouter()

@router.post("/signup", response_model=Dict[str, str])
async def signup(user: UserCreate):
    try:
        supabase = get_supabase()
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        return {"message": "User created successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not configured"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Dict[str, str])
async def login(user: UserCreate):
    try:
        supabase = get_supabase()
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        return {
            "access_token": auth_response.session.access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not configured"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )