// url params are the only untrusted input; clean() is the only place they enter the page
const params = new URLSearchParams(location.search);
const clean = v => (v || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);

const agentSlug = clean(params.get("agent"));
const loSlug    = clean(params.get("lo"));

function track(name, extra = {}) {
  if (typeof gtag !== "function") return;
  gtag("event", name, { agent: agentSlug || "(none)", lo: loSlug || "(none)", ...extra });
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-event]");
  if (el) track(el.dataset.event);
});

// the new form editor embeds an iframe, so fields go through hubspot's client api.
// property refs need the "0-1/" contact prefix or the call silently does nothing.
window.addEventListener("hs-form-event:on-ready", e => {
  const form = window.HubspotFormsV4?.getFormFromEvent(e);
  if (!form) return;
  form.setFieldValue("0-1/agent_slug", agentSlug);
  form.setFieldValue("0-1/lo_slug", loSlug);
});

window.addEventListener("hs-form-event:on-submission:success", () => track("form_submit"));

// legacy inline embed (hbspt.forms.create)
window.addEventListener("message", e => {
  if (e.data?.type !== "hsFormCallback") return;

  if (e.data.eventName === "onFormReady") {
    const form = document.querySelector("#hs-form form");
    if (!form) return;
    setHidden(form, "agent_slug", agentSlug);
    setHidden(form, "lo_slug", loSlug);
  }

  if (e.data.eventName === "onFormSubmitted") {
    track("form_submit");
  }
});

function setHidden(form, name, value) {
  const input = form.querySelector(`input[name="${name}"]`);
  if (!input) return;
  input.value = value;
  // react-controlled input, .value alone doesn't register
  input.dispatchEvent(new Event("input",  { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// own-property lookup so a slug like "constructor" can't hit Object.prototype
const lookup = (map, key) => (key && Object.hasOwn(map, key) ? map[key] : null);

function fill(slot, text) {
  document.querySelectorAll(`[data-slot="${slot}"]`).forEach(el => { el.textContent = text; });
}

const initials    = full  => full.split(" ").map(w => w[0]).join("").toUpperCase();
const prettyPhone = phone => phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

fetch("/data/agents.json")
  .then(r => r.json())
  .then(data => {
    const agent = lookup(data.agents, agentSlug);
    const lo    = lookup(data.los, loSlug) || data.los[data.defaults.lo];

    if (agent) {
      fill("agent-first", agent.first);
      fill("agent-full", agent.full);
    }
    fill("lo-first", lo.first);
    fill("lo-full", lo.full);
    fill("lo-initials", initials(lo.full));
    fill("lo-phone", prettyPhone(lo.phone));

    document.querySelectorAll('[data-variant="agent"]').forEach(el => el.classList.toggle("is-hidden", !agent));
    document.querySelectorAll('[data-variant="generic"]').forEach(el => el.classList.toggle("is-hidden", !!agent));

    const hrefs = { sms: "sms:" + lo.phone, tel: "tel:" + lo.phone, calendar: lo.calendar };
    document.querySelectorAll("[data-lo-href]").forEach(a => { a.href = hrefs[a.dataset.loHref]; });
  })
  .finally(loadHubSpot);

// the embed loads after the headline is final so its script chain
// doesn't compete with the first paint on slow connections
function loadHubSpot() {
  const frame = document.querySelector(".hs-form-frame[data-src]");
  if (!frame) return;
  const s = document.createElement("script");
  s.src = frame.dataset.src;
  document.body.appendChild(s);
}
