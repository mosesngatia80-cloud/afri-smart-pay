import Wallet from "../models/Wallet.js";
import bcrypt from "bcryptjs";

export const createWallet = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN are required" });
    }

    const existing = await Wallet.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Wallet already exists" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await Wallet.create({
      phone,
      pin: hashedPin,
      balance: 0
    });

    return res.json({ message: "Wallet created successfully" });

  } catch (error) {
    console.error("❌ CREATE WALLET ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
