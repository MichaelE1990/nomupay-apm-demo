// Shared helpers for the NomuPay APM Demo pages
(function () {
  const SUCCESS = /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)/;
  const PENDING = /^(000\.200|800\.400\.5|100\.400\.500)/;

  function classify(code) {
    if (SUCCESS.test(code || "")) return "success";
    if (PENDING.test(code || "")) return "pending";
    return "failed";
  }

  const STATUS_PILL = {
    success: ["ok", "Successful"],
    pending: ["warn", "Pending"],
    failed: ["bad", "Failed"],
  };

  // What a result code means for someone testing an APM
  const CODE_HINTS = [
    [/^000\.000\.|^000\.100\.1/, "The payment succeeded."],
    [/^000\.200\.001/, "Waiting for a non-instant payment, such as a Multibanco voucher. It stays pending until the shopper pays or the brand's timeout passes."],
    [/^000\.200/, "Pending. The shopper still has to complete the payment: send them to the redirect URL if one came back, or wait for them to approve it in their app. This is not a failure."],
    [/^100\.396\.101/, "Cancelled by the shopper on the payment page."],
    [/^100\.396\.103/, "The pending payment timed out. The shopper didn't complete it within the brand's window."],
    [/^800\.100\.152/, "Declined by the processor. If it happens instantly, check the brand is activated for this merchant at PPRO."],
    [/^800\.100\.156/, "Declined because of a format error in the request."],
    [/^600\.200\.500/, "The gateway isn't configured for this brand, currency or country on this entity. Check the merchant account setup."],
    [/^200\.300\.404/, "Invalid or missing parameter. Check ConnectorErrorField and ConnectorErrorFieldDetails in the response."],
    [/^900\.100\.200/, "Error response from the connector or acquirer."],
    [/^800\.900\.300|^800\.900\.301/, "Authentication or authorisation failed. Check the entity ID and access token."],
  ];

  function codeHint(code) {
    for (const [re, text] of CODE_HINTS) if (re.test(code || "")) return text;
    const s = classify(code);
    if (s === "success") return "The payment succeeded.";
    if (s === "pending") return "Pending: the payment isn't final yet.";
    return "The request was rejected or the payment failed. See the description and connector details.";
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function statusPill(status, label) {
    const [cls, text] = STATUS_PILL[status] || ["", status];
    return `<span class="pill ${cls}"><span class="dot"></span>${esc(label || text)}</span>`;
  }

  // Redirect the shopper exactly as the gateway asked: GET with query params, or POST a form
  function redirectShopper(redirect) {
    if (!redirect || !redirect.url) return;
    const params = Array.isArray(redirect.parameters) ? redirect.parameters : [];
    const method = String(redirect.method || (params.length ? "POST" : "GET")).toUpperCase();
    if (method === "GET") {
      const url = new URL(redirect.url);
      params.forEach((p) => url.searchParams.append(p.name, p.value));
      window.location.href = url.toString();
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = redirect.url;
    params.forEach((p) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = p.name;
      input.value = p.value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  // Recent test payments, kept in this browser only
  const STORE_KEY = "nomupayApmDemo.payments.v1";
  function loadPayments() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function savePayments(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 40)));
    } catch {}
  }
  function upsertPayment(rec) {
    const list = loadPayments();
    const i = list.findIndex((p) => (rec.mtid && p.mtid === rec.mtid) || (rec.id && p.id === rec.id));
    if (i >= 0) list[i] = { ...list[i], ...rec };
    else list.unshift(rec);
    savePayments(list);
  }
  function findPayment(mtid) {
    return loadPayments().find((p) => p.mtid === mtid) || null;
  }

  function fmtTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  window.APM = { classify, codeHint, esc, statusPill, redirectShopper, loadPayments, upsertPayment, findPayment, fmtTime };
})();
