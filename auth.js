const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const messageBox = document.getElementById("auth-message");
const loginPhoneInput = document.getElementById("login-phone");
const registerPhoneInput = document.getElementById("register-phone");
const registerPasswordInput = document.getElementById("register-password");
const passwordStrengthEl = document.getElementById("password-strength");

function showMessage(message, ok = false) {
  messageBox.textContent = message;
  messageBox.style.display = "block";
  messageBox.style.color = ok ? "#047857" : "#b91c1c";
}

function enforcePhonePrefix(input) {
  if (!input) return;

  const fixValue = () => {
    let value = String(input.value || "").replace(/\s+/g, "");
    if (!value.startsWith("+216")) {
      value = `+216${value.replace(/^\+?216?/, "")}`;
    }
    const digits = value.slice(4).replace(/\D/g, "").slice(0, 8);
    input.value = `+216${digits}`;
  };

  input.addEventListener("input", fixValue);
  input.addEventListener("focus", () => {
    if (!input.value.startsWith("+216")) {
      input.value = "+216";
    }
  });
  input.addEventListener("keydown", (event) => {
    if ((event.key === "Backspace" || event.key === "Delete") && input.selectionStart <= 4) {
      event.preventDefault();
    }
  });

  fixValue();
}

function isValidTunisiaPhone(phone) {
  return /^\+216\d{8}$/.test(String(phone || "").trim());
}

function isValidFullName(fullName) {
  const value = String(fullName || "").trim();
  if (!value || /\d/.test(value)) return false;
  return value.includes(" ");
}

function getPasswordLevel(password) {
  const value = String(password || "");
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return "low";
  if (score <= 3) return "mid";
  return "strong";
}

function renderPasswordLevel(password) {
  if (!passwordStrengthEl) return;
  const level = getPasswordLevel(password);
  passwordStrengthEl.classList.remove("level-low", "level-mid", "level-strong");
  passwordStrengthEl.classList.add(`level-${level}`);
  passwordStrengthEl.textContent = `Security level: ${level}`;
}

enforcePhonePrefix(loginPhoneInput);
enforcePhonePrefix(registerPhoneInput);
registerPasswordInput?.addEventListener("input", () => {
  renderPasswordLevel(registerPasswordInput.value);
});
renderPasswordLevel(registerPasswordInput?.value || "");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());

  if (!isValidTunisiaPhone(data.phone)) {
    showMessage("Phone must be +216 followed by 8 numbers.");
    return;
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(payload.message || "Login failed.");
      return;
    }

    showMessage("Logged in successfully.", true);
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  } catch (error) {
    showMessage("Cannot connect to server. Start backend and open http://localhost:3000/auth");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(registerForm).entries());

  if (!isValidFullName(data.fullName)) {
    showMessage("Full name must contain a space and no numbers.");
    return;
  }
  if (!isValidTunisiaPhone(data.phone)) {
    showMessage("Phone must be +216 followed by 8 numbers.");
    return;
  }
  if (!String(data.address || "").trim()) {
    showMessage("Address is required.");
    return;
  }

  const passwordLevel = getPasswordLevel(data.password);
  if (passwordLevel === "low") {
    showMessage("Password security is low. Use a mid or strong password.");
    return;
  }
  if (String(data.password || "") !== String(data.confirmPassword || "")) {
    showMessage("Password confirmation does not match.");
    return;
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(payload.message || "Register failed.");
      return;
    }

    showMessage("Account created and logged in.", true);
    setTimeout(() => {
      window.location.href = "/";
    }, 700);
  } catch (error) {
    showMessage("Cannot connect to server. Start backend and open http://localhost:3000/auth");
  }
});
