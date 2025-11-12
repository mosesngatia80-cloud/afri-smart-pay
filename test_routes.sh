#!/bin/bash
# Afri Smart Pay API Test Script

BASE_URL="http://localhost:3000/api"

echo "🚀 Testing Afri Smart Pay Routes..."

# 1️⃣ Create Wallet A
echo "Creating Wallet A..."
RESP_A=$(curl -s -X POST $BASE_URL/create-wallet)
echo "Response A: $RESP_A"
WALLET_A=$(echo $RESP_A | grep -o '"walletId":"[^"]*' | cut -d'"' -f4)

# 2️⃣ Create Wallet B
echo "Creating Wallet B..."
RESP_B=$(curl -s -X POST $BASE_URL/create-wallet)
echo "Response B: $RESP_B"
WALLET_B=$(echo $RESP_B | grep -o '"walletId":"[^"]*' | cut -d'"' -f4)

# 3️⃣ Top Up Wallet A
echo "Topping up Wallet A with 5000..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"walletId\":\"$WALLET_A\",\"amount\":5000}" \
$BASE_URL/top-up

# 4️⃣ Check Balance for Wallet A
echo "Checking balance for Wallet A..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"walletId\":\"$WALLET_A\"}" \
$BASE_URL/check-balance

# 5️⃣ Transfer 2000 from A → B
echo "Sending 2000 from Wallet A to Wallet B..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"fromWalletId\":\"$WALLET_A\",\"toWalletId\":\"$WALLET_B\",\"amount\":2000}" \
$BASE_URL/send-money

# 6️⃣ Final Balances
echo "Checking final balances..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"walletId\":\"$WALLET_A\"}" \
$BASE_URL/check-balance
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"walletId\":\"$WALLET_B\"}" \
$BASE_URL/check-balance

echo "✅ All routes tested successfully!"
#!/bin/bash
echo "🚀 Testing Afri Smart Pay API routes..."

# 1️⃣ Create two wallets
echo "Creating Wallet A..."
walletA=$(curl -s -X POST http://localhost:3000/api/create-wallet | jq -r '.walletId')
echo "Wallet A: $walletA"

echo "Creating Wallet B..."
walletB=$(curl -s -X POST http://localhost:3000/api/create-wallet | jq -r '.walletId')
echo "Wallet B: $walletB"

# 2️⃣ Top up wallet A
echo "Topping up Wallet A with 5000..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"walletId\":\"$walletA\",\"amount\":5000}" \
http://localhost:3000/api/top-up

# 3️⃣ Check balance of wallet A
echo "Checking balance of Wallet A..."
curl -s http://localhost:3000/api/check-balance/$walletA
echo

# 4️⃣ Send 2000 from A → B
echo "Sending 2000 from Wallet A to B..."
curl -s -X POST -H "Content-Type: application/json" \
-d "{\"fromWalletId\":\"$walletA\",\"toWalletId\":\"$walletB\",\"amount\":2000}" \
http://localhost:3000/api/send-money
echo

# 5️⃣ Final balances
echo "Final balances:"
echo "Wallet A:"
curl -s http://localhost:3000/api/check-balance/$walletA
echo
echo "Wallet B:"
curl -s http://localhost:3000/api/check-balance/$walletB
echo

echo "✅ Test sequence complete!"
