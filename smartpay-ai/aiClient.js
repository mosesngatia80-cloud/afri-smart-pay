const fetch = require("node-fetch");

const AI_URL = process.env.AI_URL || "http://localhost:8000";

async function parseIntent(text) {
  const res = await fetch(`${AI_URL}/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    throw new Error("AI service error");
  }

  return res.json();
}

module.exports = { parseIntent };
