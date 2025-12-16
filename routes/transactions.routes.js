const express = require("express");
const router = express.Router();

const getTransactions = require("../controllers/transactions.controller.js");

router.get("/transactions/:phone", getTransactions);

module.exports = router;
