const express = require("express");
const withdraw = require("../controllers/withdraw.controller");

const router = express.Router();

router.post("/withdraw", withdraw);

module.exports = router;
