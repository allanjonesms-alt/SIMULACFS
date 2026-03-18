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
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
if (!accessToken) {
  console.error("MERCADOPAGO_ACCESS_TOKEN is not set.");
}
const client = new MercadoPagoConfig({ accessToken: accessToken || "" });

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.post("/api/create-preference", async (req, res) => {
    const { userId, planName, amount } = req.body;
    console.log("Creating preference for:", { userId, planName, amount });
    try {
      console.log("Creating preference with body:", JSON.stringify({
        items: [{ id: '1', title: planName, quantity: 1, unit_price: Number(amount) }],
        external_reference: userId,
        notification_url: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/api/webhook`,
      }, null, 2));

      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [{ id: '1', title: planName, quantity: 1, unit_price: Number(amount) }],
          external_reference: String(userId),
          notification_url: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/api/webhook`,
        },
      });
      console.log("Preference created:", result.id);
      res.json({ init_point: result.init_point });
    } catch (error) {
      console.error("Error creating preference:", error);
      res.status(500).json({ error: "Failed to create preference: " + (error instanceof Error ? error.message : String(error)) });
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
