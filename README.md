# NomuPay APM Demo

A test bench for the alternative payment methods (APMs) available through the **NomuPay Wallets** integration on the ACI/OPPWA gateway. It's separate from the NomuPay COPYandPAY demo: this one is about APMs and how their asynchronous flow works.

Pick a payment method, fill in the request fields (marked M, O or C as in the Payment Knowledge Base), and send it through either:

- **Server-to-server**: `POST /v1/payments` with `paymentBrand`. The demo shows the pending response and its `redirect` object, then sends the shopper to the redirect URL, the same step a merchant's integration has to do.
- **COPYandPAY widget**: `POST /v1/checkouts`, then the widget renders the single brand and handles the redirect.

After the shopper comes back, the result page reads the status with `GET /v1/payments/{id}` (server-to-server) or the checkout `resourcePath` (widget), explains the result code, and shows the connector details (`ExtendedDescription`, `ConnectorReasonCode`, `ConnectorTxID3` for the PPRO payment reference). Recent test payments are listed on the home page and kept in your browser only.

## Payment methods

Bancontact, Bizum, BLIK, EPS, iDEAL, MB WAY, Multibanco, Przelewy24, Swish, Trustly, Twint, Wero, Satispay, PayU, SEPA Direct Debit, PayPal, Paysafecard, Clearpay (Afterpay UK) and Afterpay (US).

Countries, currencies, timeouts and field requirements come from the KB pages *NomuPay Wallets Brand details* and *NomuPay Wallets integration sheet* (last updated 14 Oct 2026). They live in `brands.js`, so adding or changing a brand is a single edit there.

## Environment variables

Set these in Vercel under **Settings → Environment Variables**, then redeploy.

| Variable | Required | Notes |
|---|---|---|
| `ENTITY_ID` | Yes | Test entity with NomuPay Wallets brands enabled |
| `ACCESS_TOKEN` | Yes | Bearer token for that entity |
| `API_HOST` | No | Defaults to `eu-test.oppwa.com` |
| `TEST_MODE` | No | Defaults to `EXTERNAL` on test hosts (NomuPay Wallets simulator). Set it empty to leave it out |
| `PUBLIC_BASE_URL` | No | Fixed base for `shopperResultUrl`. Defaults to the request's host |

The access token never leaves the server. Request echoes mask the entity ID. If the host isn't a test host, the page shows a live-mode warning and doesn't send `testMode`.

## Run locally

```bash
npm install
cp .env.example .env   # fill in ENTITY_ID and ACCESS_TOKEN
npm start              # http://localhost:3000
```

Payment pages redirect back to `shopperResultUrl`, so the full redirect round trip works best on the deployed URL.

## Webhooks

There's no webhook endpoint in this demo. Final statuses are read with status requests from the result page (use **Check again** while a payment is pending). In a live integration the final status also arrives by webhook.

## Routes

| Route | What it does |
|---|---|
| `GET /` | Catalogue and test form |
| `POST /api/s2s/payments` | Server-to-server payment |
| `POST /api/widget/checkouts` | Creates a COPYandPAY checkout |
| `GET /widget/:checkoutId` | Widget page for one brand |
| `GET /result/...` | Result page |
| `GET /api/status?id=… or ?resourcePath=…` | Payment status |
| `GET /api/config` | Environment summary and brand catalogue |
