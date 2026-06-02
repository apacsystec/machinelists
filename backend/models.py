from pydantic import BaseModel
from typing import Optional

class MachineIn(BaseModel):
    machine_type: str

class PartIn(BaseModel):
    type: str
    article_no: str
    serial_no: str
    power: str

class PartUpdate(BaseModel):
    type: Optional[str] = None
    article_no: Optional[str] = None
    serial_no: Optional[str] = None
    power: Optional[str] = None
