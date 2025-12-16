const mpesaValidation = async (req, res) => {
  console.log("🔔 M-PESA VALIDATION CALLBACK");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
};

const mpesaConfirmation = async (req, res) => {
  console.log("✅ M-PESA CONFIRMATION CALLBACK");
  console.log(JSON.stringify(req.body, null, 2));

  return res.json({
    ResultCode: 0,
    ResultDesc: "Success",
  });
};

module.exports = {
  mpesaValidation,
  mpesaConfirmation,
};
