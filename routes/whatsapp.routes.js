const express = require("express");
const router = express.Router();

const whatsappController = require("../controllers/whatsapp.controller.js");

// WhatsApp webhook receiver
router.post("/whatsapp/webhook", whatsappController);

module.exports = router;
