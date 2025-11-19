from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    # API Settings
    ENVIRONMENT: str
    DEBUG: bool
    API_V1_PREFIX: str
    
    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    
    # External API Keys
    OPEN_EXCHANGE_RATES_API_KEY: str = ""
    SKYSCANNER_API_KEY: str = ""
    BOOKING_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # CORS Settings
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    
    @property
    def get_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',')]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()