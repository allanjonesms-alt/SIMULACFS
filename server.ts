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
    origin: '*', // Allow all origins for simplicity in this environment, or use process.env.APP_URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  app.use((req, res, next) => {
    if (req.method === 'POST' && req.url === '/api/webhook') {
      console.log(`[DEBUG] ${req.method} ${req.url}`);
      console.log(`[DEBUG] Webhook Body:`, JSON.stringify(req.body, null, 2));
      console.log(`[DEBUG] Webhook Query:`, JSON.stringify(req.query, null, 2));
    }
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
        auto_return: 'approved',
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
    console.log("[WEBHOOK] Received webhook request");
    // Handle both Webhooks (JSON body) and IPN (Query params)
    const { data, type, action } = req.body;
    const topic = req.query.topic || type;
    const paymentId = data?.id || req.query.id || req.query['data.id'];

    console.log("[WEBHOOK] Parsed data:", { topic, action, paymentId, type });
    
    if (topic === "payment" || action === "payment.created" || action === "payment.updated" || action === "payment.status_changed" || type === "payment") {
      try {
        if (!paymentId) {
          console.warn("[WEBHOOK] No payment ID found in webhook/IPN");
          return res.sendStatus(200);
        }

        console.log(`[WEBHOOK] Verifying payment ${paymentId}...`);
        const payment = new Payment(client);
        const paymentDetails = await payment.get({ id: String(paymentId) });
        
        console.log("[WEBHOOK] Payment details retrieved:", JSON.stringify({
          id: paymentDetails.id,
          status: paymentDetails.status,
          status_detail: paymentDetails.status_detail,
          external_reference: paymentDetails.external_reference
        }, null, 2));

        if (paymentDetails.status === "approved") {
          const userId = paymentDetails.external_reference;
          if (userId) {
            console.log(`[WEBHOOK] Upgrading user ${userId}...`);
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
              await userRef.update({ 
                isUpgraded: true,
                upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastPaymentId: String(paymentId)
              });
              console.log(`[WEBHOOK] User ${userId} upgraded successfully.`);
            } else {
              console.error(`[WEBHOOK] User ${userId} not found in database.`);
              // If user not found, maybe it's a different collection or ID format?
              // Let's try to find by email if possible, but external_reference should be the UID.
            }
          } else {
            console.warn("[WEBHOOK] No external_reference (userId) found in payment details");
          }
        } else {
          console.log(`[WEBHOOK] Payment ${paymentId} status is ${paymentDetails.status}, not approved.`);
        }
      } catch (error) {
        console.error("[WEBHOOK] Webhook processing error:", error);
      }
    } else {
      console.log("[WEBHOOK] Topic/Action not handled:", { topic, action, type });
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
