const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Segoe UI", Tahoma, sans-serif;
      background: radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.2), transparent 28%),
                  radial-gradient(circle at 85% 5%, rgba(34, 211, 238, 0.2), transparent 24%),
                  #0b1220;
      color: #e2e8f0;
      padding: 24px;
    }
    .card {
      width: min(640px, 100%);
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 16px;
      padding: 28px;
      text-align: center;
      box-shadow: 0 16px 48px rgba(2, 6, 23, 0.5);
    }
    h1 {
      margin: 0 0 10px;
      font-size: clamp(26px, 4.5vw, 38px);
      letter-spacing: -0.02em;
    }
    p {
      margin: 0;
      color: #cbd5e1;
      font-size: 18px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Waves Streetwear</h1>
    <p>The website is down for maintenance, comeback later.</p>
  </main>
</body>
</html>`;

function renderMaintenancePage() {
  document.open();
  document.write(MAINTENANCE_HTML);
  document.close();
}

async function enforceMaintenanceMode() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (response.status === 503) {
      renderMaintenancePage();
      return true;
    }

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => ({}));
    if (payload?.ok === false) {
      renderMaintenancePage();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function removeProfileMenu(authBtn) {
  const wrapper = authBtn.closest(".profile-menu-wrapper");
  if (wrapper) {
    wrapper.parentNode?.insertBefore(authBtn, wrapper);
    wrapper.remove();
  }
  authBtn.classList.remove("profile-trigger");
}

function mountProfileMenu(authBtn, user) {
  removeProfileMenu(authBtn);

  const wrapper = document.createElement("div");
  wrapper.className = "profile-menu-wrapper";

  const panel = document.createElement("div");
  panel.className = "profile-menu-panel";
  panel.innerHTML = `
    <a class="profile-menu-item" href="/profile">Edit Profile</a>
    <button type="button" class="profile-menu-item" id="profile-logout-btn">Logout (${user.fullName})</button>
  `;

  authBtn.classList.add("profile-trigger");
  authBtn.textContent = "Profile";
  authBtn.href = "#";
  authBtn.onclick = (event) => {
    event.preventDefault();
  };

  authBtn.parentNode?.insertBefore(wrapper, authBtn);
  wrapper.appendChild(authBtn);
  wrapper.appendChild(panel);

  const logoutBtn = panel.querySelector("#profile-logout-btn");
  logoutBtn?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  });
}

function setAdminPendingBadge(adminBtn, pendingCount) {
  if (!adminBtn) return;

  let badge = adminBtn.querySelector(".header-notification-badge");
  const nextCount = Number(pendingCount || 0);

  if (!nextCount) {
    badge?.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement("span");
    badge.className = "header-notification-badge";
    adminBtn.appendChild(badge);
  }

  badge.textContent = nextCount > 99 ? "99+" : String(nextCount);
}

async function refreshAdminPendingBadge(adminBtn) {
  if (!adminBtn) return;

  try {
    const response = await fetch("/api/admin/summary", { cache: "no-store" });
    if (!response.ok) {
      setAdminPendingBadge(adminBtn, 0);
      return;
    }

    const payload = await response.json();
    setAdminPendingBadge(adminBtn, payload.pendingCount || 0);
  } catch {
    setAdminPendingBadge(adminBtn, 0);
  }
}

async function refreshAuthButtons() {
  const authBtn = document.getElementById("auth-btn");
  const adminBtn = document.getElementById("admin-btn");
  const historyBtn = document.getElementById("history-btn");
  const profileBtn = document.getElementById("profile-btn");
  if (!authBtn) return;

  let payload;
  try {
    const response = await fetch("/api/auth/me");
    payload = await response.json();
  } catch {
    removeProfileMenu(authBtn);
    authBtn.textContent = "Login";
    authBtn.href = "/auth";
    if (adminBtn) adminBtn.classList.add("hidden");
    if (historyBtn) historyBtn.classList.add("hidden");
    if (profileBtn) profileBtn.classList.add("hidden");
    return;
  }

  if (!payload.user) {
    const isHistoryPage = window.location.pathname.endsWith("/history");
    const isProfilePage = window.location.pathname.endsWith("/profile");
    if (isHistoryPage) {
      window.location.href = "/auth";
      return;
    }
    if (isProfilePage) {
      window.location.href = "/auth";
      return;
    }

    removeProfileMenu(authBtn);
    authBtn.textContent = "Login";
    authBtn.href = "/auth";
    authBtn.onclick = null;
    if (adminBtn) adminBtn.classList.add("hidden");
    if (historyBtn) historyBtn.classList.add("hidden");
    if (profileBtn) profileBtn.classList.add("hidden");
    return;
  }

  if (historyBtn) {
    historyBtn.classList.remove("hidden");
  }
  if (profileBtn) {
    profileBtn.classList.add("hidden");
  }

  if (adminBtn) {
    if (payload.user.role === "admin") {
      adminBtn.classList.remove("hidden");
      refreshAdminPendingBadge(adminBtn);
    } else {
      adminBtn.classList.add("hidden");
      setAdminPendingBadge(adminBtn, 0);
    }
  }

  mountProfileMenu(authBtn, payload.user);
}

(async () => {
  const inMaintenance = await enforceMaintenanceMode();
  if (inMaintenance) return;
  refreshAuthButtons();
})();
