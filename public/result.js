(function () {
  const { esc, statusPill, codeHint, classify, upsertPayment, findPayment } = window.APM;
  const $ = (id) => document.getElementById(id);

  // /result/{s2s|widget|lookup}/{BRAND}/{merchantTransactionId}
  const parts = location.pathname.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  const [flow = "lookup", brandCode = "", mtid = ""] = parts;
  const q = new URLSearchParams(location.search);
  const stored = mtid ? findPayment(mtid) : null;
  if (brandCode) $("backLink").href = `/#${encodeURIComponent(brandCode)}`;

  let brands = [];
  fetch("/api/config").then((r) => r.json()).then((c) => (brands = c.brands || [])).catch(() => {});

  function statusQuery() {
    const resourcePath = q.get("resourcePath");
    if (resourcePath) return `resourcePath=${encodeURIComponent(resourcePath)}`;
    // On the widget flow, "id" is the checkout ID, so only resourcePath works there
    if (flow !== "widget" && q.get("id")) return `id=${encodeURIComponent(q.get("id"))}`;
    if (stored && stored.id) return `id=${encodeURIComponent(stored.id)}`;
    if (stored && stored.resourcePath) return `resourcePath=${encodeURIComponent(stored.resourcePath)}`;
    return null;
  }

  async function check() {
    const query = statusQuery();
    $("recheck").disabled = true;
    if (!query) {
      $("bigStatus").innerHTML = statusPill("failed", "No payment reference");
      $("body").innerHTML = `<p>This page needs a payment ID or a resourcePath, and none came back from the redirect or was saved in this browser. Look the payment up by ID from the <a href="/">demo home page</a>.</p>`;
      return;
    }
    try {
      const res = await fetch(`/api/status?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      render(data);
    } catch (err) {
      $("bigStatus").innerHTML = statusPill("failed", "Status check failed");
      $("body").innerHTML = `<div class="banner bad"><strong>Couldn't get the status</strong><span>${esc(err.message)}</span></div>`;
    } finally {
      $("recheck").disabled = false;
    }
  }

  function render(data) {
    const r = data.response || {};
    const rd = r.resultDetails || {};
    const code = r.result?.code;
    const status = classify(code);
    const code2 = r.paymentBrand || brandCode;
    const b = brands.find((x) => x.code === code2);
    $("bigStatus").innerHTML = `${statusPill(status)}<h2>${esc(b ? b.name : code2 || "Payment")}</h2>`;

    const rows = [
      ["Result code", code ? `<span class="mono">${esc(code)}</span>` : "—"],
      ["Description", esc(r.result?.description || "—")],
      ["What it means", esc(codeHint(code))],
      ["Payment ID", r.id ? `<span class="mono">${esc(r.id)}</span>` : "—"],
      ["Amount", r.amount ? `${esc(r.amount)} ${esc(r.currency || "")}` : null],
      ["Payment brand", r.paymentBrand ? `<span class="mono">${esc(r.paymentBrand)}</span>` : null],
      ["Merchant transaction ID", r.merchantTransactionId ? `<span class="mono">${esc(r.merchantTransactionId)}</span>` : mtid && mtid !== "checkout" ? `<span class="mono">${esc(mtid)}</span>` : null],
      ["ExtendedDescription", rd.ExtendedDescription ? esc(rd.ExtendedDescription) : null],
      ["ConnectorReasonCode", rd.ConnectorReasonCode ? `<span class="mono">${esc(rd.ConnectorReasonCode)}</span>` : null],
      ["AcquirerResponse", rd.AcquirerResponse ? esc(rd.AcquirerResponse) : null],
      ["ConnectorTxID3 (PPRO payment)", rd.ConnectorTxID3 ? `<span class="mono">${esc(rd.ConnectorTxID3)}</span>` : null],
      ["Gateway timestamp", r.timestamp ? `<span class="mono">${esc(r.timestamp)}</span>` : null],
    ].filter(([, v]) => v);

    const pendingNote =
      status === "pending"
        ? `<div class="nextstep"><h3>Not final yet</h3><p>The shopper hasn't completed the payment, or the provider hasn't confirmed it yet.${b ? ` ${esc(b.name)} times out after ${esc(b.timeout)}.` : ""} Use Check again to read the latest status. In a live integration the final status also arrives by webhook.</p></div>`
        : "";

    $("body").innerHTML = `
      <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>
      ${pendingNote}
      <details><summary>Status request</summary><pre class="block">${esc(`${data.request.method} ${data.request.path}?entityId=…`)}</pre></details>
      <details><summary>Full response</summary><pre class="block">${esc(JSON.stringify(r, null, 2))}</pre></details>`;

    if (mtid || r.id) {
      upsertPayment({
        mtid: mtid && mtid !== "checkout" ? mtid : r.merchantTransactionId || r.id,
        id: r.id,
        resourcePath: q.get("resourcePath") || undefined,
        brand: r.paymentBrand || brandCode,
        brandName: b ? b.name : undefined,
        amount: r.amount,
        currency: r.currency,
        status,
        code,
        ...(stored ? {} : { flow: flow === "widget" ? "widget" : "s2s", createdAt: new Date().toISOString() }),
      });
    }
  }

  $("recheck").addEventListener("click", check);
  check();
})();
