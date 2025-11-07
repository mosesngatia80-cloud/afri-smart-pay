const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Welcome to Afri Smart Pay API 💳 — Connecting Africa through smart payments!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
