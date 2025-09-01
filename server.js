import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const API_VERSION = process.env.API_VERSION || "2024-07";
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

app.get("/api/customer", async (req, res) => {
  const { shop, email } = req.query;

  if (!shop || !email) {
    return res.status(400).json({ success: false, message: "Missing shop or email" });
  }

  try {
    const searchUrl = `https://${shop}/admin/api/${API_VERSION}/customers/search.json?query=email:${encodeURIComponent(email)}`;
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
    });

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
  app.listen(PORT, () => console.log(`🚀 Server running locally on port ${PORT}`));
}
