const express = require("express");
const app = express();

// Import wallet routes
const walletRoutes = require("./routes/walletRoutes");

// Middleware
app.use(express.json());

// API Routes
app.use("/api", walletRoutes);

// Root endpoint
app.get("/", (req, res) => {
    res.send("Afri Smart Pay API is running...");
});

// Render / Local port
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
