import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// ---------------------- CONFIG ----------------------
const N8N_URL =
  "https://n8n-production-cebd.up.railway.app/webhook-test/ultimate-notion-control";
const VERIFY_TOKEN = "dragon_token";

const PHONE_NUMBER_ID = "951797514685457"; // Your WhatsApp Business number ID
const ACCESS_TOKEN =
  "EAAKFsvJG4GUBQN7E2g3d61Ub26uSqFmUiZC7EUeRAESncqs1qelpadwnsxw1fFJ6JJKP2HjoLPv2lKhiPKpqHXgtIjntYUoAgh2ow2uBZAeeOzWE68Qd9ONJ7TDUIOnE4fOE2VZBnwZAbP5REEfG02OUtqamfYBxilyF8WMPC5lFieS9XHZBHcEZCuL2cOApvZCIQZDZD"; // Permanent Meta token
// ----------------------------------------------------

// 1️⃣ Verify webhook (Meta callback verification)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// 2️⃣ Forward only real WhatsApp messages to n8n
app.post("/webhook", async (req, res) => {
  const changes = req.body.entry?.[0]?.changes?.[0]?.value;

  if (!changes || !changes.messages || changes.messages.length === 0) {
    // Not a real WhatsApp message, ignore
    console.log("Ignored non-message payload");
    return res.sendStatus(200);
  }

  try {
    await axios.post(N8N_URL, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.log("Forwarding to n8n failed:", err.message);
    res.sendStatus(500);
  }
});

// 3️⃣ Endpoint to send WhatsApp messages via Meta API
app.post("/send", async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).send("Missing 'to' or 'text' in body");
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    res.sendStatus(200);
  } catch (err) {
    console.log("WhatsApp send failed:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// 4️⃣ Ping endpoint to keep Replit awake
app.get("/ping", (req, res) => {
  res.send("ok");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Proxy running on port " + PORT));

