(function () {
  const { esc, statusPill, codeHint, classify, redirectShopper, loadPayments, upsertPayment, fmtTime } = window.APM;
  const $ = (id) => document.getElementById(id);

  const COUNTRY = new Intl.DisplayNames(undefined, { type: "region" });
  const countryName = (c) => {
    try { return COUNTRY.of(c) || c; } catch { return c; }
  };

  let config = null;
  let brand = null;
  let region = "all";
  let lastResponse = null;

  // ---------------------------------------------------------------- setup
  fetch("/api/config")
    .then((r) => r.json())
    .then((cfg) => {
      config = cfg;
      renderEnv();
      renderBrands();
      const fromHash = decodeURIComponent(location.hash.slice(1)).toUpperCase();
      selectBrand(cfg.brands.find((b) => b.code === fromHash) ? fromHash : cfg.brands[0].code, false);
      renderRecent();
    })
    .catch(() => {
      $("envbar").innerHTML = statusPill("failed", "Could not load configuration");
    });

  function renderEnv() {
    const pills = [];
    pills.push(config.environment === "TEST" ? `<span class="pill info"><span class="dot"></span>TEST</span>` : statusPill("failed", "LIVE"));
    pills.push(`<span class="pill mono">${esc(config.apiHost)}</span>`);
    pills.push(config.configured ? `<span class="pill mono">entity ${esc(config.entityId)}</span>` : statusPill("pending", "Credentials missing"));
    if (config.testMode) pills.push(`<span class="pill mono">testMode=${esc(config.testMode)}</span>`);
    $("envbar").innerHTML = pills.join("");
    $("setupBanner").hidden = config.configured;
    $("liveBanner").hidden = config.environment === "TEST";
  }

  // ---------------------------------------------------------------- catalogue
  function renderBrands() {
    const q = $("search").value.trim().toLowerCase();
    const rows = config.brands.filter((b) => {
      if (region !== "all" && b.region !== region) return false;
      if (!q) return true;
      const hay = [b.name, b.code, ...b.countries, ...b.countries.map(countryName), ...b.currencies].join(" ").toLowerCase();
      return hay.includes(q);
    });
    $("brandRows").innerHTML = rows.length
      ? rows
          .map((b) => {
            const shown = b.countries.slice(0, 2).map(countryName).join(", ");
            const more = b.countries.length > 2 ? ` <span class="muted">+${b.countries.length - 2}</span>` : "";
            const st = b.status === "Certified" ? statusPill("success", "Certified") : statusPill("pending", "In certification");
            return `<tr class="brand-row" tabindex="0" data-code="${esc(b.code)}" aria-selected="${brand && brand.code === b.code}">
              <td><span class="bname">${esc(b.name)}</span><span class="bcode">${esc(b.code)}</span></td>
              <td>${esc(shown)}${more}</td>
              <td class="mono" style="font-size:12.5px">${esc(b.currencies.slice(0, 3).join(", "))}${b.currencies.length > 3 ? ` <span class="muted">+${b.currencies.length - 3}</span>` : ""}</td>
              <td class="nowrap">${esc(b.timeout)}</td>
              <td>${st}</td></tr>`;
          })
          .join("")
      : `<tr><td colspan="5" class="empty">No payment methods match.</td></tr>`;
  }

  $("brandRows").addEventListener("click", (e) => {
    const row = e.target.closest(".brand-row");
    if (row) selectBrand(row.dataset.code, true);
  });
  $("brandRows").addEventListener("keydown", (e) => {
    const row = e.target.closest(".brand-row");
    if (row && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      selectBrand(row.dataset.code, true);
    }
  });
  $("search").addEventListener("input", renderBrands);
  document.querySelectorAll("[data-region]").forEach((btn) =>
    btn.addEventListener("click", () => {
      region = btn.dataset.region;
      document.querySelectorAll("[data-region]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderBrands();
    })
  );

  // ---------------------------------------------------------------- tester form
  function selectBrand(code, updateHash) {
    brand = config.brands.find((b) => b.code === code);
    if (!brand) return;
    if (updateHash) history.replaceState(null, "", `#${brand.code}`);
    document.querySelectorAll(".brand-row").forEach((r) => r.setAttribute("aria-selected", String(r.dataset.code === code)));

    $("brandTitle").textContent = brand.name;
    $("brandMeta").innerHTML = [
      `<span class="pill mono">${esc(brand.code)}</span>`,
      `<span class="pill">${esc(brand.region)}</span>`,
      `<span class="pill">Method ${esc(brand.paymentMethod)}</span>`,
      `<span class="pill">Timeout ${esc(brand.timeout)}</span>`,
      brand.status === "Certified" ? statusPill("success", "Certified") : statusPill("pending", "In certification"),
    ].join("");
    $("brandNote").hidden = !brand.note;
    $("brandNote").textContent = brand.note || "";

    const fields = [];
    fields.push(fieldHtml({ key: "amount", label: "Amount", req: "M", value: "10.00" }));
    fields.push(selectHtml("currency", "Currency", "M", brand.currencies.map((c) => [c, c])));
    fields.push(
      selectHtml("billing.country", "Billing country", brand.countryRequirement,
        [...(brand.countryRequirement === "M" ? [] : [["", "Don't send"]]), ...brand.countries.map((c) => [c, `${c} · ${countryName(c)}`])],
        brand.countries[0])
    );
    for (const f of brand.fields) fields.push(fieldHtml({ key: f.key, label: f.label, req: f.req, value: f.sample, hint: f.hint, type: f.type }));
    fields.push(fieldHtml({ key: "merchantTransactionId", label: "Merchant transaction ID", req: "O", value: "", placeholder: "Generated if empty" }));
    $("fields").innerHTML = fields.join("");
    $("submitBtn").disabled = !config.configured;
    updateFlowHint();
    updatePreview();
  }

  function fieldHtml({ key, label, req, value = "", hint = "", type = "text", placeholder = "" }) {
    const id = `f_${key.replace(/[^\w]/g, "_")}`;
    return `<div class="field" data-key="${esc(key)}" data-req="${esc(req)}">
      <label for="${id}">${esc(label)} <span class="req ${esc(req)}" title="${req === "M" ? "Mandatory" : req === "C" ? "Conditional" : "Optional"}">${esc(req)}</span> <span class="key">${esc(key)}</span></label>
      <input id="${id}" name="${esc(key)}" type="${type === "email" ? "email" : "text"}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ""}
    </div>`;
  }

  function selectHtml(key, label, req, options, selected) {
    const id = `f_${key.replace(/[^\w]/g, "_")}`;
    return `<div class="field" data-key="${esc(key)}" data-req="${esc(req)}">
      <label for="${id}">${esc(label)} <span class="req ${esc(req)}">${esc(req)}</span> <span class="key">${esc(key)}</span></label>
      <select id="${id}" name="${esc(key)}">${options
        .map(([v, t]) => `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(t)}</option>`)
        .join("")}</select>
    </div>`;
  }

  const flow = () => document.querySelector('input[name="flow"]:checked').value;

  function updateFlowHint() {
    $("flowHint").textContent =
      flow() === "s2s"
        ? "POST /v1/payments with paymentBrand. A pending result comes back with a redirect URL you send the shopper to."
        : "POST /v1/checkouts, then the COPYandPAY widget renders this brand and handles the redirect.";
    $("submitBtn").textContent = flow() === "s2s" ? "Send to /v1/payments" : "Create checkout and open widget";
  }

  function readForm() {
    const values = {};
    document.querySelectorAll("#fields [name]").forEach((el) => (values[el.name] = el.value.trim()));
    const { amount, currency, merchantTransactionId, ...fields } = values;
    return { amount, currency, merchantTransactionId, fields };
  }

  function missingMandatory() {
    const missing = [];
    document.querySelectorAll("#fields .field").forEach((f) => {
      const el = f.querySelector("[name]");
      const miss = f.dataset.req === "M" && !el.value.trim();
      f.classList.toggle("missing", miss);
      if (miss) missing.push(f.dataset.key);
    });
    return missing;
  }

  function updatePreview() {
    if (!brand) return;
    const v = readForm();
    const lines = [`POST https://${config.apiHost}${flow() === "s2s" ? "/v1/payments" : "/v1/checkouts"}`, "", `entityId=${config.entityId || "<ENTITY_ID>"}`, `amount=${v.amount}`, `currency=${v.currency}`];
    if (flow() === "s2s") lines.push(`paymentBrand=${brand.code}`);
    lines.push("paymentType=DB");
    if (config.testMode) lines.push(`testMode=${config.testMode}`);
    for (const [k, val] of Object.entries(v.fields)) if (val) lines.push(`${k}=${val}`);
    lines.push(`merchantTransactionId=${v.merchantTransactionId || "<generated>"}`);
    if (flow() === "s2s") lines.push(`shopperResultUrl=${location.origin}/result/s2s/${brand.code}/<merchantTransactionId>`);
    else lines.push("integrity=true");
    $("preview").textContent = lines.join("\n");
    const missing = missingMandatory();
    $("formWarn").hidden = !missing.length;
    $("formWarn").textContent = missing.length ? `Missing mandatory: ${missing.join(", ")}. You can still send it to see the gateway's response.` : "";
  }

  $("payForm").addEventListener("input", updatePreview);
  $("payForm").addEventListener("change", (e) => {
    if (e.target.name === "flow") updateFlowHint();
    updatePreview();
  });

  $("payForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!brand || !config.configured) return;
    const btn = $("submitBtn");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    const body = { brand: brand.code, ...readForm() };
    const endpoint = flow() === "s2s" ? "/api/s2s/payments" : "/api/widget/checkouts";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      lastResponse = data;
      const p = data.request.params;
      upsertPayment({
        mtid: p.merchantTransactionId,
        id: data.flow === "s2s" ? data.response.id : undefined,
        checkoutId: data.flow === "widget" ? data.response.id : undefined,
        brand: brand.code,
        brandName: brand.name,
        amount: p.amount,
        currency: p.currency,
        flow: data.flow,
        createdAt: new Date().toISOString(),
        status: data.flow === "s2s" ? data.status : "pending",
        code: data.response.result?.code,
      });
      renderRecent();
      renderInspector(data);
    } catch (err) {
      renderError(err.message);
    } finally {
      btn.disabled = !config.configured;
      btn.textContent = label;
    }
  });

  // ---------------------------------------------------------------- inspector
  function stepsHtml(active) {
    const steps = ["Request", "Pending + redirect", "Shopper pays", "Final status"];
    return steps.map((s, i) => `<span class="${i === active ? "on" : ""}">${i + 1}. ${s}</span>`).join('<span class="sep">→</span>');
  }

  function renderError(message) {
    $("inspector").hidden = false;
    $("inspSub").textContent = "The request didn't reach the gateway.";
    $("steps").innerHTML = "";
    $("inspBody").innerHTML = `<div class="banner bad"><strong>Request failed</strong><span>${esc(message)}</span></div>`;
    $("inspector").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderInspector(data) {
    const r = data.response || {};
    const rd = r.resultDetails || {};
    const code = r.result?.code;
    const status = classify(code);
    const redirect = r.redirect;
    $("inspector").hidden = false;
    $("inspSub").textContent = `${data.request.method} ${data.request.path} · HTTP ${data.httpStatus}`;

    let next = "";
    if (data.flow === "widget") {
      $("steps").innerHTML = stepsHtml(0);
      next = data.widgetUrl
        ? `<div class="nextstep"><h3>Next: open the widget</h3><p>The checkout is ready. The widget shows ${esc(brand.name)}; when the shopper submits, it redirects them and returns to the result page.</p>
           <div class="actions"><a class="primary" href="${esc(data.widgetUrl)}">Open COPYandPAY widget</a></div></div>`
        : `<div class="nextstep"><h3>No checkout was created</h3><p>${esc(codeHint(code))}</p></div>`;
    } else if (status === "pending" && redirect && redirect.url) {
      $("steps").innerHTML = stepsHtml(1);
      next = `<div class="nextstep"><h3>Next: send the shopper to the redirect URL</h3>
        <p>This pending result is the normal first response for ${esc(brand.name)}, not a failure. A merchant integration has to redirect the shopper here (${esc(String(redirect.method || (redirect.parameters?.length ? "POST" : "GET")).toUpperCase())}), then read the final status when they come back or from the webhook.</p>
        <div class="actions"><button class="primary" type="button" id="goRedirect">Go to payment page</button>
        <button class="secondary" type="button" id="checkNow">Check status now</button></div></div>`;
    } else if (status === "pending") {
      $("steps").innerHTML = stepsHtml(2);
      next = `<div class="nextstep"><h3>Next: shopper approves in their app</h3>
        <p>No redirect came back, so the shopper completes this in the ${esc(brand.name)} app (for example because a mobile number was sent). Check the status once they have approved it. The window is ${esc(brand.timeout)}.</p>
        <div class="actions"><button class="primary" type="button" id="checkNow">Check status</button></div></div>`;
    } else {
      $("steps").innerHTML = stepsHtml(3);
      next = `<div class="nextstep"><h3>${status === "success" ? "Payment complete" : "Payment not accepted"}</h3><p>${esc(codeHint(code))}</p></div>`;
    }

    const kv = [
      ["Result code", code ? `<span class="mono">${esc(code)}</span>` : "—"],
      ["Description", esc(r.result?.description || "—")],
      ["What it means", esc(codeHint(code))],
      [data.flow === "widget" ? "Checkout ID" : "Payment ID", r.id ? `<span class="mono">${esc(r.id)}</span>` : "—"],
      ["ExtendedDescription", rd.ExtendedDescription ? esc(rd.ExtendedDescription) : null],
      ["ConnectorReasonCode", rd.ConnectorReasonCode ? `<span class="mono">${esc(rd.ConnectorReasonCode)}</span>` : null],
      ["AcquirerResponse", rd.AcquirerResponse ? esc(rd.AcquirerResponse) : null],
      ["ConnectorTxID3 (PPRO payment)", rd.ConnectorTxID3 ? `<span class="mono">${esc(rd.ConnectorTxID3)}</span>` : null],
      ["ConnectorErrorField", rd.ConnectorErrorField ? `<span class="mono">${esc(rd.ConnectorErrorField)}</span> ${esc(rd.ConnectorErrorFieldDetails || "")}` : null],
      ["Redirect URL", redirect?.url ? `<span class="mono">${esc(redirect.url)}</span>` : null],
      ["Merchant transaction ID", `<span class="mono">${esc(data.request.params.merchantTransactionId)}</span>`],
    ].filter(([, v]) => v);

    const reqText = Object.entries(data.request.params).map(([k, v]) => `${k}=${v}`).join("\n");
    $("inspBody").innerHTML = `
      <div class="verdict">
        <div class="verdict-top">${data.flow === "widget" && r.id ? statusPill("pending", "Checkout created") : statusPill(status)} <span class="code">${esc(code || "")}</span></div>
        <dl class="kv">${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
      ${next}
      <details><summary>Request sent</summary><pre class="block">${esc(`${data.request.method} https://${config.apiHost}${data.request.path}\n\n${reqText}`)}</pre></details>
      <details><summary>Full response</summary><pre class="block">${esc(JSON.stringify(r, null, 2))}</pre></details>`;

    const go = $("goRedirect");
    if (go) go.addEventListener("click", () => redirectShopper(redirect));
    const chk = $("checkNow");
    if (chk) chk.addEventListener("click", () => (location.href = `/result/lookup/${brand.code}/${encodeURIComponent(data.request.params.merchantTransactionId)}?id=${encodeURIComponent(r.id)}`));
    $("inspector").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- recent payments
  function renderRecent() {
    const list = loadPayments();
    $("recentRows").innerHTML = list.length
      ? list
          .map((p) => {
            const id = p.id || "";
            const link = id
              ? `/result/lookup/${encodeURIComponent(p.brand)}/${encodeURIComponent(p.mtid)}?id=${encodeURIComponent(id)}`
              : p.resourcePath
              ? `/result/lookup/${encodeURIComponent(p.brand)}/${encodeURIComponent(p.mtid)}?resourcePath=${encodeURIComponent(p.resourcePath)}`
              : "";
            return `<tr>
              <td class="nowrap">${esc(fmtTime(p.createdAt))}</td>
              <td><span class="bname">${esc(p.brandName || p.brand)}</span></td>
              <td class="nowrap">${p.flow === "widget" ? "Widget" : "Server-to-server"}</td>
              <td class="num nowrap">${esc(p.amount)} ${esc(p.currency)}</td>
              <td>${statusPill(p.status || "pending")} <span class="mono muted" style="font-size:12px">${esc(p.code || "")}</span></td>
              <td class="mono" style="font-size:12px">${esc(id || "—")}</td>
              <td>${link ? `<a href="${esc(link)}">Check</a>` : ""}</td></tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="empty">No test payments yet. Send one above and it will show here.</td></tr>`;
  }

  $("lookupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("lookupId").value.trim();
    if (!/^[0-9a-f]{32}$/.test(id)) {
      $("lookupId").focus();
      $("lookupId").setCustomValidity("Enter the 32-character payment ID");
      $("lookupId").reportValidity();
      return;
    }
    $("lookupId").setCustomValidity("");
    location.href = `/result/lookup?id=${encodeURIComponent(id)}`;
  });
  $("lookupId").addEventListener("input", () => $("lookupId").setCustomValidity(""));
})();
