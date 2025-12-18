const express = require("express");
const { checkBalance } = require("../controllers/checkBalance.controller");

const router = express.Router();

router.get("/check-balance/:phone", checkBalance);

module.exports = router;
