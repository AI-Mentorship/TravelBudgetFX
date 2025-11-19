from pydantic import BaseModel, UUID4
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

class TravelBudgetBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    base_currency: str
    target_currencies: List[str]
    
class TravelBudgetCreate(TravelBudgetBase):
    pass

class TravelBudget(TravelBudgetBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime
    estimated_total: Decimal
    actual_total: Optional[Decimal]

class ExpenseBase(BaseModel):
    amount: Decimal
    currency: str
    category: str
    description: Optional[str] = None
    date: datetime

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: UUID4
    budget_id: UUID4
    created_at: datetime
    updated_at: datetime
    converted_amount: Decimal  # Amount in base currency