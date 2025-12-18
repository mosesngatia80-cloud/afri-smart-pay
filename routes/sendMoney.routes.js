const express = require("express");
const sendMoney = require("../controllers/sendMoney.controller");

const router = express.Router();

router.post("/send-money", sendMoney);

module.exports = router;
