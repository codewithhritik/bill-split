from pydantic import BaseModel
from typing import List, Optional

class BillItem(BaseModel):
    name: str
    price: float
    quantity: Optional[int] = 1

class ProcessedBill(BaseModel):
    items: List[BillItem]
    subtotal: float
    tax: Optional[float] = 0
    service_charge: Optional[float] = 0
    total: float
    restaurant_name: Optional[str] = None
    date: Optional[str] = None
    confidence_score: float  # Indicates how confident we are in the extraction (0-1)
