const axios = require("axios");

const consumerKey = "YbNiAqsUrBjyEVd6GHEWGUsrnhERj83TeOutYIgFfbTwPIGG";
const consumerSecret = "AApGJRuUMZyI3XCqjxQPGfUEFzpwxehIPIUMMrIygzA9njiCc4sIlKqF9iXSzal";

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

async function getToken() {
  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log("✔ SUCCESS TOKEN:");
    console.log(response.data);
  } catch (error) {
    console.log("❌ ERROR DETAILS:");
    console.log(error.response?.data || error.message);
  }
}

getToken();
