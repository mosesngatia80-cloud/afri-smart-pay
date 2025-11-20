import base64
import requests

key = "xLGw2tp67gCMCCNTvfx1r40jtytsshKP7pyCnoDWtJ0dLnyJ7"
secret = "Lmm4L0We1E89T0QCjh6Enx2Eya3VCP3FL5HPG41RQCWwt7vSNJ8g5Lt1U3kJR"

credentials = f"{key}:{secret}"
encoded = base64.b64encode(credentials.encode()).decode()

headers = {
    "Authorization": f"Basic {encoded}"
}

url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

print("Sending request to Daraja...\n")

try:
    r = requests.get(url, headers=headers, timeout=15)
    print("Status code:", r.status_code)
    print("Response headers:", r.headers)
    print("Response body:", r.text)
except Exception as e:
    print("ERROR:", repr(e))
