from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Settings
    ENVIRONMENT: str
    DEBUG: bool
    API_V1_PREFIX: str
    
    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # External API Keys
    OPEN_EXCHANGE_RATES_API_KEY: str
    SKYSCANNER_API_KEY: str
    BOOKING_API_KEY: str
    GOOGLE_AI_API_KEY: str
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()