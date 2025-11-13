from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Settings
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    
    # External API Keys
    OPEN_EXCHANGE_RATES_API_KEY: str = ""
    SKYSCANNER_API_KEY: str = ""
    BOOKING_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()