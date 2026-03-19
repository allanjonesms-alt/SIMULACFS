import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
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
  app.use(cors({
    origin: 'https://simulacfs-473889295670.us-west1.run.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working!" });
  });

  app.post("/api/create-preference", async (req, res) => {
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN is not set.");
      return res.status(500).json({ error: "Mercado Pago access token is not configured." });
    }
    const { userId, email, cpf, planName, amount, paymentMethod } = req.body;
    console.log("Creating preference for:", { userId, email, cpf, planName, amount, paymentMethod });
    try {
      const preference = new Preference(client);
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const requestBody = {
        items: [{ id: '1', title: planName, quantity: 1, unit_price: Number(amount), currency_id: 'BRL' }],
        external_reference: String(userId),
        notification_url: `${baseUrl}/api/webhook`,
        back_urls: {
          success: `${baseUrl}/`,
          failure: `${baseUrl}/`,
          pending: `${baseUrl}/`
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
    const { data, type, action } = req.body;
    console.log("Webhook received:", { type, action, data });
    
    // Mercado Pago sends webhooks for various events. We care about "payment" or "payment.created/updated"
    if (type === "payment" || action === "payment.created" || action === "payment.updated") {
      try {
        const paymentId = data?.id || req.query['data.id'];
        if (!paymentId) {
          console.warn("No payment ID found in webhook body or query");
          return res.sendStatus(200);
        }

        console.log(`Verifying payment ${paymentId}...`);
        const payment = new Payment(client);
        const paymentDetails = await payment.get({ id: paymentId });
        
        console.log("Payment details:", {
          status: paymentDetails.status,
          status_detail: paymentDetails.status_detail,
          external_reference: paymentDetails.external_reference
        });

        if (paymentDetails.status === "approved") {
          const userId = paymentDetails.external_reference;
          if (userId) {
            console.log(`Upgrading user ${userId}...`);
            await db.collection("users").doc(userId).update({ 
              isUpgraded: true,
              upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
              lastPaymentId: paymentId
            });
            console.log(`User ${userId} upgraded successfully.`);
          } else {
            console.warn("No external_reference (userId) found in payment details");
          }
        }
      } catch (error) {
        console.error("Webhook processing error:", error);
        // We still return 200 to Mercado Pago to avoid retries if the error is on our side
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
