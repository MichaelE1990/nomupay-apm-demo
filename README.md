# Nomupay Payment Methods

A test bench for payment brands (APMs) and cards on the ACI/OPPWA gateway, in the Nomupay brand (Montserrat, navy #172147, blue #0190F7; logo paths from the Brand Guidelines). It's built to feel like a merchant integrating: every step shows the request on the right as you build it, sends it, shows the real response underneath, and the next step uses what came back.

## Guides

**COPYandPAY** (`/copyandpay`)

1. **Prepare the checkout**: `POST /v1/checkouts`. Choose any mix of payment brands and cards in the multi-select, set the amount, and add extras:
   - *Customer & billing details* adds `customer.*`, `billing.*` and `shipping.*`
   - *Cart items* adds `cart.items[n].*` and makes the amount the cart total
2. **Render the payment form**: the HTML for `paymentWidgets.js` with the real `checkoutId`, `integrity` and `data-brands`, and a checkout page that runs it.
3. **Get the payment result**: `GET /v1/checkouts/{id}/payment`, read automatically when the shopper comes back.

**Server-to-server** (`/server-to-server`)

*Payment workflow* comes first: an overview, then *Transaction flow model*, a sequence diagram of the requests between the shopper, the merchant server, the payment gateway and the payment brand (the numbered requests link to the steps), then *Use cases* with two cards for the payment flow (Asynchronous, or Synchronous for Bizum and Swish with the shopper's mobile number). The chosen card opens a tray with its transaction flows (Debit, or Pre-authorization + Capture for PayPay; synchronous offers Debit only). The steps follow the server-to-server guide on docs.oppwa.com.

Every step is laid out like an API reference: *Properties* (method and endpoint, base URL, content type), *Path parameters* where the URL takes the payment `id`, *Body parameters* in two collapsible groups (Basic payment and Testing), and *Response* with the response parameters. Each parameter shows its format and pattern from the [parameters reference](https://nomupay.docs.oppwa.com/reference/parameters) (e.g. `amount` N10.N2 `[0-9]{1,10}(\.[0-9]{2})?`), the requirement, the description and an example (the current value when there is one). Objects such as `result`, `resultDetails` and `redirect` open their child parameters.

Request panels have cURL and JavaScript (Node.js fetch) tabs, kept in step across the page, with the request laid out like docs.oppwa.com (the URL, each parameter as `-d`, then the header). The **Playground** tab opens a settings drawer that holds everything the requests are built from: your own test credentials (entityId and access token, kept in this browser tab only and sent only to the test system), the use case, payment brand, currency and amount, the brand's own fields from the KB fields mapping, the cart, the capture and refund amounts, and test mode. Under each response, a note gives the result and the next step.

1. **Perform debit payment** / **Pre-authorize payment**: `POST /v1/payments`. The page stays on this step so the response can be read.
2. **Redirect shopper** (asynchronous only): the `redirect` object as a JS snippet. The payment page opens in a drawer, or a new window. The shopper returns to the production domain (deployment URLs are behind Vercel's login, which can't load inside the frame), and that page tells the demo, which closes the drawer and marks the redirect complete under the snippet; the page stays on step 2. The demo never requests the status by itself: the merchant sends it in step 3. The shopperResultUrl and entityId on screen are placeholders; the real values are added on the server.
3. **Get the payment status**: `GET /v1/payments/{id}`, sent with *Send request*; once there's a reply, *Check status* sends it again for a pending payment. The response parameters come from the OPPWA Payment Response Parameters and the Wallets integration sheet's Response field mapping (ConnectorTxID1-3 and the other `resultDetails`). The gateway allows two status requests a minute per payment (more get `800.120.100`), so the demo counts them and waits rather than going over.
4. **Capture the payment** (pre-authorization only): `POST /v1/payments/{id}` with `paymentType=CP`.
5. **Manage the payment** (optional): a full or partial refund, `paymentType=RF`, for brands that allow refunds. Capture and refund send the same `testMode` as the payment, or the gateway answers `700.100.600`. Refunds come back pending (`000.200.001`) while the brand processes them.

**Server-to-server cards** (`/server-to-server-cards`)

Card-on-file for Visa and Mastercard on NomuPay, following the KB *Credential on File (COF) integration sheet* (scenarios 1.3/1.4 recurring, 1.7/1.8 unscheduled), the *NomuPay Integration Sheet* and docs.oppwa.com *Server-to-Server Registration Tokens > Tokenization during payment*. Use cases: *External 3D Secure* (the request carries 3D Secure results from your own MPI, the values from the docs sample, no redirect) or *Gateway 3D Secure* (browser data, `customer.ip` and a `shopperResultUrl`, with a redirect step and a status step), each as Debit or Pre-authorization + Capture.

1. **Perform the initial payment** / **Pre-authorize the initial payment**: `POST /v1/payments` with the card, `createRegistration=true` and `standingInstruction` `INITIAL` / `CIT` (with `recurringType`, `frequency` and `expiry` for recurring). PA can send `customParameters[authorization_type]`.
2. **Authenticate the shopper** and **Get the payment status** (gateway 3D Secure only).
3. **Capture the payment** (pre-authorization only): `POST /v1/payments/{id}` with `paymentType=CP`. No card-on-file fields: NomuPay doesn't list scenario 1.10 and sends the Mastercard lifecycle TLID itself.
4. **Send the repeated payment**: `POST /v1/registrations/{registrationId}/payments`, DB with `REPEATED` / `MIT`, no CVV or 3D Secure. `standingInstruction.initialTransactionId` and `agreementId` are optional over a registration; the Playground can send them.
5. **Card-on-file identifiers**: a table of `registrationId`, `resultDetails.CardholderInitiatedTransactionID`, `resultDetails.LifecycleId` and the `standingInstruction` IDs for the initial and repeated payments, with a note explaining a missing LifecycleId (simulator vs `testMode=EXTERNAL`, or no connector details on the entity).

Only the published test cards are accepted (NomuPay test data: 5555555555554444 and 4000000000000002, expiry 01/30, CVV 333; plus the 3D Secure testing guide's frictionless and challenge cards), and only on a test host. The CVV is masked in what the server sends back to the page. `testMode` is chosen in the Playground (EXTERNAL reaches NomuPay's test system; INTERNAL or not sent is the gateway's simulator) and capture and the repeated payment send the same value.

The sidebar is organised like a help centre: the Guides category, its sections (Introduction; Integrations), the articles in each, and the open article's chapters under it. Breadcrumbs above each article show the same path.

The introduction covers getting started and credentials (entityId and the access token as a Bearer header, from the Credentials section of the Nomupay Dashboard), and links to both guides.

## Payment methods

The demo lists only the payment methods on the Help Centre's [Ecommerce Payment Methods](https://support.nomupay.com/hc/en-gb/articles/52156192050193-Ecommerce-Payment-Methods) list, which is production-based:

- **Payment brands**: Afterpay (UK and US), Alipay, Alipay (HK), Alipay+, Atome, Bancontact, Bizum, Blik, Boost, Cebuana, DragonPay, DuitNow QR, ECPay, Eps, FPX, GCash, GrabPay, iDEAL, Konbini, MAE by Maybank, Maya, MB WAY, Multibanco, PayPay, Paysafecard, PayU, Przelewy 24, Satispay, SEPA Direct Debit, ShopeePay, Swish, Touch'n Go, Trustly, Twint, UPI, WeChat Pay and Wero.
- **Cards**: Visa, Mastercard and Maestro in COPYandPAY; Visa and Mastercard card-on-file in Server-to-server cards.

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
| `/` | Overview: getting started, credentials, guides |
| `/copyandpay`, `/copyandpay/return` | COPYandPAY guide; the return page is the widget's form action |
| `/server-to-server`, `/server-to-server/return` | Server-to-server guide; the return page is the `shopperResultUrl`, and inside the drawer or popup it messages the guide instead |
| `/checkout/{checkoutId}` | Checkout page running `paymentWidgets.js` |
| `POST /api/checkouts` | Creates a COPYandPAY checkout |
| `POST /api/payments` | Server-to-server payment (with your own test credentials when the body carries them) |
| `POST /api/payments/{id}` | Capture (CP) or refund (RF) of an earlier payment |
| `GET /api/status?resourcePath=…&entity=…` | Payment or checkout status |
| `POST /api/status` | Payment status with your own test credentials, which stay out of the URL |
| `/server-to-server-cards` | Server-to-server cards guide (card-on-file) |
| `POST /api/cards/payments` | Initial card payment with `createRegistration=true` (test cards and test host only) |
| `POST /api/cards/payments/{id}` | Capture (CP) of a card pre-authorization |
| `POST /api/cards/registrations/{id}/payments` | Repeated payment (MIT) over a registration |
| `GET /api/config` | Environment summary and payment method catalogue |
