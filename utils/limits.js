const mongoose = require("mongoose");

const MAX_WITHDRAW_PER_TX = 50000;
const MAX_WITHDRAW_PER_DAY = 100000;

async function getTodayWithdrawTotal(phone) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const res = await mongoose.connection
    .collection("transactions_ledger")
    .aggregate([
      {
        $match: {
          owner: phone,
          type: "WITHDRAW",
          createdAt: { $gte: since }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
    .toArray();

  return res[0]?.total || 0;
}

module.exports = {
  MAX_WITHDRAW_PER_TX,
  MAX_WITHDRAW_PER_DAY,
  getTodayWithdrawTotal
};
