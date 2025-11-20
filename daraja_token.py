import base64
import requests

# Your Daraja keys
key = "TI2BPsefU2TZrA0uCrjOJgegKoleAwERJKM2svnRfzllyD8t"
secret = "Qrdn6LmWyOlz23mvDNCOkfOemWGtm1CnLThvdQIhNHDjORNmAxBeckhZFmVLvO8F"

# Encode credentials
credentials = f"{key}:{secret}"
encoded = base64.b64encode(credentials.encode()).decode()

# Headers
headers = {
    "Authorization": f"Basic {encoded}",
    "Content-Type": "application/json"
}

# Token URL
url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

# Make request
response = requests.get(url, headers=headers)

# Print response
print("Status code:", response.status_code)
print("Body:", response.text)
