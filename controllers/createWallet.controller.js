const Wallet = require("../models/Wallet");
const bcrypt = require("bcryptjs");

const createWallet = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN are required" });
    }

    const existing = await Wallet.findOne({ phone });
    if (existing) {
      return res.status(200).json({
        message: "Wallet already exists",
        wallet: {
          phone: existing.phone,
          balance: existing.balance
        }
      });
    }

    const hashedPin = await bcrypt.hash(pin.toString(), 10);

    const wallet = await Wallet.create({
      phone,
      pin: hashedPin,
      balance: 0
    });

    return res.status(201).json({
      message: "Wallet created successfully",
      wallet: {
        phone: wallet.phone,
        balance: wallet.balance
      }
    });

  } catch (err) {
    console.error("CREATE WALLET ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = createWallet;
