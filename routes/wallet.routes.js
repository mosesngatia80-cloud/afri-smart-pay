const express = require("express");
const router = express.Router();

const createWallet = require("../controllers/createWallet.controller");

router.post("/create-wallet", createWallet);

module.exports = router;
