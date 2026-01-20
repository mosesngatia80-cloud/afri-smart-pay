/**
 * Check withdrawal limits
 * @param {object} wallet
 * @param {number} amount
 * @returns {boolean}
 */
function checkWithdrawLimits(wallet, amount) {
  if (!wallet) return false;

  // Example rules
  const DAILY_LIMIT = 50000;
  const MIN_WITHDRAW = 10;

  if (amount < MIN_WITHDRAW) return false;
  if (amount > DAILY_LIMIT) return false;

  return true;
}

module.exports = { checkWithdrawLimits };
