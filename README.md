# Nomupay Payment Methods

A test bench for payment brands (APMs) and cards on the ACI/OPPWA gateway, in the Nomupay brand (Montserrat, navy #172147, blue #0190F7; logo paths from the Brand Guidelines). It's built to feel like a merchant integrating: every step shows the request on the right as you build it, sends it, shows the real response underneath, and the next step uses what came back.

## Guides

The sidebar has three sections of guides: **Alternative Payment Methods** (Nomupay PPRO Copy & Pay, Nomupay PPRO Server to Server APMs), **Recurring Payments** (Nomupay Server to Server Recurring Payments) and **AFT** (Server to Server).

**Nomupay PPRO Copy & Pay** (`/copyandpay`)

1. **Prepare the checkout**: `POST /v1/checkouts`. Choose any mix of payment brands and cards in the multi-select, set the amount, and add extras:
   - *Customer & billing details* adds `customer.*`, `billing.*` and `shipping.*`
   - *Cart items* adds `cart.items[n].*` and makes the amount the cart total
2. **Render the payment form**: the HTML for `paymentWidgets.js` with the real `checkoutId`, `integrity` and `data-brands`, and a checkout page that runs it.
3. **Get the payment result**: `GET /v1/checkouts/{id}/payment`, read automatically when the shopper comes back.

**Nomupay PPRO Server to Server APMs** (`/server-to-server`)

*Payment workflow* comes first: an overview, then *Transaction flow model*, a sequence diagram of the requests between the shopper, the merchant server, the payment gateway and the payment brand (the numbered requests link to the steps), then *Use cases* with two cards for the payment flow (Asynchronous, or Synchronous for Bizum and Swish with the shopper's mobile number). The chosen card opens a tray with its transaction flows (Debit, or Pre-authorization + Capture for PayPay; synchronous offers Debit only). The steps follow the server-to-server guide on docs.oppwa.com.

Every step is laid out like an API reference: *Properties* (method and endpoint, base URL, content type), *Path parameters* where the URL takes the payment `id`, *Body parameters* in two collapsible groups (Basic payment and Testing), and *Response* with the response parameters. Each parameter shows its format and pattern from the [parameters reference](https://nomupay.docs.oppwa.com/reference/parameters) (e.g. `amount` N10.N2 `[0-9]{1,10}(\.[0-9]{2})?`), the requirement, the description and an example (the current value when there is one). Objects such as `result`, `resultDetails` and `redirect` open their child parameters.

Request panels have cURL and JavaScript (Node.js fetch) tabs, kept in step across the page, with the request laid out like docs.oppwa.com (the URL, each parameter as `-d`, then the header). The **Playground** tab opens a settings drawer that holds everything the requests are built from: your own test credentials (entityId and access token, kept in this browser tab only and sent only to the test system), the use case, payment brand, currency and amount, the brand's own fields from the KB fields mapping, the cart, the capture and refund amounts, and test mode. Under each response, a note gives the result and the next step.

1. **Perform debit payment** / **Pre-authorize payment**: `POST /v1/payments`. The page stays on this step so the response can be read.
2. **Redirect shopper** (asynchronous only): the `redirect` object as a JS snippet. The payment page opens in a drawer, or a new window. The shopper returns to the production domain (deployment URLs are behind Vercel's login, which can't load inside the frame), and that page tells the demo, which closes the drawer and marks the redirect complete under the snippet; the page stays on step 2. The demo never requests the status by itself: the merchant sends it in step 3. The shopperResultUrl and entityId on screen are placeholders; the real values are added on the server.
3. **Get the payment status**: `GET /v1/payments/{id}`, sent with *Send request*; once there's a reply, *Check status* sends it again for a pending payment. The response parameters come from the OPPWA Payment Response Parameters and the Wallets integration sheet's Response field mapping (ConnectorTxID1-3 and the other `resultDetails`). The gateway allows two status requests a minute per payment (more get `800.120.100`), so the demo counts them and waits rather than going over.
4. **Capture the payment** (pre-authorization only): `POST /v1/payments/{id}` with `paymentType=CP`.
5. **Manage the payment** (optional): a full or partial refund, `paymentType=RF`, for brands that allow refunds. Capture and refund send the same `testMode` as the payment, or the gateway answers `700.100.600`. Refunds come back pending (`000.200.001`) while the brand processes them.

**Nomupay Server to Server Recurring Payments** (`/recurring-payments`)

Card on file with cards (Visa, Mastercard) on the test system's 3-D Secure 2 card channel (Demo Channel - 3DV2, entity `8ac7a4c781a732090181aaf9f6fc15d4`, or `RECURRING_ENTITY_ID`), with the demo's access token: the Playground has no credentials or base URL. Following the Card on File and Server-to-Server Registration Tokens guides on docs.oppwa.com. *Recurring workflow* explains the two phases (initial CIT, subsequent MIT), with a sequence diagram (shopper, merchant server, payment gateway, card issuer) and *Use cases*: Scheduled payments (Subscription `RECURRING`, Installments `INSTALLMENT`) or Unscheduled card on file (`UNSCHEDULED`).

1. **Send the initial payment**: `POST /v1/payments` with the card, `standingInstruction.mode=INITIAL`, `source=CIT`, the agreement type (plus `recurringType`, `frequency`, `expiry`, `numberOfInstallments` where they apply) and `createRegistration=true`. Customer, billing and the browser data for 3-D Secure 2 (`customer.ip`, `customer.browser.*`) are sent by default. Test cards include 3-D Secure frictionless and challenge cards, and the 3DS simulator's `customParameters[3DS2_flow]` / `[3DS2_enrolled]` can be set in the Playground.
2. **Authenticate the shopper**: only when step 1 is pending with a redirect; the issuer's page opens in the drawer and returns to `/recurring-payments/return`.
3. **Get the payment status**: `GET /v1/payments/{id}` on the recurring entity; it carries the `registrationId`.
4. **Send a subsequent payment**: `POST /v1/registrations/{id}/payments` with `standingInstruction.mode=REPEATED`, `source=MIT`. The amount can be changed inline. *Simulate a decline* sends the payment with the card details instead (`POST /v1/payments`, REPEATED MIT) with a rejection code as `card.holder` and `testMode=EXTERNAL`. Every subsequent payment is listed in a table with the route, `card.holder`, `testMode` and the result.
5. **Delete the registration** (optional): `DELETE /v1/registrations/{id}`; a payment on it afterwards is rejected with `100.150.202`. Updating a stored card (`POST /v1/registrations/{id}`) returns 404 on the test system.

Negative testing (the Help Centre's Negative Testing Integration Sheet) as found on the 3DV2 channel:

- It only runs with `testMode=EXTERNAL` (the acquirer simulator). Without `testMode`, or with `INTERNAL`, payments run in Integrator Test Mode and are approved.
- The simulator reads the holder of the card charged. On a registration that's the holder stored with the initial payment: a `card.holder` in the request is ignored, and a stored card can't be changed.
- So to decline payments on a registration, send the initial payment with a rejection code as `card.holder` and `testMode=EXTERNAL` (the Playground's Testing section sets this up). The initial payment declines with the code after 3-D Secure, but the card is still stored, and every payment on the registration with `testMode=EXTERNAL` declines with it. Step 4 is enabled once the initial payment has a result, approved or declined.

Card details are only accepted when `API_HOST` is a test host, and the card number and CVV are masked in what the demo echoes back.

**AFT Server to Server** (`/aft/server-to-server`)

Account Funding Transactions with cards (Visa, Mastercard) on the same 3-D Secure 2 card channel as the recurring guide (or `AFT_ENTITY_ID`), with the demo's access token. The parameters, formats and requirements follow the Help Centre's [6211 - Security Brokers/Dealers](https://support.nomupay.com/hc/en-gb/articles/34020652253329-6211-Security-Brokers-Dealers) article, the current parameter reference for every MCC, with `customParameters[FundsTransferType]` in place of `transactionBai`. *AFT workflow* explains what an AFT is, with a sequence diagram (shopper, merchant server, payment gateway, card issuer) and *Use cases*: one card per MCC (6211, 6540, 6051, 4829, 6012), whose tray lists the Funds Transfer Types that MCC can send, tagged with the Visa BAI and Mastercard TTI each maps to. A table under the cards shows the same per MCC, with *Not allowed* where a scheme doesn't allow the type.

Which Funds Transfer Type each MCC can send on each scheme comes from Nomupay's mapping (Nov 2026), kept in `src/lib/aft.js` (`FUNDS_TRANSFER_TYPES`):

| FundsTransferType | Visa BAI | Visa MCCs | Mastercard TTI | Mastercard MCCs |
|---|---|---|---|---|
| `purchase_crypto` | LA | 6051 | P70 | 6051 |
| `purchase_high_risk_securities` | LA | 6211 | P71 | 6211 |
| `purchase_liquid_assets` | LA | 6012, 6051, 6211 | F52 | 6211, 4829 |
| `wallet_crypto` | LA | 6051 | F52 | 6051 |
| `wallet_high_risk_securities` | LA | 6211 | F52 | 6211 |
| `wallet_liquid_assets` | LA | 6012, 6051, 6211 | F52 | 6211, 4829 |
| `wallet_stored_value` | FT | 4829, 6012, 6540, 6211 (or high brand risk) | F52 | 4829 |
| `wallet_staged` | WT | 6051 (or high brand risk, gambling) | F61 | 6540 |
| `own_account` | AA | 4829, 6012, 6211 | F52 | 4829 |
| `own_prepaid_card` | TU | 6012, 6051, 6540 | F64 | 4829 |

Choosing a type that only one scheme allows switches the card brand (and the test card) to that scheme, and the server rejects a type the MCC doesn't allow on the card's scheme.

1. **Send the AFT payment**: `POST /v1/payments` with the card, `merchantTransactionId` (mandatory), `transactionProcessingCode=FUNDING`, `customParameters[FundsTransferType]`, `customParameters[isDirectPurchase]` (set from the type: true for `purchase_` types, false for the others, and changeable), `transactionPurposeCode` (`HIGHRISKSEC` for 6211; required for Mastercard, and only enforced where the Help Centre documents the value), the sender (`sender.accountNumberType=CARD_ACCOUNT`, names, address, 2-letter country, and `sender.birthDate` when the card was issued abroad) and the recipient (the shopper, the same person as the sender, or the business name with no surname; `recipient.accountNumberType=WALLET_ID` and `recipient.accountNumber`). Customer, billing and the 3-D Secure browser data are sent too.
2. **Authenticate the shopper**: only when step 1 is pending with a redirect; returns to `/aft/server-to-server/return`.
3. **Get the payment status**: `GET /v1/payments/{id}` on the AFT entity.
4. **Capture the payment** (pre-authorization only): `POST /v1/payments/{id}` with `paymentType=CP` and the pre-authorization's `testMode`.

On the test system the payment runs in Integrator Test Mode: the gateway checks the AFT parameters' format (an invalid value comes back as `200.300.404` with `parameterErrors`), but the test channel has no MCC, so the demo does the MCC check. The response echoes `customParameters` and `recipient`, not the sender.

The sidebar is organised like a help centre: the Guides category, its sections (Introduction; Alternative Payment Methods; Recurring Payments; AFT), the articles in each, and the open article's chapters under it. Breadcrumbs above each article show the same path.

The introduction covers getting started and credentials (entityId and the access token as a Bearer header, from the Credentials section of the Nomupay Dashboard), and links to both guides.

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
| `AFT_ENTITY_ID`, `AFT_ACCESS_TOKEN` | No | Entity and token for the AFT guide. Fall back to the recurring guide's 3DV2 card channel and token |
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
| `/recurring-payments`, `/recurring-payments/return` | Recurring payments guide; the return page is the `shopperResultUrl` after 3-D Secure |
| `/aft/server-to-server`, `/aft/server-to-server/return` | AFT guide; the return page is the `shopperResultUrl` after 3-D Secure |
| `/checkout/{checkoutId}` | Checkout page running `paymentWidgets.js` |
| `POST /api/checkouts` | Creates a COPYandPAY checkout |
| `POST /api/payments` | Server-to-server payment (with your own test credentials when the body carries them) |
| `POST /api/payments/{id}` | Capture (CP) or refund (RF) of an earlier payment |
| `POST /api/recurring/payments` | Recurring initial payment (CIT) with `createRegistration=true`, on the card entity |
| `POST /api/recurring/registrations/{id}/payments` | Recurring subsequent payment (MIT) on a registration |
| `POST /api/recurring/card-payments` | Recurring subsequent payment (MIT) with the card details, for *Simulate a decline* |
| `POST /api/recurring/registrations/{id}` | Delete a registration (sent to the gateway as `DELETE /v1/registrations/{id}`) |
| `POST /api/aft/payments` | AFT payment, on the AFT entity |
| `POST /api/aft/payments/{id}` | Capture (CP) of a pre-authorized AFT |
| `GET /api/status?resourcePath=…&entity=…` | Payment or checkout status |
| `POST /api/status` | Payment status with your own test credentials, which stay out of the URL (`entity: card` for card payments, `recurring` or `aft` for those guides) |
| `GET /api/config` | Environment summary and payment method catalogue |
