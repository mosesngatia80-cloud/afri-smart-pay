/**
 * Calculate withdrawal fee
 * @param {number} amount
 * @returns {number}
 */
function calculateWithdrawFee(amount) {
  if (amount <= 0) return 0;

  // Example rule: flat 10 KES
  return 10;
}

module.exports = { calculateWithdrawFee };
