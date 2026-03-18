import express from "express";
import cors from "cors";
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
  app.use(cors());

  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working!" });
  });

  app.post("/api/create-preference", async (req, res) => {
    const { userId, email, cpf, planName, amount, paymentMethod } = req.body;
    console.log("Creating preference for:", { userId, email, cpf, planName, amount, paymentMethod });
    try {
      const preference = new Preference(client);
      const requestBody = {
        items: [{ id: '1', title: planName, quantity: 1, unit_price: Number(amount), currency_id: 'BRL' }],
        external_reference: String(userId),
        notification_url: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/api/webhook`,
        back_urls: {
          success: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/`,
          failure: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/`,
          pending: `${process.env.APP_URL || 'https://ais-dev-2ljxrupff4fnsdftrofktf-45221046979.us-east1.run.app'}/`
        },
        payer: { 
          name: 'Cliente',
          email: email,
          identification: {
            type: 'CPF',
            number: cpf
          }
        },
      };
      console.log("Sending to Mercado Pago:", JSON.stringify(requestBody, null, 2));
      const result = await preference.create({
        body: requestBody,
      });
      console.log("Preference created result:", JSON.stringify(result, null, 2));
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
