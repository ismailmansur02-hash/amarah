/* ==================================================================
   The Little Shop of Gratitude

   Plain JavaScript, no framework, no build step.
   Everything you are likely to want to change is in SETTINGS below.
   ================================================================== */

const SETTINGS = {
  /* The booking address. The part before the @ is confirmed; the domain
     ending is not — the original site rendered it as .com. Change it here
     and it updates everywhere it appears. */
  emailUser: "greetings",
  emailDomain: "thelittleshopofgratitude.com",

  instagram: "thelittleshopofgratitude"
};

const email = () => `${SETTINGS.emailUser}@${SETTINGS.emailDomain}`;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollTo = (id) =>
  $(id).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });

/* ══════════════════════════════════════════════ scroll reveals ══ */

function watchReveals() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window) || reduceMotion()) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => io.observe(el));
}

/* ═══════════════════════════════════════════════════ the actions ══ */

function goExplore() {
  scrollTo("#about");
}

function goMenu() {
  scrollTo("#menu");
  if (!$("#menuExpand").classList.contains("open")) toggleMenu();
}

function toggleMenu() {
  const panel = $("#menuExpand");
  const button = $('[data-action="menu-toggle"]');
  const open = panel.classList.toggle("open");
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Close the menu of experiences" : "Open the menu of experiences");
  $("[data-menu-label]").textContent = open ? "Close Menu" : "Open Menu";
}

/* ═════════════════════════════════ say hello / booking overlays ══ */

let lastFocused = null;
let openPanel = null;

function trapFocus(event) {
  if (!openPanel || event.key !== "Tab") return;
  const focusable = $$(
    'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
    openPanel
  ).filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openOverlay(id) {
  const panel = document.getElementById(id);
  if (!panel || openPanel) return;

  lastFocused = document.activeElement;
  openPanel = panel;
  panel.hidden = false;
  document.body.style.overflow = "hidden";
  void panel.offsetWidth;                 // let the browser see it before fading in
  panel.classList.add("active");

  ($("input:not([type=hidden]), textarea", panel) || $("[data-close]", panel))
    ?.focus({ preventScroll: true });

  /* so the phone's back button closes the panel rather than leaving the site */
  history.pushState({ overlay: id }, "", `#${id}`);
}

function closeOverlay({ fromHistory = false } = {}) {
  const panel = openPanel;
  if (!panel) return;

  if (!fromHistory && history.state?.overlay) {
    history.back();                       // the popstate handler finishes the job
    return;
  }

  openPanel = null;
  panel.classList.remove("active");
  document.body.style.overflow = "";

  const finish = () => {
    panel.hidden = true;
    lastFocused?.focus({ preventScroll: true });
  };
  if (reduceMotion()) finish();
  else setTimeout(finish, 620);
}

/* ═══════════════════════════════════════════════════ the forms ══ */

async function sendForm(form) {
  const status = $("[data-status]", form);
  const button = $('button[type="submit"]', form);
  const label = $("[data-send-label]", button);
  const original = label.textContent;

  status.className = "form-status";
  status.textContent = "";
  button.disabled = true;
  label.textContent = "Sending";

  try {
    const res = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString()
    });
    if (!res.ok) throw new Error(String(res.status));

    const isBooking = form.dataset.form === "booking";
    form.reset();
    status.className = "form-status is-good";
    status.textContent = isBooking
      ? "Thank you — your request is with us. We will confirm the date and the deposit by email."
      : "Thank you — your message is with us. We will write back soon.";

    if (isBooking) offerDeposit(form);
  } catch {
    status.className = "form-status is-bad";
    status.innerHTML = `That did not send. Please email <a href="mailto:${email()}">${email()}</a> instead.`;
  } finally {
    button.disabled = false;
    label.textContent = original;
  }
}

/* ══════════════════════════════════ the deposit, if switched on ══ */

let depositInfo = null;

async function loadDeposit() {
  try {
    const res = await fetch("/api/deposit");
    if (!res.ok) return;
    const data = await res.json();
    if (data.enabled) depositInfo = data;
  } catch {
    /* no function running (e.g. opened as a plain file) — stay quiet */
  }
  const note = $("[data-deposit-note]");
  if (note && depositInfo) {
    note.textContent = `The deposit is ${depositInfo.formatted} and comes off what you spend on the day.`;
  }
}

function offerDeposit(form) {
  if (!depositInfo) return;
  const status = $("[data-status]", form);

  const pay = document.createElement("button");
  pay.type = "button";
  pay.className = "logo-btn";
  pay.style.alignSelf = "center";
  pay.setAttribute("aria-label", `Pay the ${depositInfo.formatted} deposit now`);
  pay.innerHTML =
    `<img src="/assets/img/wreath.png" alt="" width="58" height="72">` +
    `<span>Pay Deposit ${depositInfo.formatted}</span>`;

  pay.addEventListener("click", async () => {
    pay.disabled = true;
    try {
      const res = await fetch("/api/deposit", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "no url");
    } catch {
      status.className = "form-status is-bad";
      status.textContent = "The payment page could not be opened. We will send a link by email instead.";
      pay.disabled = false;
    }
  });

  status.after(pay);
}

/* ══════════════════════════════════════════════════════════ wire ══ */

function wire() {
  watchReveals();
  $("[data-year]").textContent = new Date().getFullYear();

  $$("[data-email-link]").forEach((el) => {
    el.href = `mailto:${email()}`;
    el.textContent = email();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (trigger) {
      const action = trigger.dataset.action;
      if (action === "explore") goExplore();
      if (action === "menu") goMenu();
      if (action === "menu-toggle") toggleMenu();
      if (action === "hello") openOverlay("hello");
      if (action === "book") openOverlay("booking");
      return;
    }
    if (event.target.closest("[data-close]")) closeOverlay();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openPanel) closeOverlay();
    trapFocus(event);
  });

  addEventListener("popstate", () => {
    if (openPanel) closeOverlay({ fromHistory: true });
  });

  $$("[data-form]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendForm(form);
    })
  );

  loadDeposit();
}

wire();
