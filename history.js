const historyList = document.getElementById("history-list");

function normalizeStatus(status) {
  return String(status || "pending").trim().toLowerCase();
}

async function loadHistory() {
  const response = await fetch("/api/orders/my");

  if (response.status === 401) {
    window.location.href = "/auth";
    return;
  }

  const payload = await response.json();
  const orders = payload.orders || [];

  if (!orders.length) {
    historyList.innerHTML = '<p class="desc">No orders yet.</p>';
    return;
  }

  historyList.innerHTML = orders.map((o) => `
    ${(() => {
      const productTotal = Number(o.unit_price_dt) * Number(o.amount);
      const delivery = Number(o.delivery_fee_dt || 0);
      const total = productTotal + delivery;
      return `
    <article class="history-item">
      <div class="meta">
        <div class="name">${o.product_name}</div>
        <div class="price">${total.toFixed(2)} Dt</div>
      </div>
      <div>
        <span class="history-status-badge status-${normalizeStatus(o.status)}">${normalizeStatus(o.status)}</span>
      </div>
      <div class="desc">Color: ${o.color} • Size: ${o.size} • Amount: ${o.amount}</div>
      <div class="desc">Unit: ${Number(o.unit_price_dt).toFixed(2)} Dt + Delivery: ${delivery > 0 ? `${delivery.toFixed(2)} Dt` : "OFF"} = Total: ${total.toFixed(2)} Dt</div>
      <div class="desc">Date: ${new Date(o.created_at).toLocaleString()}</div>
    </article>
  `;
    })()}
  `).join("");
}

loadHistory();
