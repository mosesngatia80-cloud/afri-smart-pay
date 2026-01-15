const mongoose = require("mongoose");

async function writeLedger(entry) {
  await mongoose.connection.collection("transactions_ledger").insertOne({
    ...entry,
    createdAt: new Date()
  });
}

module.exports = { writeLedger };
