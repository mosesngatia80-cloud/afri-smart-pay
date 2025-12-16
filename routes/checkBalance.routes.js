const express = require("express");
const router = express.Router();

const checkBalanceController = require("../controllers/checkBalance.controller.js");

// GET /check-balance/:phone
router.get("/check-balance/:phone", checkBalanceController);

module.exports = router;
