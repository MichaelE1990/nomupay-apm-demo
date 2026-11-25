# Nomupay Payment Methods

A test bench for payment brands (APMs) and cards on the ACI/OPPWA gateway, in the Nomupay brand (Montserrat, navy #172147, blue #0190F7; logo paths from the Brand Guidelines). It's built to feel like a merchant integrating: every step shows the request on the right as you build it, sends it, shows the real response underneath, and the next step uses what came back.

## Guides

The sidebar has three sections of guides: **Alternative Payment Methods** (Nomupay PPRO Copy & Pay, Nomupay PPRO Server to Server APMs), **Bank Payment Methods** (Pay by Bank) and **Recurring Payments** (Nomupay Server to Server Recurring Payments).

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

**Pay by Bank** (`/open-banking`, in the sidebar's *Bank Payment Methods* section; it was called Open Banking until Token.io's design system asked for "Pay by Bank" everywhere)

Pay by Bank (Open Banking, delivered with Token.io), in one article (`src/components/PayByBankArticle.jsx`): what it is and how to set up an account, then the API integration. It was two pages, Get started and Integration, until there were few enough chapters for one; `/open-banking/integration` and its return page redirect here (`next.config.mjs`). The content comes from the Help Centre's [Open Banking](https://support.nomupay.com/hc/en-gb/sections/19215253523089-Open-Banking) section and the Pay by Bank merchant one-pager (nothing from the internal training one-pager):

- **What it is**: the title, then two columns: the intro on the left and a picture on the right (Pay by Bank at the top of a checkout's payment options, above card and PayPal, over a looping strip of UK banks' app icons; icons and logos cropped from Mikey's Canva boards into `public/images/pay-by-bank`). Then *Features* as a three-column spec sheet laid out like Adyen's payment method facts: category, countries, currencies, setup & integration, *Other* as a ticked list (refunds, Strong Customer Authentication, no chargebacks) and *Resources*, which opens Token.io's reference and assets (step 1 links to it). There's no *Up next* box: the footer's Previous and Next links do that job.
- **How it works, setup and integration**, after a rule: *Payment workflow* comes first: the intro on the left (how the payment runs, and why to get the final status before confirming the order) and the shopper's three steps on the right, as a tracker (select bank, authenticate, approve, each with its icon), then the sequence diagram with a Server to Server / Copy & Pay toggle (it's static, so the Playground doesn't change it, and its numbered requests link to the steps below). *Getting started* follows, written like Adyen's get-started pages: Pay by Bank has its own setup, then apply (sales send Token.io's due diligence questionnaire, which covers the business details and logo), choose settings (an *Account settings* button opens a modal: what comes from the application, and the preferences we set, such as default and destination countries; `src/components/PayByBankSettings.jsx`), get credentials, integrate. The Word settings form in `public/downloads` (built by `scripts/settings-form.cjs`) isn't linked from the site. *Integrate Pay by Bank* says the steps below are the API integration, on our test environment (set the amount, currency and bank country in the Playground), and links Pay by link merchants to the Help Centre's [Pay by Links](https://support.nomupay.com/hc/en-gb/articles/9409128173201-Pay-by-Links) guide. Then four numbered steps: 1. **Add Pay by Bank to checkout** (Token.io's design system, laid out like the steps: the intro, which points to *Reference and assets* for colours and other styles, and that button, which opens a modal with Token.io's PNG and SVG files, on the left; the code box on the right. The code box builds the Pay by Bank option for a checkout's list of payment options, with Preview and HTML tabs and a bottom bar holding the *Theme* picker (Token.io's bank icon mark or app icon mark, each with a mock-up from the Canva boards in `public/images/pay-by-bank`) and a *Customise* button. Customise opens one more row inside the box: *Icon placement* (left or right of the text) and two switches, *Badge* and *Context information*, each showing one example from Token.io's tips for driving adoption. The option's text always follows Token.io's spec in both the preview and the HTML: Inter (self-hosted for the preview, Google Fonts in the HTML), "Pay by" regular and "Bank" bold, with −3% letter spacing. The bank icon mark is rebuilt from Token.io's SVG files; bank app icons show as placeholder tiles in the preview and as `<img>` placeholders in the HTML, because Token.io's permission doesn't cover real ones), then 2. **Send the payment** (`POST /v1/payments` with `paymentBrand=ACI_INSTANTPAY`, `paymentType=DB`, `bankAccount.country`, `shopperResultUrl`), 3. **Send the shopper to their bank** (Token.io's page sets `frame-ancestors`, so it opens in a new window or redirects the whole page, never in the drawer), 4. **Get the payment status**, with what to do while it's pending (`000.200.000`, `000.200.001`), the suggested shopper message and the confirmation-time chart from the Help Centre. Each step's *Parameters* has a *Request* and a *Response* dropdown, both closed to start. The Playground sets the amount, currency and the bank's country.

The guide runs on the same entity as the recurring guide (`8ac7a4c7…15d4`, which has the Open Banking test channel) with the same access token. `OPEN_BANKING_ENTITY_ID` and `OPEN_BANKING_ACCESS_TOKEN` override them. In Token.io's sandbox some banks end the payment straight away and others open the bank's own sandbox login.

The Playground drawer on every guide has a close button in its header (Escape or a click outside also close it), and *Reset to defaults* and *Done* in its footer; changes are saved as you go.

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

The sidebar is organised like a help centre: the Guides category, its sections (Introduction; Alternative Payment Methods; Recurring Payments), the articles in each, and the open article's chapters under it. Breadcrumbs above each article show the same path.

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
| `OPEN_BANKING_ENTITY_ID`, `OPEN_BANKING_ACCESS_TOKEN` | No | Entity and token for the Pay by Bank guide. Default to the recurring guide's entity and token |
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
| `/open-banking`, `/open-banking/return` | Pay by Bank: features, payment workflow, getting started and the API integration; the return page is the `shopperResultUrl` from Token.io, and in a popup it messages the guide. `/open-banking/integration` (and its return page) redirect here |
| `/recurring-payments`, `/recurring-payments/return` | Recurring payments guide; the return page is the `shopperResultUrl` after 3-D Secure |
| `/checkout/{checkoutId}` | Checkout page running `paymentWidgets.js` |
| `POST /api/checkouts` | Creates a COPYandPAY checkout |
| `POST /api/payments` | Server-to-server payment (with your own test credentials when the body carries them) |
| `POST /api/payments/{id}` | Capture (CP) or refund (RF) of an earlier payment |
| `POST /api/recurring/payments` | Recurring initial payment (CIT) with `createRegistration=true`, on the card entity |
| `POST /api/recurring/registrations/{id}/payments` | Recurring subsequent payment (MIT) on a registration |
| `POST /api/recurring/card-payments` | Recurring subsequent payment (MIT) with the card details, for *Simulate a decline* |
| `POST /api/recurring/registrations/{id}` | Delete a registration (sent to the gateway as `DELETE /v1/registrations/{id}`) |
| `POST /api/open-banking/payments` | Pay by Bank payment on the Open Banking entity |
| `POST /api/open-banking/status` | Pay by Bank payment status (`{ id }`) |
| `GET /api/status?resourcePath=…&entity=…` | Payment or checkout status |
| `POST /api/status` | Payment status with your own test credentials, which stay out of the URL (`entity: card` for card payments) |
| `GET /api/config` | Environment summary and payment method catalogue |
