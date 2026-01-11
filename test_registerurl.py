import os
import requests

access_token = os.getenv("ACCESS_TOKEN")

url = "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl"

payload = {
    "ShortCode": "3023415",
    "ResponseType": "Completed",
    "ConfirmationURL": "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
    "ValidationURL": "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
}

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print("STATUS:", response.status_code)
print("BODY:", response.text)
