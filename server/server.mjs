import express from "express";
import nodemailer from "nodemailer";

/**
 * steezkng backend (Node.js/Express)
 *
 * Provides PayPal IPN listener:
 *   POST /api/paypal/ipn
 *
 * IMPORTANT:
 * - This server is not automatically deployed by a static Vite build.
 * - Use this as the production backend, and point your PayPal notify_url to it.
 */

const app = express();

// PayPal sends x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/paypal/ipn", async (req, res) => {
  try {
    // Respond 200 quickly; PayPal expects fast acknowledgment.
    res.status(200).send("OK");

    const body = new URLSearchParams({ cmd: "_notify-validate", ...req.body });

    // Verify with PayPal
    const verifyResp = await fetch("https://ipnpb.paypal.com/cgi-bin/webscr", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const verifyText = await verifyResp.text();
    if (verifyText !== "VERIFIED") {
      console.warn("IPN not verified:", verifyText);
      return;
    }

    // Extract fields
    const orderId = req.body.custom || req.body.invoice;
    const txnId = req.body.txn_id;
    const payerEmail = req.body.payer_email;
    const paymentStatus = req.body.payment_status;

    if (!orderId || !txnId || !payerEmail) {
      console.warn("Missing IPN fields", { orderId, txnId, payerEmail });
      return;
    }

    if (paymentStatus !== "Completed") {
      console.warn("Payment not completed:", paymentStatus);
      return;
    }

    // Buyer IP (best effort)
    const buyerIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    // TODO: Mark order paid + decrement stock in your real-time DB.
    // Recommended: Supabase (Postgres + Realtime). Example pseudo:
    //  - update orders set status='paid', transactionId=txnId, buyerEmail=payerEmail, buyerIp=buyerIp where id=orderId
    //  - fetch order items, decrement stock per product
    //  - insert into sales evidence log
    //  - fetch deliveryData, email to payerEmail

    // Email scaffold (configure SMTP env vars)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `steezkng <${smtpUser}>`,
        to: payerEmail,
        subject: `Your steezkng delivery — Order ${orderId}`,
        text: `Payment verified. Your delivery details will appear on the success page.\n\nOrder: ${orderId}\nTransaction: ${txnId}`,
      });
    }

    console.log("IPN VERIFIED", { orderId, txnId, payerEmail, buyerIp });
  } catch (err) {
    console.error("IPN handler error", err);
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`steezkng backend listening on http://localhost:${port}`);
});