from pydantic import BaseModel
from typing import Optional

class MachineSet(BaseModel):
    type: str
    article_no: str
    serial_no: str
    power: str

class MachineSetUpdate(BaseModel):
    type: Optional[str] = None
    article_no: Optional[str] = None
    serial_no: Optional[str] = None
    power: Optional[str] = None
