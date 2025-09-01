import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config( );
const app = express();

// --- START: CORRECTED CORS CONFIGURATION ---

// Define the list of allowed origins
const allowedOrigins = [
  'https://customer-metafeilds-git-main-briskcoder.vercel.app', // Your Vercel frontend
  'https://indiauto.myshopify.com' // The Shopify domain (good to keep )
];

// Configure the CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    // The 'origin' is the URL of the frontend making the request
    // On a 'same-origin' request, 'origin' will be undefined.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      // If the origin is in our whitelist (or it's a same-origin request), allow it
      callback(null, true);
    } else {
      // Otherwise, deny the request
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Use the configured CORS options
app.use(cors(corsOptions));

// The preflight 'OPTIONS' request is handled by the cors middleware.
// You can remove app.options("*", cors()); as it's now redundant.

// --- END: CORRECTED CORS CONFIGURATION ---


app.use(express.json());

const API_VERSION = process.env.API_VERSION || "2024-07";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

app.get("/api/customer", async (req, res) => {
  // ... your route logic remains exactly the same ...
  const { shop, email } = req.query;

  if (!shop || !email) {
    return res.status(400).json({ success: false, message: "Missing shop or email" });
  }

  try {
    const searchUrl = `https://${shop}/admin/api/${API_VERSION}/customers/search.json?query=email:${encodeURIComponent(email )}`;
    const custResp = await axios.get(searchUrl, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN },
    });

    const customers = custResp.data?.customers || [];
    if (!customers.length) {
      return res.json({ success: false, message: "No customer found" });
    }

    const customer = customers[0];

    const murl = `https://${shop}/admin/api/${API_VERSION}/customers/${customer.id}/metafields.json`;
    const metaResp = await axios.get(murl, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN },
    } );

    const metafields = metaResp.data?.metafields || [];
    const mf = {};
    metafields.forEach((m) => {
      mf[`${m.namespace}:${m.key}`] = m.value;
    });

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      metafields: mf,
    });
  } catch (err) {
    console.error("Error:", err?.response?.data || err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Local server on port ${PORT}`));
}
