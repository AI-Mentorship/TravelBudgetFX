from fastapi import APIRouter

api_router = APIRouter()

# Import and include other routers
from app.api.v1 import auth, budgets, currencies, forecasts, chat

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(currencies.router, prefix="/currencies", tags=["Currencies"])
api_router.include_router(forecasts.router, prefix="/forecasts", tags=["Forecasts"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chat"])