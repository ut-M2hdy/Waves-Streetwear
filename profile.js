const contactForm = document.getElementById("profile-contact-form");
const passwordForm = document.getElementById("profile-password-form");
const profilePhoneInput = document.getElementById("profile-phone");
const profileAddressInput = document.getElementById("profile-address");
const profilePasswordWrap = document.getElementById("profile-password-wrap");
const profileContactPasswordInput = document.getElementById("profile-contact-password");
const profileEditBtn = document.getElementById("profile-edit-btn");
const profileSaveBtn = document.getElementById("profile-save-btn");
const newPasswordInput = document.getElementById("new-password");
const newPasswordStrengthEl = document.getElementById("new-password-strength");
const messageBox = document.getElementById("profile-message");
let contactEditMode = false;

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
  if (!newPasswordStrengthEl) return;
  const level = getPasswordLevel(password);
  newPasswordStrengthEl.classList.remove("level-low", "level-mid", "level-strong");
  newPasswordStrengthEl.classList.add(`level-${level}`);
  newPasswordStrengthEl.textContent = `Security level: ${level}`;
}

function setContactEditMode(enabled) {
  contactEditMode = Boolean(enabled);

  profilePhoneInput.readOnly = !contactEditMode;
  profileAddressInput.readOnly = !contactEditMode;

  if (profilePasswordWrap) {
    profilePasswordWrap.classList.toggle("hidden", !contactEditMode);
  }
  if (profileContactPasswordInput) {
    profileContactPasswordInput.disabled = !contactEditMode;
    profileContactPasswordInput.required = contactEditMode;
    if (!contactEditMode) {
      profileContactPasswordInput.value = "";
    }
  }

  profileEditBtn?.classList.toggle("hidden", contactEditMode);
  profileSaveBtn?.classList.toggle("hidden", !contactEditMode);
}

async function loadProfile() {
  try {
    const response = await fetch("/api/profile", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "auth.html";
      return;
    }
    const payload = await response.json();
    if (!response.ok || !payload.user) {
      showMessage(payload.message || "Could not load profile.");
      return;
    }

    profilePhoneInput.value = payload.user.phone || "+216";
    profileAddressInput.value = payload.user.address || "";
  } catch {
    showMessage("Server not reachable. Start backend first.");
  }
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactEditMode) return;

  const data = Object.fromEntries(new FormData(contactForm).entries());

  if (!isValidTunisiaPhone(data.phone)) {
    showMessage("Phone must be +216 followed by 8 numbers.");
    return;
  }
  if (!String(data.address || "").trim()) {
    showMessage("Address is required.");
    return;
  }

  const response = await fetch("/api/profile/contact", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    showMessage(payload.message || "Could not update profile.");
    return;
  }

  showMessage("Profile updated successfully.", true);
  setContactEditMode(false);
});

profileEditBtn?.addEventListener("click", () => {
  setContactEditMode(true);
  profilePhoneInput.focus();
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(passwordForm).entries());
  const level = getPasswordLevel(data.newPassword);

  if (level === "low") {
    showMessage("New password security is low. Use a mid or strong password.");
    return;
  }
  if (String(data.newPassword || "") !== String(data.confirmNewPassword || "")) {
    showMessage("New password confirmation does not match.");
    return;
  }

  const response = await fetch("/api/profile/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    showMessage(payload.message || "Could not change password.");
    return;
  }

  showMessage("Password changed successfully.", true);
  passwordForm.reset();
  renderPasswordLevel("");
});

enforcePhonePrefix(profilePhoneInput);
newPasswordInput?.addEventListener("input", () => {
  renderPasswordLevel(newPasswordInput.value);
});
renderPasswordLevel("");
setContactEditMode(false);
loadProfile();
