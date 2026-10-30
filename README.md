# NomuPay APM Demo

A test bench for payment brands (APMs) and cards on the ACI/OPPWA gateway. It's built to feel like a merchant integrating: every step shows the request on the right as you build it, sends it, shows the real response underneath, and the next step uses what came back.

## Guides

**COPYandPAY** (`/copyandpay`)

1. **Prepare the checkout**: `POST /v1/checkouts`. Choose any mix of payment brands and cards in the multi-select, set the amount, and add extras:
   - *Customer & billing details* adds `customer.*`, `billing.*` and `shipping.*`
   - *Cart items* adds `cart.items[n].*` and makes the amount the cart total
2. **Render the payment form**: the HTML for `paymentWidgets.js` with the real `checkoutId`, `integrity` and `data-brands`, and a checkout page that runs it.
3. **Get the payment result**: `GET /v1/checkouts/{id}/payment`, read automatically when the shopper comes back.

**Server-to-server** (`/server-to-server`)

1. **Create the payment**: `POST /v1/payments` with one `paymentBrand`, picked from a searchable menu. The page stays on step 1 so the response can be read.
2. **Redirect the shopper**: the `redirect` object from the response as a JS snippet. **Redirect the shopper** opens the payment page in a drawer (GET or POST, as the gateway asks), so the demo page stays put; **open it in a new window** does the same in a popup for pages that can't be framed. When the shopper reaches the `shopperResultUrl`, that page tells the demo, the drawer closes and step 3 checks the result.
3. **Get the payment result**: `GET /v1/payments/{id}`.

Reference pages list every payment method with its countries, currencies, timeout and fields (`/payment-methods`), and the result codes you're likely to see (`/result-codes`).

## Payment methods

Payment brands: Bancontact, Bizum, BLIK, EPS, iDEAL, MB WAY, Multibanco, Przelewy24, Swish, Trustly, Twint, Wero, Satispay, PayU, SEPA Direct Debit, PayPal, Paysafecard, Clearpay (Afterpay UK) and Afterpay (US). All are certified and in scope.

Cards: Visa, Mastercard, American Express (COPYandPAY only).

Countries, currencies, timeouts and field requirements come from the KB pages *NomuPay Wallets Brand details* and *NomuPay Wallets integration sheet* (last updated 14 Oct 2026). They live in `src/lib/brands.js`, so adding or changing a brand is one edit there.

## Environment variables

Set these in Vercel under **Settings → Environment Variables**, then redeploy.

| Variable | Required | Notes |
|---|---|---|
| `ENTITY_ID` | Yes | Test entity with the payment brands enabled |
| `ACCESS_TOKEN` | Yes | Bearer token for that entity |
| `CARD_ENTITY_ID` | No | Entity used whenever a checkout includes cards. Falls back to `ENTITY_ID` |
| `CARD_ACCESS_TOKEN` | No | Token for `CARD_ENTITY_ID` if it differs. Falls back to `ACCESS_TOKEN` |
| `API_HOST` | No | Defaults to `eu-test.oppwa.com` |
| `TEST_MODE` | No | Defaults to `EXTERNAL` on test hosts (PPRO simulator), sent only when a payment brand is in the request. Set it empty to leave it out |
| `PUBLIC_BASE_URL` | No | Fixed base for `shopperResultUrl` and the widget's return URL. Defaults to the request's host |

Access tokens never leave the server, and entity IDs are masked on screen. When a checkout mixes cards and APMs it runs on the card entity, so the APMs only appear in the widget if that entity has them too.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in ENTITY_ID and ACCESS_TOKEN
npm run dev                  # http://localhost:3000
```

Payment pages redirect back to the return URL, so the full round trip works best on the deployed URL.

## Webhooks

There's no webhook endpoint in this demo. Final statuses are read with status requests (use **Check again** while a payment is pending). In a live integration the final status also arrives by webhook.

## Built with

Next.js, Tailwind CSS and Headless UI. The layout, navigation, code panels and badges are adapted from the [Protocol](https://tailwindcss.com/plus/templates/protocol) template from Tailwind Plus.

## Routes

| Route | What it does |
|---|---|
| `/` | Introduction and environment |
| `/copyandpay`, `/copyandpay/return` | COPYandPAY guide; the return page is the widget's form action |
| `/server-to-server`, `/server-to-server/return` | Server-to-server guide; the return page is the `shopperResultUrl`, and inside the drawer or popup it messages the guide instead |
| `/checkout/{checkoutId}` | Checkout page running `paymentWidgets.js` |
| `POST /api/checkouts` | Creates a COPYandPAY checkout |
| `POST /api/payments` | Server-to-server payment |
| `GET /api/status?resourcePath=…&entity=…` | Payment or checkout status |
| `GET /api/config` | Environment summary and payment method catalogue |
