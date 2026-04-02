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
    <a class="profile-menu-item" href="profile.html">Edit Profile</a>
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
    authBtn.href = "auth.html";
    if (adminBtn) adminBtn.classList.add("hidden");
    if (historyBtn) historyBtn.classList.add("hidden");
    if (profileBtn) profileBtn.classList.add("hidden");
    return;
  }

  if (!payload.user) {
    const isHistoryPage = window.location.pathname.endsWith("/history.html") || window.location.pathname.endsWith("history.html");
    const isProfilePage = window.location.pathname.endsWith("/profile.html") || window.location.pathname.endsWith("profile.html");
    if (isHistoryPage) {
      window.location.href = "auth.html";
      return;
    }
    if (isProfilePage) {
      window.location.href = "auth.html";
      return;
    }

    removeProfileMenu(authBtn);
    authBtn.textContent = "Login";
    authBtn.href = "auth.html";
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
    } else {
      adminBtn.classList.add("hidden");
    }
  }

  mountProfileMenu(authBtn, payload.user);
}

refreshAuthButtons();
