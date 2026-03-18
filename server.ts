import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { MercadoPagoConfig, Preference } from "mercadopago";
import admin from "firebase-admin";

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/create-preference", async (req, res) => {
    const { userId, planName, amount } = req.body;
    try {
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [{ id: '1', title: planName, quantity: 1, unit_price: amount }],
          external_reference: userId,
          notification_url: `${process.env.APP_URL}/api/webhook`,
        },
      });
      res.json({ id: result.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create preference" });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    const { data, type } = req.body;
    
    // Mercado Pago webhook type is typically "payment"
    if (type === "payment") {
      try {
        const paymentId = data.id;
        // Fetch payment details from Mercado Pago API to verify
        // Correct implementation:
        // const payment = await new Payment(client).get({ id: paymentId });
        
        // For now, assume payment is approved if webhook is received
        // In production, MUST verify payment status with Mercado Pago API
        
        // Get user ID from external_reference
        // const userId = payment.external_reference;
        // await db.collection("users").doc(userId).update({ isUpgraded: true });
        
        console.log(`Payment ${paymentId} received.`);
      } catch (error) {
        console.error("Webhook error:", error);
      }
    }
    res.sendStatus(200);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
