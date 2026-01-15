const Wallet = require("../models/Wallet");
const bcrypt = require("bcryptjs");

/**
 * Create wallet OR reset PIN if wallet exists
 */
const createWallet = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN are required" });
    }

    const pinHash = await bcrypt.hash(pin.toString(), 10);

    let wallet = await Wallet.findOne({ phone });

    // 🔑 WALLET EXISTS → RESET PIN
    if (wallet) {
      wallet.pinHash = pinHash;
      await wallet.save();

      return res.status(200).json({
        message: "Wallet PIN updated",
        wallet: {
          phone: wallet.phone,
          balance: wallet.balance
        }
      });
    }

    // 🔑 WALLET DOES NOT EXIST → CREATE
    wallet = await Wallet.create({
      phone,
      balance: 0,
      pinHash
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
