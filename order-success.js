const successMainText = document.getElementById("success-main-text");
const statusBtn = document.getElementById("status-btn");

const params = new URLSearchParams(window.location.search);
const orderId = params.get("orderId");
const fullName = params.get("fullName");
const productName = params.get("productName");

if (successMainText) {
  const parts = [];
  if (fullName) parts.push(`Thanks ${fullName}`);
  if (orderId) parts.push(`Order #${orderId}`);
  if (productName) parts.push(`for ${productName}`);

  successMainText.textContent = parts.length
    ? `${parts.join(" ")} is registered.`
    : "Thank you, your order is registered.";
}

async function toggleStatusButton() {
  try {
    const response = await fetch("/api/auth/me");
    const payload = await response.json();
    if (payload.user) {
      statusBtn?.classList.remove("hidden");
    }
  } catch {
    // ignore if backend not reachable
  }
}

toggleStatusButton();
