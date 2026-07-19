/* ==========================================================================
   WHOLESALE GATEWAY PORTAL - METICULOUS LOGICAL ARCHITECTURE
   ========================================================================== */
(function () {
  var win = window;
  var doc = document;

  // Direct path tracking utilities
  function isAccountPage() {
    return (
      win.location.pathname.includes("/account") ||
      win.location.hash.includes("account")
    );
  }

  // Direct, latency-free verification of persistent Ecwid authentication tokens
  function hasEcwidLoginCookie() {
    return doc.cookie.split(";").some(function (item) {
      var secureToken = item.trim();
      return (
        secureToken.indexOf("PStoken") !== -1 ||
        secureToken.indexOf("PSprofile") !== -1
      );
    });
  }

  // Dynamic injection of the Premium Custom Notification component
  function createToastElement() {
    var toast = doc.getElementById("gp-custom-toast");
    if (!toast) {
      toast = doc.createElement("div");
      toast.id = "gp-custom-toast";
      toast.className = "gp-toast-notification";
      toast.innerHTML =
        '<div class="gp-toast-content">' +
        '  <h4 class="gp-toast-title">Password Reset Route</h4>' +
        '  <p class="gp-toast-desc">Please proceed via the login portal panel interface. Enter your wholesale email ID and click the default platform recovery links provided there.</p>' +
        "</div>" +
        '<button class="gp-toast-close" onclick="window.dismissPortalToast()">×</button>';
      doc.body.appendChild(toast);
    }
  }

  // Notification Presentation Controller
  win.triggerPortalToast = function () {
    createToastElement();
    var toast = doc.getElementById("gp-custom-toast");
    if (toast) {
      toast.classList.add("gp-toast-active");
      // Auto dismissal cycle to protect layout real estate
      setTimeout(function () {
        window.dismissPortalToast();
      }, 8000);
    }
  };

  win.dismissPortalToast = function () {
    var toast = doc.getElementById("gp-custom-toast");
    if (toast) {
      toast.classList.remove("gp-toast-active");
    }
  };

  // Advanced Application UI Factory
  function showOverlay() {
    var overlay = doc.getElementById("custom-gate-overlay");
    if (!overlay) {
      overlay = doc.createElement("div");
      overlay.id = "custom-gate-overlay";
      doc.body.appendChild(overlay);
    }

    // Render verified copywriting schema
    overlay.innerHTML =
      '<div class="gp-portal-card">' +
      '  <div class="gp-top-line"></div>' +
      '  <img class="gp-logo" src="https://lh3.googleusercontent.com/d/1OthtntijCELlEGcxECTkSL9iQMUjoQXm" alt="Vapergate Wholesale">' +
      '  <div class="gp-label">ACCOUNT PORTAL</div>' +
      '  <h1 class="gp-title">ACCOUNT LOGIN REQUIRED</h1>' +
      '  <p class="gp-description">This storefront is restricted to verified approved accounts only, Please sign in:</p>' +
      '  <div class="gp-actions">' +
      '    <button class="gp-btn-login" onclick="window.routeToPortalLogin()">Login To Account</button>' +
      "  </div>" +
      '  <a class="gp-reset" href="#" onclick="event.preventDefault(); window.triggerPortalToast();">Forgot password?</a>' +
      '  <div class="gp-footer">Contact: wholesale@vapergate.com</div>' +
      "</div>";

    overlay.style.setProperty("display", "flex", "important");

    // Micro-timeout pushes layout transitions into execution
    setTimeout(function () {
      overlay.classList.add("gp-visible");
    }, 20);
  }

  function hideOverlay() {
    var overlay = doc.getElementById("custom-gate-overlay");
    if (overlay) {
      overlay.classList.remove("gp-visible");
      // Allow smooth alpha transitions to complete before removing block properties
      setTimeout(function () {
        if (!overlay.classList.contains("gp-visible")) {
          overlay.style.setProperty("display", "none", "important");
        }
      }, 300);
    }
  }

  // Intelligent Navigation Routing Engine
  win.routeToPortalLogin = function () {
    var ec = win.Ecwid;

    // Native framework checks prevent hard window reloads, preserving web app transitions
    if (ec && typeof ec.openPage === "function") {
      try {
        hideOverlay();
        ec.openPage("account");
        return;
      } catch (err) {
        console.warn("Ecwid SPA Routing failover triggered:", err);
      }
    }

    // Reliable fallback option if the Ecwid module is initialization-lagged
    win.location.href = "/products/account";
  };

  // Main Security Orchestrator
  function enforceAccess() {
    if (isAccountPage()) {
      hideOverlay();
      return;
    }

    if (hasEcwidLoginCookie()) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }

  // High-frequency structural synchronization check loop
  function runLoop() {
    enforceAccess();
    setTimeout(runLoop, 200);
  }

  // System Entry Bindings
  function initApp() {
    createToastElement();
    runLoop();

    // Listen to Ecwid-specific page navigation events directly to instantly toggle access state
    if (win.Ecwid && win.Ecwid.OnPageLoaded) {
      win.Ecwid.OnPageLoaded.add(function (page) {
        enforceAccess();
      });
    }
  }

  if (doc.body) {
    initApp();
  } else {
    doc.addEventListener("DOMContentLoaded", initApp);
  }
})();
