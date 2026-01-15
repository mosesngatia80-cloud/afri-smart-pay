from fastapi import FastAPI
from pydantic import BaseModel
import re

app = FastAPI()

class Message(BaseModel):
    text: str

@app.post("/intent")
def parse_intent(msg: Message):
    text = msg.text.lower()

    if "balance" in text:
        return {"intent": "CHECK_BALANCE"}

    match = re.search(r"(send|withdraw)\s+(\d+)", text)
    if match:
        amount = int(match.group(2))
        phone_match = re.search(r"(07\d{8}|2547\d{8})", text)
        return {
            "intent": "SEND_MONEY" if "send" in text else "WITHDRAW",
            "amount": amount,
            "phone": phone_match.group(0) if phone_match else None,
            "confidence": 0.9
        }

    return {"intent": "UNKNOWN"}
