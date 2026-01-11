import axios from "axios";

const accessToken = process.env.ACCESS_TOKEN;

async function registerUrl() {
  try {
    const res = await axios.post(
      "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        ShortCode: "3023415",
        ResponseType: "Completed",
        ConfirmationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/confirmation",
        ValidationURL: "https://afri-smart-pay-4.onrender.com/api/c2b/validation"
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("SUCCESS:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("ERROR STATUS:", err.response.status);
      console.log("ERROR DATA:", err.response.data);
    } else {
      console.log("ERROR:", err.message);
    }
  }
}

registerUrl();
