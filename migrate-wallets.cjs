require("dotenv").config();

const mongoose = require("mongoose");

/**
 * Wallet migration:
 * - Move `owner` -> `phone`
 * - Remove `owner`
 */
async function migrate() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Wallet = mongoose.model(
      "Wallet",
      new mongoose.Schema({}, { strict: false })
    );

    const result = await Wallet.updateMany(
      { owner: { $exists: true } },
      [
        { $set: { phone: "$owner" } },
        { $unset: "owner" }
      ]
    );

    console.log("✅ Migration result:", result);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
