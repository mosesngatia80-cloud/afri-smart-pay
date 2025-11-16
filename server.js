// -------------------------
// IMPORTS
// -------------------------
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// -------------------------
// MONGO CONNECTION
// -------------------------
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch((error) => console.log("MongoDB Connection Error:", error));

// -------------------------
// MIDDLEWARE
// -------------------------
app.use(express.json());

// -------------------------
// ROUTES
// -------------------------
const walletRoutes = require("./routes/walletRoutes");
app.use("/api", walletRoutes);

// -------------------------
// ROOT ENDPOINT
// -------------------------
app.get("/", (req, res) => {
    res.send("Afri Smart Pay API is running...");
});

// -------------------------
// SERVER LISTENER
// -------------------------
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
