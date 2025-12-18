exports.createWallet = async (req, res) => {
  try {
    res.json({ message: "Wallet created (placeholder)" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
