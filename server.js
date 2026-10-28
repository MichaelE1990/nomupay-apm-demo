require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { BRANDS, FIELD_KEYS, getBrand } = require("./brands");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "50kb" }));

// ---------------------------------------------------------------------------
// Configuration (set these in Vercel > Settings > Environment Variables)
// ---------------------------------------------------------------------------
const ENTITY_ID = (process.env.ENTITY_ID || "").trim();
const ACCESS_TOKEN = (process.env.ACCESS_TOKEN || "").trim();
const API_HOST = (process.env.API_HOST || "eu-test.oppwa.com").trim();
// API_BASE_URL only exists so the app can be pointed at a local mock gateway
const API_BASE_URL = (process.env.API_BASE_URL || `https://${API_HOST}`).replace(/\/+$/, "");
const IS_TEST = /test/i.test(API_HOST);
// testMode=EXTERNAL sends test payments to the NomuPay Wallets simulator.
// Defaults to EXTERNAL on test hosts; set TEST_MODE to an empty value to leave it out.
const TEST_MODE = process.env.TEST_MODE !== undefined ? process.env.TEST_MODE.trim() : IS_TEST ? "EXTERNAL" : "";
// Optional: fixed public URL used to build shopperResultUrl (defaults to the request's host)
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const CONFIGURED = Boolean(ENTITY_ID && ACCESS_TOKEN);

if (!CONFIGURED) {
  console.warn("ENTITY_ID and/or ACCESS_TOKEN are not set. Payment requests are disabled until they are.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SUCCESS_CODE = /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)/;
const PENDING_CODE = /^(000\.200|800\.400\.5|100\.400\.500)/;

function classify(code) {
  if (SUCCESS_CODE.test(code || "")) return "success";
  if (PENDING_CODE.test(code || "")) return "pending";
  return "failed";
}

function maskEntity(id) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : "••••";
}

function maskParams(params) {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, k === "entityId" ? maskEntity(v) : v]));
}

function publicBase(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0];
  return `${proto}://${req.get("host")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function gateway(method, pathname, params) {
  const query = new URLSearchParams(params).toString();
  const url = method === "GET" ? `${API_BASE_URL}${pathname}?${query}` : `${API_BASE_URL}${pathname}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? query : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 2000) };
  }
  return { httpStatus: response.status, data };
}

/**
 * Build the request parameters shared by server-to-server payments and widget checkouts.
 * Only known field names are accepted; empty values are left out so the request
 * contains exactly what the tester filled in.
 */
function buildParams(brand, input) {
  const errors = [];
  const amount = String(input.amount || "").trim();
  const currency = String(input.currency || "").trim().toUpperCase();
  if (!/^\d{1,9}(\.\d{2})?$/.test(amount)) errors.push("Amount must look like 10.00");
  if (!brand.currencies.includes(currency)) errors.push(`${brand.name} supports ${brand.currencies.join(", ")}`);

  const params = { entityId: ENTITY_ID, amount, currency, paymentType: "DB" };
  if (TEST_MODE) params.testMode = TEST_MODE;

  const mtid = String(input.merchantTransactionId || "").trim();
  params.merchantTransactionId = mtid || `apm-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  if (!/^[\w.\-]{1,255}$/.test(params.merchantTransactionId)) errors.push("Merchant transaction ID can use letters, digits, . _ and -");

  const fields = input.fields && typeof input.fields === "object" ? input.fields : {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!FIELD_KEYS.has(key)) continue;
    const value = String(raw ?? "").trim();
    if (!value) continue;
    if (value.length > 255) {
      errors.push(`${key} is too long`);
      continue;
    }
    if (key === "billing.country" && !/^[A-Z]{2}$/.test(value)) {
      errors.push("Billing country must be a 2-letter code");
      continue;
    }
    params[key] = value;
  }
  return { params, errors };
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.get("/api/config", (req, res) => {
  res.json({
    configured: CONFIGURED,
    environment: IS_TEST ? "TEST" : "LIVE",
    apiHost: API_HOST,
    entityId: maskEntity(ENTITY_ID),
    testMode: TEST_MODE,
    brands: BRANDS,
  });
});

// Server-to-server: POST /v1/payments with paymentBrand
app.post("/api/s2s/payments", async (req, res) => {
  if (!CONFIGURED) return res.status(503).json({ error: "ENTITY_ID and ACCESS_TOKEN are not set on the server." });
  const brand = getBrand(req.body.brand);
  if (!brand) return res.status(400).json({ error: "Unknown payment brand." });

  const { params, errors } = buildParams(brand, req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(". ") });

  params.paymentBrand = brand.code;
  params.shopperResultUrl = `${publicBase(req)}/result/s2s/${brand.code}/${encodeURIComponent(params.merchantTransactionId)}`;

  try {
    const { httpStatus, data } = await gateway("POST", "/v1/payments", params);
    console.log(`[s2s] ${brand.code} ${params.amount} ${params.currency} -> ${data.result?.code} ${data.result?.description || ""}`);
    res.json({
      flow: "s2s",
      brand: brand.code,
      request: { method: "POST", path: "/v1/payments", params: maskParams(params) },
      httpStatus,
      status: classify(data.result?.code),
      response: data,
    });
  } catch (error) {
    console.error("[s2s] gateway error", error);
    res.status(502).json({ error: `Could not reach ${API_HOST}: ${error.message}` });
  }
});

// COPYandPAY: POST /v1/checkouts, then render the widget for one brand
app.post("/api/widget/checkouts", async (req, res) => {
  if (!CONFIGURED) return res.status(503).json({ error: "ENTITY_ID and ACCESS_TOKEN are not set on the server." });
  const brand = getBrand(req.body.brand);
  if (!brand) return res.status(400).json({ error: "Unknown payment brand." });

  const { params, errors } = buildParams(brand, req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(". ") });
  params.integrity = "true";

  try {
    const { httpStatus, data } = await gateway("POST", "/v1/checkouts", params);
    console.log(`[widget] ${brand.code} checkout -> ${data.id || "no id"} ${data.result?.code}`);
    const widgetUrl = data.id
      ? `/widget/${encodeURIComponent(data.id)}?brand=${brand.code}&mtid=${encodeURIComponent(params.merchantTransactionId)}` +
        (data.integrity ? `&integrity=${encodeURIComponent(data.integrity)}` : "")
      : null;
    res.json({
      flow: "widget",
      brand: brand.code,
      request: { method: "POST", path: "/v1/checkouts", params: maskParams(params) },
      httpStatus,
      status: data.id ? "pending" : "failed",
      response: data,
      widgetUrl,
    });
  } catch (error) {
    console.error("[widget] gateway error", error);
    res.status(502).json({ error: `Could not reach ${API_HOST}: ${error.message}` });
  }
});

// Payment status, by payment ID (server-to-server) or resourcePath (either flow)
app.get("/api/status", async (req, res) => {
  if (!CONFIGURED) return res.status(503).json({ error: "ENTITY_ID and ACCESS_TOKEN are not set on the server." });
  let pathname = null;
  const id = String(req.query.id || "").trim();
  const resourcePath = String(req.query.resourcePath || "").trim();
  if (resourcePath && /^\/v1\/(payments\/[0-9a-f]{32}|checkouts\/[0-9A-Za-z.\-]{10,64}\/payment)$/.test(resourcePath)) {
    pathname = resourcePath;
  } else if (/^[0-9a-f]{32}$/.test(id)) {
    pathname = `/v1/payments/${id}`;
  }
  if (!pathname) return res.status(400).json({ error: "Give a 32-character payment ID or a resourcePath." });

  try {
    const { httpStatus, data } = await gateway("GET", pathname, { entityId: ENTITY_ID });
    res.json({ request: { method: "GET", path: pathname }, httpStatus, status: classify(data.result?.code), response: data });
  } catch (error) {
    console.error("[status] gateway error", error);
    res.status(502).json({ error: `Could not reach ${API_HOST}: ${error.message}` });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true, configured: CONFIGURED, environment: IS_TEST ? "TEST" : "LIVE" }));

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, "public");

app.get("/widget/:checkoutId", (req, res) => {
  const checkoutId = String(req.params.checkoutId);
  const brand = getBrand(req.query.brand);
  const integrity = String(req.query.integrity || "");
  const mtid = String(req.query.mtid || "");
  if (!/^[0-9A-Za-z.\-]{10,64}$/.test(checkoutId) || !brand) return res.status(400).send("Invalid checkout link.");
  if (integrity && !/^sha(256|384|512)-[A-Za-z0-9+/=]+$/.test(integrity)) return res.status(400).send("Invalid integrity value.");
  if (mtid && !/^[\w.\-]{1,255}$/.test(mtid)) return res.status(400).send("Invalid merchant transaction ID.");

  const shopperResultUrl = `${publicBase(req)}/result/widget/${brand.code}/${encodeURIComponent(mtid || "checkout")}`;
  const html = fs
    .readFileSync(path.join(PUBLIC_DIR, "widget.html"), "utf8")
    .replace(/{{apiBase}}/g, escapeHtml(API_BASE_URL))
    .replace(/{{checkoutId}}/g, escapeHtml(checkoutId))
    .replace(/{{integrityAttr}}/g, integrity ? ` integrity="${escapeHtml(integrity)}" crossorigin="anonymous"` : "")
    .replace(/{{brandCode}}/g, escapeHtml(brand.code))
    .replace(/{{brandName}}/g, escapeHtml(brand.name))
    .replace(/{{shopperResultUrl}}/g, escapeHtml(shopperResultUrl))
    .replace(/{{environment}}/g, IS_TEST ? "TEST" : "LIVE");
  res.send(html);
});

app.get(["/result", "/result/*"], (req, res) => res.sendFile(path.join(PUBLIC_DIR, "result.html")));

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`NomuPay APM Demo on http://localhost:${PORT} (${IS_TEST ? "TEST" : "LIVE"}, ${API_HOST})`));
}

module.exports = app;
