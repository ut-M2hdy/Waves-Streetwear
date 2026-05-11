var e=document.getElementById(`history-list`);function t(e){return String(e||`pending`).trim().toLowerCase()}async function n(){let n=await fetch(`/api/orders/my`);if(n.status===401){window.location.href=`/auth`;return}let r=(await n.json()).orders||[];if(!r.length){e.innerHTML=`<p class="desc">No orders yet.</p>`;return}e.innerHTML=r.map(e=>`
    ${(()=>{let n=Number(e.unit_price_dt)*Number(e.amount),r=Number(e.delivery_fee_dt||0),i=n+r;return`
    <article class="history-item">
      <div class="meta">
        <div class="name">${e.product_name}</div>
        <div class="price">${i.toFixed(2)} Dt</div>
      </div>
      <div>
        <span class="history-status-badge status-${t(e.status)}">${t(e.status)}</span>
      </div>
      <div class="desc">Color: ${e.color} • Size: ${e.size} • Amount: ${e.amount}</div>
      <div class="desc">Unit: ${Number(e.unit_price_dt).toFixed(2)} Dt + Delivery: ${r>0?`${r.toFixed(2)} Dt`:`OFF`} = Total: ${i.toFixed(2)} Dt</div>
      <div class="desc">Date: ${new Date(e.created_at).toLocaleString()}</div>
    </article>
  `})()}
  `).join(``)}n();