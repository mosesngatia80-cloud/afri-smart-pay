const express = require("express");
const router = express.Router();
const { withdraw } = require("../controllers/withdraw.controller");
const auth = require("../middleware/auth");

router.post("/withdraw", auth, withdraw);

module.exports = router;
