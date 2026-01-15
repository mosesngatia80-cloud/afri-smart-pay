/**
 * Withdrawal fee rules aligned with Safaricom M-PESA B2C tariffs
 * Covers B2C charge + withdrawal charge + small platform margin
 */

const MPESA_WITHDRAW_TARIFFS = [
  { max: 100, fee: 34 },
  { max: 500, fee: 34 },
  { max: 1000, fee: 34 },
  { max: 2500, fee: 38 },
  { max: 5000, fee: 78 },
  { max: 7500, fee: 98 },
  { max: 10000, fee: 124 },
  { max: 15000, fee: 178 },
  { max: 20000, fee: 194 },
  { max: 30000, fee: 210 },
  { max: 40000, fee: 291 },
  { max: 70000, fee: 322 }
];

// Platform margin (KES)
const PLATFORM_MARGIN = 10;

/**
 * Calculate withdrawal fee
 * @param {number} amount - withdrawal amount
 * @param {string} walletType - USER | BUSINESS | VIP
 */
function calculateWithdrawFee(amount, walletType = "USER") {
  // VIP wallets get free withdrawals (you absorb cost)
  if (walletType === "VIP") return 0;

  const band = MPESA_WITHDRAW_TARIFFS.find(b => amount <= b.max);

  if (!band) {
    throw new Error("Withdrawal amount exceeds supported limit");
  }

  return band.fee + PLATFORM_MARGIN;
}

module.exports = {
  MPESA_WITHDRAW_TARIFFS,
  PLATFORM_MARGIN,
  calculateWithdrawFee
};
