"use client";

import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorNote } from "@/components/builder";
import {
  CodeWindow,
  NewWindowIcon,
  RefreshIcon,
  SendButton,
  SplitButton,
  UrlLabel,
} from "@/components/CodeWindow";
import { Col, Note, Row } from "@/components/content";
import { Heading } from "@/components/Heading";
import { OpenBankingTransactionFlow } from "@/components/OpenBankingTransactionFlow";
import { PayByBankCheckout } from "@/components/PayByBankCheckout";
import {
  Callout,
  ConfirmationChart,
  JourneySteps,
  PAY_BY_BANK_JOURNEY,
} from "@/components/openBanking";
import { ParamDoc, RequestProperties } from "@/components/params";
import {
  Banner,
  PlaygroundShell,
  Row as PgRow,
  Section,
  Stepper,
  TextField,
} from "@/components/Playground";
import { StepLink, StepNote, resultText } from "@/components/S2SFlow";
import { ParamGroup, ParamGroups } from "@/components/s2sParts";
import { useSyncSections } from "@/components/SectionProvider";
import { SelectMenu } from "@/components/select";
import { postJson, usePersistentState } from "@/lib/flowState";
import { highlightJs, highlightJson, requestCode } from "@/lib/highlight";
import {
  CONFIRMATION_TIMES,
  OB_COUNTRIES,
  OB_CURRENCIES,
  OB_STEPS,
  PAY_BY_LINKS_URL,
  buildPaymentParams,
  currencyFor,
  defaultForm,
  missingPayment,
} from "@/lib/openBanking";
import {
  PAYMENT_RESPONSE_DOCS,
  STATUS_RESPONSE_DOCS,
  obDoc,
} from "@/lib/openBankingDocs";
import { REDIRECT_DOC } from "@/lib/paramDocs";
import {
  RETURN_MESSAGE,
  redirectSnippet,
  sendShopper,
  sendShopperToPopup,
} from "@/lib/redirect";
import { useConfig } from "@/lib/useConfig";

const KEY = "nomupayApmDemo.openBanking.v1";
const INITIAL = {
  integration: "api",
  form: defaultForm(),
  payment: null,
  result: null,
  returned: false,
};

// The gateway allows two status requests a minute for each payment
const STATUS_LIMIT = 2;
const STATUS_WINDOW_MS = 60000;
const THROTTLED_TEXT =
  "The gateway allows two status checks a minute for each payment.";

// Shown instead of the demo's own values: the request carries the real ones
const SHOPPER_RESULT_URL_SHOWN = "https://demo/paymentresult";
const ENTITY_SHOWN = "{entity_id}";

const STEPS = OB_STEPS;
const [, PAYMENT, REDIRECT, STATUS] = STEPS;

// True inside a payment popup (see the return page)
function isEmbedded() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.hasAttribute("data-embedded")
  );
}

function ResponseParams({ docs, response }) {
  return (
    <ParamGroup title="Response">
      {docs.map((d) => (
        <ParamDoc key={d.name} doc={d} value={response?.[d.name]} />
      ))}
    </ParamGroup>
  );
}

const MODEL = { id: "payment-workflow", title: "Payment workflow" };
const START = { id: "start-integrating", title: "Start integrating" };

function OpenBankingPlayground({
  open,
  onClose,
  form,
  setForm,
  missing,
  onReset,
}) {
  let set = (patch) => setForm({ ...form, ...patch });
  return (
    <PlaygroundShell open={open} onClose={onClose} onReset={onReset}>
      <div className="px-5 py-4">
        <Banner>
          Runs on the demo’s test account with the Open Banking channel, and
          Token.io’s sandbox banks.
        </Banner>
      </div>
      <Section
        id="pg-payment"
        title="Payment"
        description="What the shopper pays."
      >
        <PgRow label="Amount" htmlFor="pg-amount">
          <Stepper
            id="pg-amount"
            value={form.amount}
            onChange={(amount) => set({ amount })}
          />
        </PgRow>
        <PgRow label="Currency" htmlFor="pg-currency">
          <SelectMenu
            id="pg-currency"
            options={OB_CURRENCIES.map((c) => ({ value: c, label: c }))}
            value={form.currency}
            onChange={(currency) => set({ currency })}
          />
        </PgRow>
        <PgRow
          label="Merchant transaction ID"
          htmlFor="pg-mtid"
          hint="Optional"
        >
          <TextField
            id="pg-mtid"
            value={form.merchantTransactionId}
            placeholder="Not sent if empty"
            onChange={(merchantTransactionId) => set({ merchantTransactionId })}
          />
        </PgRow>
      </Section>
      <Section
        id="pg-bank"
        title="Shopper’s bank"
        description="Token.io lists the banks for this country first. Choosing a country sets its currency."
      >
        <PgRow label="Country" htmlFor="pg-country" hint="bankAccount.country">
          <SelectMenu
            id="pg-country"
            options={OB_COUNTRIES.map((c) => ({
              value: c.code,
              label: c.name,
              meta: c.code,
              description: c.currency,
            }))}
            value={form.country}
            onChange={(country) =>
              set({ country, currency: currencyFor(country) })
            }
          />
        </PgRow>
        {missing.length > 0 && (
          <Banner tone="amber">Fill in: {missing.join(", ")}</Banner>
        )}
      </Section>
    </PlaygroundShell>
  );
}

export function OpenBankingFlow({ mode = "start" }) {
  let config = useConfig();
  let search = useSearchParams();
  let [state, setState, ready] = usePersistentState(KEY, INITIAL);
  let [busy, setBusy] = useState("");
  let [error, setError] = useState({});
  let [playground, setPlayground] = useState(false);
  let autoScrolled = useRef(false);

  // The page is the API path: Pay by links have their own guide in the Help Centre
  let api = true;
  useSyncSections([
    MODEL,
    START,
    ...(api
      ? STEPS.map((x) => ({
          id: x.id,
          step: x.step,
          title: x.title,
          tag: x.tag,
        }))
      : []),
  ]);

  let form = { ...INITIAL.form, ...state.form };
  let setForm = (f) => setState((s) => ({ ...s, form: f }));
  let missing = useMemo(() => missingPayment(form), [form]);
  let params = buildPaymentParams(form, {
    entityId: ENTITY_SHOWN,
    shopperResultUrl: SHOPPER_RESULT_URL_SHOWN,
  });
  let values = Object.fromEntries(params);

  let payment = state.payment;
  let paymentId = payment?.response?.id;
  let redirect = payment?.response?.redirect;
  let returnId =
    search.get("id") ||
    search.get("resourcePath")?.match(/\/v1\/payments\/(\w+)/)?.[1];
  let statusId = (mode === "return" && returnId) || paymentId;
  let canSend = Boolean(
    config && config.configured && config.environment === "TEST",
  );
  let authFailed = /^800\.900\.30/.test(payment?.response?.result?.code || "");

  // Status requests per payment in the last minute, to stay inside the gateway's limit
  let statusCalls = useRef({});
  function statusWait(id) {
    let now = Date.now();
    let recent = (statusCalls.current[id] || []).filter(
      (t) => now - t < STATUS_WINDOW_MS,
    );
    statusCalls.current[id] = recent;
    return recent.length < STATUS_LIMIT
      ? 0
      : recent[0] + STATUS_WINDOW_MS - now + 250;
  }

  async function checkStatus() {
    if (!statusId) return;
    let ms = statusWait(statusId);
    if (ms > 0) {
      setError({
        status: `${THROTTLED_TEXT} Try again in ${Math.ceil(ms / 1000)} seconds.`,
      });
      return;
    }
    setBusy("status");
    setError({});
    try {
      statusCalls.current[statusId] = [
        ...(statusCalls.current[statusId] || []),
        Date.now(),
      ];
      let data = await postJson("/api/open-banking/status", { id: statusId });
      if (data.status === "throttled")
        setError({
          status: `${THROTTLED_TEXT} Wait a moment and check again.`,
        });
      else setState((s) => ({ ...s, result: data }));
    } catch (e) {
      setError({ status: e.message });
    } finally {
      setBusy("");
    }
  }

  async function sendPayment() {
    setBusy("payment");
    setError({});
    try {
      let data = await postJson("/api/open-banking/payments", form);
      setState((s) => ({ ...s, payment: data, result: null, returned: false }));
    } catch (e) {
      setError({ payment: e.message });
    } finally {
      setBusy("");
    }
  }

  function openWindow() {
    if (!sendShopperToPopup(redirect))
      setError({
        redirect:
          "The browser blocked the new window. Allow pop-ups for this site, or redirect this page.",
      });
  }

  // Back on the return page after a full-page redirect: show step 2
  useEffect(() => {
    if (
      mode !== "return" ||
      autoScrolled.current ||
      !ready ||
      !returnId ||
      isEmbedded()
    )
      return;
    autoScrolled.current = true;
    setTimeout(
      () =>
        document
          .getElementById(REDIRECT.id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      350,
    );
  }, [mode, returnId, ready]);

  // The return page in the popup tells this page when the shopper is back
  let latest = useRef({});
  latest.current = { paymentId };
  useEffect(() => {
    let allowed = [window.location.origin];
    try {
      if (config?.returnBase) allowed.push(new URL(config.returnBase).origin);
    } catch {}
    function onMessage(e) {
      if (!allowed.includes(e.origin) || e.data?.type !== RETURN_MESSAGE)
        return;
      if (
        latest.current.paymentId &&
        e.data.id &&
        e.data.id !== latest.current.paymentId
      )
        return;
      setState((s) => ({ ...s, returned: true }));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config, setState]);

  let base = `https://${config?.apiHost || "eu-test.oppwa.com"}`;
  let paymentVariants = requestCode({ url: `${base}/v1/payments`, params });
  let statusVariants = requestCode({
    method: "GET",
    url: `${base}/v1/payments/${statusId || "{id}"}`,
    params: [["entityId", ENTITY_SHOWN]],
  });
  let snippet = redirectSnippet(redirect, PAYMENT.step);
  let back = state.returned || (mode === "return" && Boolean(returnId));

  let row = (key, extra = {}) => ({
    doc: obDoc(key, extra.doc),
    value: extra.value ?? values[key],
    note: extra.note,
    missing: missing.includes(key),
  });
  let requestRows = [
    row("amount", { doc: { req: "M" } }),
    row("currency", { doc: { req: "M" } }),
    row("paymentBrand", { doc: { req: "M" } }),
    row("paymentType", { doc: { req: "M" } }),
    row("bankAccount.country", { doc: { req: "M" } }),
    row("shopperResultUrl", { doc: { req: "M" } }),
    row("merchantTransactionId", {
      doc: { req: "O" },
      note: "Your own reference, for reconciliation.",
    }),
  ];

  let link = (text = "Playground") => (
    <button
      type="button"
      onClick={() => setPlayground(true)}
      className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
    >
      {text}
    </button>
  );
  let sendHint =
    config && !canSend ? (
      <span className="text-xs text-zinc-400">
        {config.environment !== "TEST"
          ? "This guide only runs against the test system."
          : "The demo’s access token isn’t set on this server."}
      </span>
    ) : null;

  let status = state.result?.status;
  let pendingForBank = state.result?.response?.result?.code === "000.200.001";

  return (
    <>
      {/* Payment workflow: what happens, beside the shopper's steps, then the requests behind it */}
      <Heading level={2} id={MODEL.id}>
        {MODEL.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Pay by Bank is our Payment Initiation Service (PIS), powered by
            Open Banking and delivered with our partner Token.io. Each payment
            is a one-off payment the shopper approves with their own bank, in
            three steps.
          </p>
          <p>
            The payment is asynchronous. It stays pending while the shopper
            approves it, and the bank’s confirmation can arrive after they’re
            back on your site. So you send the payment, send the shopper to
            their bank, then get the final status.
          </p>
        </Col>
        <Col>
          <div className="not-prose rounded-2xl bg-zinc-50 px-6 py-6 ring-1 ring-zinc-900/5 dark:bg-white/2.5 dark:ring-white/10">
            <JourneySteps steps={PAY_BY_BANK_JOURNEY} vertical />
          </div>
        </Col>
      </Row>
      <OpenBankingTransactionFlow />

      <hr />
      <Heading level={2} id={START.id}>
        {START.title}
      </Heading>
      <p>
        Add Pay by Bank to your checkout and take payments with the API,
        following the steps below. The requests run on the demo’s test account,
        which has the Open Banking channel, with Token.io’s sandbox. Set the
        amount, currency and bank country in the {link()}.
      </p>
      <p>
        For Pay by link integration, use our{" "}
        <a href={PAY_BY_LINKS_URL} target="_blank" rel="noreferrer">
          Pay by Links guide
        </a>
        .
      </p>

      {api && <PayByBankCheckout />}

      {api && (
        <>
          <hr />

          {/* 1. The payment */}
          <Heading level={2} id={PAYMENT.id} step={PAYMENT.step} tag="POST">
            {PAYMENT.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Send a server-to-server POST request with paymentBrand
                ACI_INSTANTPAY and the country of the shopper’s bank. The
                response is pending, with a redirect to Token.io’s page for step{" "}
                {REDIRECT.step}.
              </p>
              <h3>Properties</h3>
              <RequestProperties
                method="POST"
                path="/v1/payments"
                base={base}
              />
              <h3>Parameters</h3>
              <ParamGroups>
                <ParamGroup
                  title="Request"
                  missing={requestRows.filter((r) => r.missing).length}
                >
                  {requestRows.map((r) => (
                    <ParamDoc
                      key={r.doc.name}
                      doc={r.doc}
                      value={r.value}
                      note={r.note}
                      missing={r.missing}
                      onPlayground={() => setPlayground(true)}
                    />
                  ))}
                </ParamGroup>
                <ResponseParams
                  docs={PAYMENT_RESPONSE_DOCS}
                  response={payment?.response}
                />
              </ParamGroups>
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="POST"
                label={<UrlLabel base={base} path="/v1/payments" />}
                variants={paymentVariants}
                lineNumbers
                onPlayground={() => setPlayground(true)}
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SendButton
                      onClick={sendPayment}
                      disabled={
                        !canSend || missing.length > 0 || busy === "payment"
                      }
                    >
                      {busy === "payment" ? "Sending…" : "Send request"}
                    </SendButton>
                    {sendHint}
                    {payment && (
                      <button
                        type="button"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            payment: null,
                            result: null,
                            returned: false,
                          }));
                          setError({});
                        }}
                        className="ml-auto text-xs font-medium text-zinc-400 transition hover:text-white"
                      >
                        Start over
                      </button>
                    )}
                  </div>
                }
              />
              <ErrorNote message={error.payment} />
              <CodeWindow
                title="Response"
                code={payment ? JSON.stringify(payment.response, null, 2) : ""}
                html={payment ? highlightJson(payment.response) : ""}
                empty="Response Details"
              />
              {payment &&
                (authFailed ? (
                  <StepNote status="failed" title="Not authorised.">
                    The demo’s entity or access token can’t use the Open
                    Banking channel. Check the entity has it, or set
                    OPEN_BANKING_ENTITY_ID and OPEN_BANKING_ACCESS_TOKEN on the
                    server.
                  </StepNote>
                ) : payment.status === "pending" && redirect ? (
                  <StepNote status="pending" title="Pending.">
                    Continue to <StepLink step={REDIRECT} /> to send the shopper
                    to their bank.
                  </StepNote>
                ) : payment.status === "pending" ? (
                  <StepNote
                    status="pending"
                    title="Pending, without a redirect."
                  >
                    Check the status in <StepLink step={STATUS} />, or send the
                    payment again.
                  </StepNote>
                ) : (
                  <StepNote status="failed" title="Rejected.">
                    {resultText(payment)}
                    {/^900\.100\.2/.test(
                      payment.response?.result?.code || "",
                    ) &&
                      " The connection to Token.io’s sandbox failed. Send the payment again."}
                  </StepNote>
                ))}
            </Col>
          </Row>

          {/* 2. Token.io and the bank */}
          <hr />
          <Heading level={2} id={REDIRECT.id} step={REDIRECT.step}>
            {REDIRECT.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Send the shopper to the redirect URL from step {PAYMENT.step}’s
                response. It’s always a GET request, with no parameters. On
                Token.io’s page they pick their bank and approve the payment in
                their banking app, then come back to your shopperResultUrl.
              </p>
              <p>
                Token.io’s page can’t open inside another site, so open it in a
                new window or redirect the whole page.
              </p>
              <h3>Parameters</h3>
              <p>
                The request comes from the redirect object in step{" "}
                {PAYMENT.step}’s response.
              </p>
              <ParamGroups>
                <ParamGroup title="Request">
                  {REDIRECT_DOC.children.map((d) => (
                    <ParamDoc
                      key={d.name}
                      doc={d}
                      prefix="redirect."
                      value={
                        d.name === "method"
                          ? redirect?.method
                          : redirect?.[d.name]
                      }
                    />
                  ))}
                </ParamGroup>
              </ParamGroups>
            </Col>
            <Col sticky>
              <CodeWindow
                title="JavaScript"
                label={`Redirect details from step ${PAYMENT.step}`}
                code={snippet}
                html={highlightJs(snippet)}
                footer={
                  <SplitButton
                    primary={{
                      label: "Open in new window",
                      icon: <NewWindowIcon className="size-3.5 flex-none" />,
                      onClick: openWindow,
                      disabled: !redirect,
                    }}
                    secondary={{
                      label: "Redirect this page",
                      onClick: () => sendShopper(redirect),
                      disabled: !redirect,
                    }}
                  />
                }
              />
              <ErrorNote message={error.redirect} />
              {back && (
                <StepNote status="success" title="The shopper is back.">
                  Continue to <StepLink step={STATUS} /> to get the payment
                  status.
                </StepNote>
              )}
            </Col>
          </Row>

          {/* 3. Status, and what to do while it's pending */}
          <hr />
          <Heading level={2} id={STATUS.id} step={STATUS.step} tag="GET">
            {STATUS.title}
          </Heading>
          <Row>
            <Col>
              <p>
                When the shopper comes back to your shopperResultUrl, it carries
                the payment’s id and resourcePath. Send a GET request for the
                payment with your entityId to get its status. {THROTTLED_TEXT}
              </p>
              <h3>Properties</h3>
              <RequestProperties
                method="GET"
                path="/v1/payments/{id}"
                base={base}
              />
              <h3>Parameters</h3>
              <ParamGroups>
                <ParamGroup title="Request">
                  <ParamDoc
                    doc={{
                      name: "id",
                      format: "AN32",
                      pattern: "[a-zA-Z0-9]{32}",
                      req: "M",
                      text: "The identifier of the payment, in the path.",
                      example: "8ac7a4a1a1f5d12001a203497d145db9",
                    }}
                    value={statusId}
                    note={`The id from step ${PAYMENT.step}’s response.`}
                  />
                </ParamGroup>
                <ResponseParams
                  docs={STATUS_RESPONSE_DOCS}
                  response={state.result?.response}
                />
              </ParamGroups>
              <h3>When the payment is still pending</h3>
              <p>
                Some banks take longer to confirm, so the shopper can be back
                before the payment is final. A status of 000.200.000 or
                000.200.001 is still pending, not declined. Get the final status
                by checking again, or with a webhook notification when the bank
                confirms.
              </p>
              <Callout title="Don’t keep the shopper waiting">
                Show a message like this, and email them when the payment is
                approved: “Your order is being processed. We’re confirming your
                payment with your bank and will email you when it’s approved, so
                there’s no need to pay again.”
              </Callout>
              <ConfirmationChart
                rows={CONFIRMATION_TIMES}
                source="Source: Nomupay, Open Banking API guide."
              />
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="GET"
                label={
                  <UrlLabel
                    base={base}
                    path="/v1/payments/"
                    id={statusId || ""}
                  />
                }
                variants={statusVariants}
                lineNumbers
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SplitButton
                      primary={{
                        label: busy === "status" ? "Sending…" : "Send request",
                        onClick: checkStatus,
                        disabled: !statusId || busy === "status" || !canSend,
                      }}
                      secondary={{
                        label: "Check status",
                        icon: (
                          <RefreshIcon
                            className={clsx(
                              "size-3.5 flex-none",
                              busy === "status" && "animate-spin",
                            )}
                          />
                        ),
                        onClick: checkStatus,
                        disabled:
                          !state.result || busy === "status" || !canSend,
                      }}
                    />
                    {sendHint}
                  </div>
                }
              />
              <ErrorNote message={error.status} />
              <CodeWindow
                title="Response"
                code={
                  state.result
                    ? JSON.stringify(state.result.response, null, 2)
                    : ""
                }
                html={state.result ? highlightJson(state.result.response) : ""}
                empty="Response Details"
              />
              {state.result &&
                (status === "success" ? (
                  <StepNote status="success" title="Approved.">
                    The bank confirmed the payment. Confirm the order.
                  </StepNote>
                ) : status === "pending" ? (
                  <StepNote status="pending" title="Still pending.">
                    {pendingForBank
                      ? "Waiting for the bank’s confirmation. Check again in a moment."
                      : "The shopper hasn’t finished with their bank yet, or the bank hasn’t confirmed. Check again in a moment."}
                  </StepNote>
                ) : (
                  <StepNote status="failed" title="Not approved.">
                    {resultText(state.result)}
                  </StepNote>
                ))}
              {!payment && mode !== "return" && (
                <Note className="mt-4">
                  Send the payment in step {PAYMENT.step} first.
                </Note>
              )}
            </Col>
          </Row>
        </>
      )}

      <OpenBankingPlayground
        open={playground}
        onClose={() => setPlayground(false)}
        form={form}
        setForm={setForm}
        missing={missing}
        onReset={() =>
          setState((s) => ({ ...INITIAL, integration: s.integration }))
        }
      />
    </>
  );
}
