// Payment method catalogue: NomuPay Wallets brands (EU & international) and cards.
// Source: Payment Knowledge Base, "NomuPay Wallets Brand details" and
// "NomuPay Wallets integration sheet" (last updated 14 Oct 2026).
// Requirement codes follow the KB: M = mandatory, O = optional, C = conditional.

export const FIELD_DEFS = {
  "customer.givenName": { label: "Given name", sample: "Test" },
  "customer.surname": { label: "Surname", sample: "Shopper" },
  "customer.email": { label: "Email", sample: "test.shopper@example.com", type: "email" },
  "customer.mobile": {
    label: "Mobile",
    sample: "",
    hint: "International format, e.g. +34700000000. When sent, there is no redirect: the shopper approves in their app.",
  },
  "customer.merchantCustomerId": { label: "Merchant customer ID", sample: "cust-001" },
  "virtualAccount.accountId": {
    label: "MB WAY phone",
    sample: "",
    hint: "Format 351#912345678. Sent to the provider as the shopper's phone number.",
  },
  "billing.country": { label: "Billing country", type: "country" },
  "billing.street1": { label: "Street", sample: "" },
  "billing.houseNumber1": { label: "House number", sample: "" },
  "billing.postcode": { label: "Postcode", sample: "" },
  "billing.city": { label: "City", sample: "" },
  "bankAccount.iban": { label: "IBAN", sample: "DE23100000001234567890" },
  "bankAccount.holder": { label: "Account holder", sample: "Test Shopper" },
  "bankAccount.mandate.id": { label: "Mandate ID", sample: "", hint: "Send together with the signature date and mandate URL." },
  "bankAccount.mandate.dateOfSignature": { label: "Mandate signature date", sample: "", hint: "YYYY-MM-DD" },
  "customParameters[mandate_url]": { label: "Mandate URL", sample: "" },
  descriptor: { label: "Descriptor", sample: "", hint: "Up to 25 characters." },
  merchantInvoiceId: { label: "Merchant invoice ID", sample: "", hint: "8 to 100 characters: letters, digits, _ and -" },
};

const EU = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "ES", "SE"];

// fields: [key, requirement, sample override, hint override]
export const WALLET_BRANDS = [
  {
    code: "BCMC_VA", name: "Bancontact", region: "Europe", countries: ["BE"], currencies: ["EUR"], timeout: "1 hour", status: "Certified",
    fields: [["customer.givenName", "O"], ["descriptor", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "BIZUM", name: "Bizum", region: "Europe", countries: ["ES"], currencies: ["EUR"], timeout: "10 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["customer.mobile", "C"], ["merchantInvoiceId", "O"]],
    note: "Leave Mobile empty for the redirect flow. Send it for the in-app flow with no redirect.",
  },
  {
    code: "BLIK", name: "BLIK", region: "Europe", countries: ["PL"], currencies: ["PLN"], timeout: "3 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    note: "The shopper enters a 6-digit BLIK code on the redirect page and approves it in their banking app.",
  },
  {
    code: "EPS_VA", name: "EPS", region: "Europe", countries: ["AT"], currencies: ["EUR"], timeout: "1.5 hours", status: "Certified",
    fields: [["customer.givenName", "O"], ["descriptor", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "IDEAL_VA", name: "iDEAL", region: "Europe", countries: ["NL"], currencies: ["EUR"], timeout: "30 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "MBWAY", name: "MB WAY", region: "Europe", countries: ["PT"], currencies: ["EUR"], timeout: "6 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["virtualAccount.accountId", "O"], ["merchantInvoiceId", "O"]],
    note: "The shopper approves a push request in the MB WAY app, identified by their phone number.",
  },
  {
    code: "MULTIBANCO_VA", name: "Multibanco", region: "Europe", countries: ["PT"], currencies: ["EUR"], timeout: "7 days", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    note: "Voucher payment: the shopper gets an entity and reference to pay later, so the payment stays pending until paid or 7 days pass.",
  },
  {
    code: "PRZELEWY", name: "Przelewy24", region: "Europe", countries: ["PL"], currencies: ["PLN", "EUR"], timeout: "1.5 hours", status: "Certified",
    fields: [["customer.email", "M"], ["customer.givenName", "O"], ["descriptor", "O"], ["merchantInvoiceId", "O"]],
    note: "P24 doesn't accept sole traders: the merchant must be set up as a company.",
  },
  {
    code: "SWISH", name: "Swish", region: "Europe", countries: ["SE"], currencies: ["SEK"], timeout: "30 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["customer.mobile", "O", "", "International format, e.g. +46700000000. When sent, there is no redirect: the shopper approves in the Swish app."], ["merchantInvoiceId", "O"]],
    note: "Leave Mobile empty for the redirect flow (QR or app switch). Send it for the in-app flow with no redirect.",
  },
  {
    code: "TRUSTLY", name: "Trustly", region: "Europe", countries: ["DE", "AT", "DK", "EE", "ES", "FI", "GB", "LT", "LV", "NL", "NO", "SE"],
    currencies: ["EUR", "DKK", "GBP", "NOK", "SEK"], timeout: "7 days", status: "Certified",
    fields: [["customer.givenName", "M"], ["customer.email", "M"], ["customer.merchantCustomerId", "M"], ["merchantInvoiceId", "O"]],
    countryRequirement: "M",
  },
  {
    code: "TWINT", name: "Twint", region: "Europe", countries: ["CH"], currencies: ["CHF"], timeout: "30 minutes", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "WERO", name: "Wero", region: "Europe", countries: ["DE", "BE", "FR"], currencies: ["EUR"], timeout: "1 hour", status: "Certification",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    countryRequirement: "M",
  },
  {
    code: "SATISPAY", name: "Satispay", region: "Europe", countries: ["IT", ...EU.filter((c) => c !== "IT"), "IS", "LI", "NO", "CH", "GB"],
    currencies: ["EUR"], timeout: "2.5 hours", status: "Certified",
    fields: [["customer.givenName", "O"], ["customer.email", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "PAYU", name: "PayU", region: "Europe", countries: ["PL", "CZ"], currencies: ["PLN", "CZK"], timeout: "2 hours", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    countryRequirement: "M",
  },
  {
    code: "DIRECTDEBIT_SEPA", name: "SEPA Direct Debit", region: "Europe", countries: ["DE", ...EU.filter((c) => c !== "DE"), "IS", "LI", "NO", "CH", "GB"],
    currencies: ["EUR"], timeout: "1.5 hours", status: "Certification", paymentMethod: "DD",
    fields: [
      ["customer.email", "M"], ["customer.givenName", "O"], ["bankAccount.iban", "M"], ["bankAccount.holder", "M"],
      ["bankAccount.mandate.id", "C"], ["bankAccount.mandate.dateOfSignature", "C"], ["customParameters[mandate_url]", "C"],
      ["billing.street1", "C"], ["billing.houseNumber1", "C"], ["billing.postcode", "C"], ["billing.city", "C"],
      ["descriptor", "O"], ["merchantInvoiceId", "O"],
    ],
    note: "Send the three mandate fields together for the sync flow, or leave them empty for the async flow. Billing address is needed for some non-EU bank accounts.",
  },
  {
    code: "PAYPAL", name: "PayPal", region: "International",
    countries: ["GB", "DE", "FR", "NL", "BE", "ES", "IT", "AT", "IE", "PL", "SE", "DK", "NO", "CH", "US", "CA", "AU", "NZ"],
    currencies: ["EUR", "GBP", "USD", "AUD", "BRL", "CAD", "CHF", "CZK", "DKK", "HKD", "HUF", "JPY", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN", "SEK", "SGD", "THB", "TWD"],
    timeout: "74 hours", status: "Certification",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    countryRequirement: "M",
  },
  {
    code: "PAYSAFECARD", name: "Paysafecard", region: "International",
    countries: ["DE", "AT", "AU", "BE", "BG", "CA", "HR", "CY", "CZ", "DK", "FI", "FR", "GE", "HU", "IE", "IT", "GI", "GR", "LI", "LT", "LU", "MT", "MX", "NZ", "NO", "PE", "PL", "PT", "SI", "SK", "ES", "SE", "CH", "RO", "GB", "UY"],
    currencies: ["EUR", "AUD", "CAD", "CHF", "GBP", "NOK", "PLN", "RON", "SEK", "USD"], timeout: "2.5 hours", status: "Certified",
    fields: [["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
    countryRequirement: "M",
  },
  {
    code: "CLEARPAY", name: "Clearpay (Afterpay UK)", region: "International", countries: ["GB"], currencies: ["GBP"], timeout: "4.5 hours", status: "Certified",
    fields: [["customer.email", "M"], ["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
  },
  {
    code: "AFTERPAY_PACIFIC", name: "Afterpay (US)", region: "International", countries: ["US"], currencies: ["USD"], timeout: "4.5 hours", status: "Certified",
    fields: [["customer.email", "M"], ["customer.givenName", "O"], ["merchantInvoiceId", "O"]],
  },
];

// Cards run through the COPYandPAY widget only, on the card entity
export const CARD_BRANDS = [
  { code: "VISA", name: "Visa", region: "Cards", countries: [], currencies: ["EUR", "GBP", "USD", "SEK", "DKK", "NOK", "PLN", "CHF", "CZK"], timeout: "", status: "Card", fields: [] },
  { code: "MASTER", name: "Mastercard", region: "Cards", countries: [], currencies: ["EUR", "GBP", "USD", "SEK", "DKK", "NOK", "PLN", "CHF", "CZK"], timeout: "", status: "Card", fields: [] },
  { code: "AMEX", name: "American Express", region: "Cards", countries: [], currencies: ["EUR", "GBP", "USD"], timeout: "", status: "Card", fields: [] },
]

function finalise(b, type) {
  return {
    ...b,
    type,
    paymentMethod: b.paymentMethod || (type === "card" ? "CC" : "VA"),
    countryRequirement: b.countryRequirement || "O",
    fields: b.fields.map(([key, req, sample, hint]) => {
      const def = FIELD_DEFS[key]
      return { key, req, label: def.label, type: def.type || "text", hint: hint !== undefined ? hint : def.hint || "", sample: sample !== undefined ? sample : def.sample }
    }),
  }
}

export const BRANDS = [...WALLET_BRANDS.map((b) => finalise(b, "wallet")), ...CARD_BRANDS.map((b) => finalise(b, "card"))]
const BRAND_MAP = Object.fromEntries(BRANDS.map((b) => [b.code, b]))
export const getBrand = (code) => BRAND_MAP[String(code || "").toUpperCase()] || null
export const isCard = (code) => getBrand(code)?.type === "card"
