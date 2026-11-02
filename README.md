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

*Payment workflow* comes first: an overview, then *Use cases* with two cards for the payment flow (Asynchronous, or Synchronous for Bizum and Swish with the shopper's mobile number). The chosen card opens a tray with its transaction flows (Debit, or Pre-authorization + Capture for PayPay; synchronous offers Debit only). Under *Transaction flow model*, a sequence diagram shows the requests between the shopper, the merchant server, the payment gateway and the payment brand for that flow; the numbered requests link to the steps, which follow the server-to-server guide on docs.oppwa.com:

1. **Perform debit payment** / **Pre-authorize payment**: `POST /v1/payments`. Pick the payment brand here (only brands that support the flow), with a link to the Help Centre list and the brand's currencies, countries, timeout, amount limits and refunds. The body parameters follow in collapsible groups named as in the [parameters reference](https://nomupay.docs.oppwa.com/reference/parameters) (Basic payment, Asynchronous payments, Customer, Billing address, Bank account, Virtual account, Cart, Custom parameters, Testing). Only the brand's own fields from the KB fields mapping are listed and sent. The page stays on this step so the response can be read.
2. **Redirect shopper** (asynchronous only): the `redirect` object as a JS snippet. The payment page opens in a drawer, or a new window. The shopper returns to the production domain (deployment URLs are behind Vercel's login, which can't load inside the frame), and that page tells the demo, which closes the drawer. The demo never requests the status by itself: the merchant sends it in step 3.
3. **Get the payment status**: `GET /v1/payments/{id}`, sent with *Send request*; once there's a reply, *Check status* sends it again for a pending payment. The gateway allows two status requests a minute per payment (more get `800.120.100`), so the demo counts them and waits rather than going over.
4. **Capture the payment** (pre-authorization only): `POST /v1/payments/{id}` with `paymentType=CP`.
5. **Manage the payment** (optional): a full or partial refund, `paymentType=RF`, for brands that allow refunds. Capture and refund send the same `testMode` as the payment, or the gateway answers `700.100.600`. Refunds come back pending (`000.200.001`) while the brand processes them.

Reference pages list every payment method with its countries, currencies, timeout and fields (`/payment-methods`), and the result codes you're likely to see (`/result-codes`).

## Payment methods

The demo lists only the payment methods on the Help Centre's [Ecommerce Payment Methods](https://support.nomupay.com/hc/en-gb/articles/52156192050193-Ecommerce-Payment-Methods) list, which is production-based:

- **Payment brands**: Afterpay (UK and US), Alipay, Alipay (HK), Alipay+, Atome, Bancontact, Bizum, Blik, Boost, Cebuana, DragonPay, DuitNow QR, ECPay, Eps, FPX, GCash, GrabPay, iDEAL, Konbini, MAE by Maybank, Maya, MB WAY, Multibanco, PayPay, Paysafecard, PayU, Przelewy 24, Satispay, SEPA Direct Debit, ShopeePay, Swish, Touch'n Go, Trustly, Twint, UPI, WeChat Pay and Wero.
- **Cards**: Visa, Mastercard and Maestro (COPYandPAY only).

UnionPay SecurePay is on the list but has no NomuPay Wallets brand in the Payment Knowledge Base, so it isn't in the demo.

Where the rest comes from:

| What | Source |
|---|---|
| Countries and currencies | Help Centre, Ecommerce Payment Methods |
| Mandatory, conditional and optional fields per brand | KB, *NomuPay Wallets Brand details* > Fields mapping |
| Field formats and conditions | KB, *NomuPay Wallets integration sheet* > Fields mapping (Request) and Custom Parameters |
| Timeouts | KB, *NomuPay Wallets Brand details* > Brands Enabled in Test |

The integration sheet's *Minimal Request* examples aren't used: several leave out mandatory fields.

Mandatory fields are required in test too, so a request that works here is ready for production. The Send button stays off until they're filled in, and the server rejects a request that's missing one. Everything lives in `src/lib/brands.js`, so adding or changing a brand is one edit there.

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
| `POST /api/payments/{id}` | Capture (CP) or refund (RF) of an earlier payment |
| `GET /api/status?resourcePath=…&entity=…` | Payment or checkout status |
| `GET /api/config` | Environment summary and payment method catalogue |
