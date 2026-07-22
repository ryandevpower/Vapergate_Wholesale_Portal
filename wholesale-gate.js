/* ==========================================================================
   Vapergate Wholesale Portal
   Core: the Portal card is the product UI.
   Access is granted only to logged-in customers in the exact Ecwid group
   named "Wholesale".
   ========================================================================== */
(function () {
  "use strict";

  var APPROVED_GROUP = "Wholesale";
  var SUPPORT_EMAIL = "wholesale@vapergate.com";
  var LOGO_URL =
    "https://lh3.googleusercontent.com/d/1W-8pjKqM1ZHPCW3uFgCOo1U4EB5inBZ-";

  /* Portal states */
  var STATE = {
    BOOT: "boot",
    LOGIN: "login",
    PENDING: "pending",
    ACCOUNT: "account",
    APPROVED: "approved",
  };

  var win = window;
  var doc = document;

  var state = STATE.BOOT;
  var lastEmail = "";
  var started = false;
  var eventsBound = false;
  var evaluateTimer = null;

  function getEcwid() {
    return win.Ecwid || null;
  }

  function isAccountRoute() {
    var path = String(win.location.pathname || "").toLowerCase();
    var hash = String(win.location.hash || "").toLowerCase();
    var search = String(win.location.search || "").toLowerCase();

    return (
      path.indexOf("/account") !== -1 ||
      hash.indexOf("account") !== -1 ||
      hash.indexOf("signin") !== -1 ||
      hash.indexOf("sign-in") !== -1 ||
      search.indexOf("account") !== -1
    );
  }

  function ensureOverlay() {
    if (!doc.body) return null;

    var overlay = doc.getElementById("custom-gate-overlay");
    if (!overlay) {
      overlay = doc.createElement("div");
      overlay.id = "custom-gate-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = '<div class="gp-spinner" aria-hidden="true"></div>';
      doc.body.appendChild(overlay);
    }
    return overlay;
  }

  function showPortalShell() {
    var overlay = ensureOverlay();
    if (!overlay) return null;

    if (doc.body) {
      doc.body.classList.add("gp-gate-locked");
      doc.body.classList.remove("gp-wholesale-approved");
    }

    overlay.style.setProperty("display", "flex", "important");
    void overlay.offsetWidth;
    overlay.classList.add("gp-visible");
    return overlay;
  }

  function hidePortal() {
    var overlay = doc.getElementById("custom-gate-overlay");
    if (!overlay) return;

    overlay.classList.remove("gp-visible");
    setTimeout(function () {
      if (overlay && !overlay.classList.contains("gp-visible")) {
        overlay.style.setProperty("display", "none", "important");
      }
    }, 300);
  }

  function unlockStore() {
    state = STATE.APPROVED;

    if (doc.body) {
      doc.body.classList.remove("gp-gate-locked");
      doc.body.classList.add("gp-wholesale-approved");
    }

    hidePortal();
  }

  function createToastElement() {
    if (!doc.body || doc.getElementById("gp-custom-toast")) return;

    var toast = doc.createElement("div");
    toast.id = "gp-custom-toast";
    toast.className = "gp-toast-notification";
    toast.innerHTML =
      '<div class="gp-toast-content">' +
      '  <h4 class="gp-toast-title">Password Reset Route</h4>' +
      '  <p class="gp-toast-desc">Please proceed via the login portal panel interface. Enter your wholesale email ID and click the default platform recovery links provided there.</p>' +
      "</div>" +
      '<button type="button" class="gp-toast-close" onclick="window.dismissPortalToast()" aria-label="Close">×</button>';
    doc.body.appendChild(toast);
  }

  win.triggerPortalToast = function () {
    createToastElement();
    var toast = doc.getElementById("gp-custom-toast");
    if (!toast) return;
    toast.classList.add("gp-toast-active");
    clearTimeout(win.__gpToastTimer);
    win.__gpToastTimer = setTimeout(function () {
      win.dismissPortalToast();
    }, 8000);
  };

  win.dismissPortalToast = function () {
    var toast = doc.getElementById("gp-custom-toast");
    if (toast) toast.classList.remove("gp-toast-active");
  };

  /* Open Ecwid account UI — Portal stays until Wholesale is confirmed */
  win.routeToPortalLogin = function () {
    var ec = getEcwid();

    if (ec && typeof ec.openPage === "function") {
      try {
        ec.openPage("account");
        return;
      } catch (err) {
        /* fall through */
      }
    }

    win.location.hash = "!/~/accountSettings";
  };

  win.handleWholesaleRequest = function () {
    var subject = encodeURIComponent(
      "Wholesale Account Application - Vapergate",
    );
    var body = encodeURIComponent(
      "Hello Vapergate Team,\n\n" +
        "I would like to request wholesale access to your private storefront.\n\n" +
        "BUSINESS DETAILS:\n" +
        "- Business Name:\n" +
        "- Tax ID / EIN:\n" +
        "- Phone Number:\n" +
        "- Shipping Address:\n\n" +
        "Thank you!",
    );
    win.location.href =
      "mailto:" + SUPPORT_EMAIL + "?subject=" + subject + "&body=" + body;
  };

  win.handleGateLogout = function () {
    var ec = getEcwid();

    function afterSignOut() {
      lastEmail = "";
      state = STATE.LOGIN;
      renderLoginPortal();
      try {
        win.location.reload();
      } catch (e) {
        /* ignore */
      }
    }

    if (ec && ec.Customer && typeof ec.Customer.signout === "function") {
      ec.Customer.signout(afterSignOut);
      return;
    }

    afterSignOut();
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isWholesaleCustomer(customer) {
    if (!customer) return false;

    // Official storefront JS API: customer.membership.name
    // (general/default group omits membership entirely)
    if (customer.membership && customer.membership.name != null) {
      if (String(customer.membership.name) === APPROVED_GROUP) return true;
    }

    // Fallback for older / alternate payloads that expose customerGroups[]
    if (customer.customerGroups && customer.customerGroups.length) {
      for (var i = 0; i < customer.customerGroups.length; i++) {
        var group = customer.customerGroups[i];
        var name = group && group.name != null ? String(group.name) : "";
        if (name === APPROVED_GROUP) return true;
      }
    }

    return false;
  }

  /* ---------- Portal renders (original design classes only) ---------- */

  function renderBootPortal() {
    state = STATE.BOOT;
    var overlay = showPortalShell();
    if (!overlay) return;
    overlay.innerHTML = '<div class="gp-spinner" aria-hidden="true"></div>';
  }

  function renderLoginPortal() {
    state = STATE.LOGIN;
    var overlay = showPortalShell();
    if (!overlay) return;

    overlay.innerHTML =
      '<div class="gp-portal-card">' +
      '  <div class="gp-top-line"></div>' +
      '  <img class="gp-logo" src="' +
      LOGO_URL +
      '" alt="Vapergate Wholesale">' +
      '  <div class="gp-label">ACCOUNT PORTAL</div>' +
      '  <h1 class="gp-title">ACCOUNT LOGIN REQUIRED</h1>' +
      '  <p class="gp-description">This storefront is restricted to verified approved accounts only, Please sign in:</p>' +
      '  <div class="gp-actions">' +
      '    <button type="button" class="gp-btn-login" onclick="window.routeToPortalLogin()">Login To Account</button>' +
      '    <button type="button" class="gp-btn-request" onclick="window.handleWholesaleRequest()">Request Wholesale Access</button>' +
      "  </div>" +
      '  <a class="gp-reset" href="#" onclick="event.preventDefault(); window.triggerPortalToast();">Forgot password?</a>' +
      '  <div class="gp-footer">Contact: ' +
      SUPPORT_EMAIL +
      "</div>" +
      "</div>";
  }

  function renderPendingPortal(email) {
    state = STATE.PENDING;
    lastEmail = email || lastEmail || "";
    var overlay = showPortalShell();
    if (!overlay) return;

    overlay.innerHTML =
      '<div class="gp-portal-card">' +
      '  <div class="gp-top-line"></div>' +
      '  <img class="gp-logo" src="' +
      LOGO_URL +
      '" alt="Vapergate Wholesale">' +
      '  <div class="gp-label">ACCOUNT PORTAL</div>' +
      '  <h1 class="gp-title">WHOLESALE APPROVAL REQUIRED</h1>' +
      '  <p class="gp-description">Hi <strong>' +
      escapeHtml(lastEmail || "there") +
      "</strong>, you are signed in, but this portal only opens for customers in the <strong>Wholesale</strong> group. Ask an admin to approve your account, then refresh.</p>" +
      '  <div class="gp-actions">' +
      '    <button type="button" class="gp-btn-login" onclick="window.handleWholesaleRequest()">Inquire Status</button>' +
      '    <button type="button" class="gp-btn-request" onclick="window.handleGateLogout()">Log Out / Switch Account</button>' +
      "  </div>" +
      '  <a class="gp-reset" href="#" onclick="event.preventDefault(); window.routeToPortalLogin();">Open Account Settings</a>' +
      '  <div class="gp-footer">Contact: ' +
      SUPPORT_EMAIL +
      "</div>" +
      "</div>";
  }

  /* ---------- Access engine ---------- */

  function scheduleEvaluate(delay) {
    clearTimeout(evaluateTimer);
    evaluateTimer = setTimeout(
      function () {
        evaluateAccess();
      },
      typeof delay === "number" ? delay : 0,
    );
  }

  function evaluateAccess() {
    /* Account / sign-in UI must remain usable under the portal product flow */
    if (isAccountRoute()) {
      state = STATE.ACCOUNT;
      if (doc.body) {
        doc.body.classList.remove("gp-gate-locked");
        doc.body.classList.remove("gp-wholesale-approved");
      }
      hidePortal();
      return;
    }

    var ec = getEcwid();
    if (!ec || !ec.Customer || typeof ec.Customer.get !== "function") {
      if (state !== STATE.LOGIN && state !== STATE.PENDING) {
        renderBootPortal();
      }
      return;
    }

    ec.Customer.get(function (customer) {
      /* Route may have changed while Customer.get was in flight */
      if (isAccountRoute()) {
        state = STATE.ACCOUNT;
        if (doc.body) doc.body.classList.remove("gp-gate-locked");
        hidePortal();
        return;
      }

      if (!customer) {
        renderLoginPortal();
        return;
      }

      lastEmail = customer.email || lastEmail || "";

      if (isWholesaleCustomer(customer)) {
        unlockStore();
        return;
      }

      renderPendingPortal(lastEmail);
    });
  }

  function bindEcwidEvents() {
    var ec = getEcwid();
    if (!ec || eventsBound) return !!ec;

    if (ec.OnPageLoaded && typeof ec.OnPageLoaded.add === "function") {
      ec.OnPageLoaded.add(function () {
        scheduleEvaluate(0);
      });
    }

    if (ec.OnSetProfile && typeof ec.OnSetProfile.add === "function") {
      ec.OnSetProfile.add(function (customer) {
        // Fast path from Ecwid login/logout event (includes membership)
        if (isAccountRoute()) {
          scheduleEvaluate(0);
          return;
        }

        if (!customer) {
          renderLoginPortal();
          return;
        }

        lastEmail = customer.email || lastEmail || "";
        if (isWholesaleCustomer(customer)) {
          unlockStore();
          return;
        }

        renderPendingPortal(lastEmail);
      });
    }

    eventsBound = true;
    scheduleEvaluate(0);
    return true;
  }

  function waitForEcwidApi(attempt) {
    attempt = attempt || 0;
    var ec = getEcwid();

    if (ec) {
      if (
        ec.OnAPILoaded &&
        typeof ec.OnAPILoaded.add === "function" &&
        !ec.__gpApiHooked
      ) {
        ec.__gpApiHooked = true;
        ec.OnAPILoaded.add(function () {
          bindEcwidEvents();
          scheduleEvaluate(0);
        });
      }

      if (bindEcwidEvents()) return;
    }

    if (attempt > 240) {
      /* Ecwid never arrived — still present the Portal rather than a dead lock */
      renderLoginPortal();
      return;
    }

    setTimeout(function () {
      waitForEcwidApi(attempt + 1);
    }, 50);
  }

  function protectPortalFromHydration() {
    if (!doc.documentElement || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function () {
      if (state === STATE.APPROVED || state === STATE.ACCOUNT) return;
      if (!doc.getElementById("custom-gate-overlay")) {
        if (state === STATE.PENDING) renderPendingPortal(lastEmail);
        else if (state === STATE.LOGIN) renderLoginPortal();
        else renderBootPortal();
        scheduleEvaluate(50);
      }
    });

    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  function bindRouteWatchers() {
    win.addEventListener("hashchange", function () {
      scheduleEvaluate(0);
    });
    win.addEventListener("popstate", function () {
      scheduleEvaluate(0);
    });
  }

  function init() {
    if (started) return;
    started = true;

    renderBootPortal();
    createToastElement();
    protectPortalFromHydration();
    bindRouteWatchers();
    waitForEcwidApi(0);
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
