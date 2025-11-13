# Supabase client setup
from supabase import create_client, Client
from app.core.config import settings
from typing import Optional

supabase: Optional[Client] = None

def get_supabase() -> Client:
    """Lazy initialization of Supabase client"""
    global supabase
    if supabase is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase credentials not configured")
        supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    return supabase