const express = require("express");
const app = express();
const walletRoutes = require("./walletRoutes");

app.use(express.json());

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});

// Use wallet routes
app.use("/api", walletRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
