var e=document.getElementById(`admin-stats`),t=document.getElementById(`admin-products`),n=document.getElementById(`admin-orders`),r=document.getElementById(`admin-older-orders`),i=document.getElementById(`admin-older-orders-btn`),a=document.getElementById(`admin-orders-bottom-trigger`),o=document.getElementById(`section-sells`),s=document.getElementById(`admin-users`),c=document.getElementById(`admin-not-users`),l=document.getElementById(`admin-users-search`),u=document.getElementById(`admin-not-users-search`),d=document.getElementById(`admin-revenues`),f=document.getElementById(`admin-deleted-revenues`),p=document.getElementById(`admin-monthly-sales`),m=document.getElementById(`admin-monthly-revenues`),h=document.getElementById(`admin-revenue-adjust-form`),g=document.getElementById(`add-product-form`),_=document.getElementById(`admin-message`),v=document.getElementById(`admin-month-details-dialog`),y=document.getElementById(`admin-month-details-title`),b=document.getElementById(`admin-month-details-body`),x=document.getElementById(`admin-month-details-close`),S=document.querySelectorAll(`.admin-section`),C=document.querySelectorAll(`.admin-nav-btn`),ee=[`pending`,`confirmed`,`delivered`,`returned`,`cancelled`],w=[`B`,`W`,`Br`,`P`,`Grey`],T=1440*60*1e3;async function E(){try{return(await fetch(`/api/health`,{cache:`no-store`})).status!==503}catch{return!0}}var D=[],O=null,k=[],A=[],j=[],M=[];function N(e){let[t,n]=String(e||``).split(`-`),r=Number(t),i=Number(n);return!Number.isFinite(r)||!Number.isFinite(i)||i<1||i>12?String(e||``):new Date(r,i-1,1).toLocaleString(void 0,{month:`long`,year:`numeric`})}function P(e,t){!v||!y||!b||(y.textContent=e,b.innerHTML=t,v.showModal())}function F(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function te({title:e,monthKey:t,summaryRows:n,tableHeaders:r,tableRows:i},a=null){let o=a||window.open(`about:blank`,`_blank`);if(!o){I(`Popup blocked. Allow popups to open fiche in new tab.`);return}let s=n.map(e=>`
    <tr>
      <td>${F(e.label)}</td>
      <td>${F(e.value)}</td>
    </tr>
  `).join(``),c=r.map(e=>`<th>${F(e)}</th>`).join(``),l=i.length?i.map(e=>`<tr>${e.map(e=>`<td>${F(e)}</td>`).join(``)}</tr>`).join(``):`<tr><td colspan="${r.length}">No data for this month.</td></tr>`;o.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${F(e)} - ${F(N(t))}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .sub { color: #4b5563; margin-bottom: 16px; }
    .actions { margin: 0 0 16px; }
    button { padding: 8px 12px; border: 1px solid #9ca3af; border-radius: 8px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    .summary td:first-child { width: 240px; font-weight: 700; }
    @media print { .actions { display: none; } body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>${F(e)}</h1>
  <div class="sub">Month: ${F(N(t))} (${F(t)})</div>
  <div class="actions">
    <button onclick="window.print()">Download as PDF</button>
  </div>

  <table class="summary">
    <thead><tr><th>Summary</th><th>Value</th></tr></thead>
    <tbody>${s}</tbody>
  </table>

  <table>
    <thead><tr>${c}</tr></thead>
    <tbody>${l}</tbody>
  </table>
</body>
</html>`),o.document.close()}x?.addEventListener(`click`,()=>{v?.close()});function I(e,t=!1){_.textContent=e,_.style.display=`block`,_.style.color=t?`#047857`:`#b91c1c`;let n=document.getElementById(`admin-toast`);n||(n=document.createElement(`div`),n.id=`admin-toast`,n.className=`admin-toast`,document.body.appendChild(n)),n.textContent=e,n.classList.toggle(`ok`,t),n.classList.add(`show`),window.clearTimeout(I._toastTimer),I._toastTimer=window.setTimeout(()=>{n.classList.remove(`show`)},2400)}function L(e,t){e&&(e.innerHTML=`<p class="desc">${t}</p>`)}function R(e){return String(e??``).replace(/"/g,`&quot;`)}function ne(e){return String(e||``).split(/[\n,]+/).map(e=>e.trim()).filter(Boolean)[0]||``}var z=new Set([`B`,`W`,`Br`,`P`,`Grey`]);function re(e){let t=String(e||``).split(`,`).map(e=>e.trim()).filter(e=>z.has(e));return t.length?t:[`W`]}function B(e,t=`W`,n=`W`){let r=e.querySelector(`.admin-color-palette`),i=e.querySelector(`input[name="colorsCsv"]`),a=e.querySelector(`input[name="mainColor"]`);if(!r||!i||!a)return;let o=new Set(re(t||i.value)),s=o.has(n)?n:Array.from(o)[0],c=()=>{o.size||o.add(`W`),o.has(s)||(s=Array.from(o)[0]),i.value=w.filter(e=>o.has(e)).join(`,`),a.value=s,i.dispatchEvent(new Event(`change`,{bubbles:!0})),r.querySelectorAll(`.admin-color-btn`).forEach(e=>{let t=e.dataset.color;e.classList.toggle(`active`,o.has(t))}),r.querySelectorAll(`.admin-main-color-radio`).forEach(e=>{let t=e.value;e.checked=t===s,e.disabled=!o.has(t)})};r.innerHTML=w.map(t=>`
    <div class="admin-color-choice">
      <button type="button" class="color-dot admin-color-btn ${o.has(t)?`active`:``}" data-color="${t}" aria-label="${t}" title="${t}"></button>
      <label class="admin-main-color-label">
        <input type="radio" class="admin-main-color-radio" name="mainColorChoice-${e.dataset.id||`add`}" value="${t}">
        Main
      </label>
    </div>
  `).join(``),r.querySelectorAll(`.admin-color-btn`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.color;t&&(o.has(t)&&o.size===1||(o.has(t)?o.delete(t):o.add(t),c()))})}),r.querySelectorAll(`.admin-main-color-radio`).forEach(e=>{e.addEventListener(`change`,()=>{e.checked&&o.has(e.value)&&(s=e.value,c())})}),c()}function ie(e){let t={};return String(e||``).split(/\r?\n+/).forEach(e=>{let n=e.trim();if(!n)return;let[r,i]=n.split(`=`);if(!r||!i)return;let a=r.trim(),o=i.split(`,`).map(e=>e.trim()).filter(Boolean);z.has(a)&&o.length&&(t[a]=o)}),t}function ae(e,t){return t.filter(t=>Array.isArray(e[t])&&e[t].length).map(t=>`${t}=${e[t].join(`,`)}`).join(`
`)}async function oe(){try{let e=await fetch(`/api/admin/image-files`,{cache:`no-store`});if(!e.ok){I(`Could not load image list from img folder.`);return}let t=await e.json();D=Array.isArray(t.files)?t.files:[]}catch{I(`Could not load image list from img folder.`)}}function V(e,t=``){let n=e.querySelector(`.admin-color-image-editor`),r=e.querySelector(`input[name="colorsCsv"]`),i=e.querySelector(`input[name="imageUrl"]`),a=e.querySelector(`input[name="colorImagesMap"]`);if(!n||!r||!i||!a)return;let o=ie(t),s=(e=[])=>[`<option value="">-- choose --</option>`,...D.map(t=>`
      <option value="${R(t)}" ${e.includes(t)?`selected`:``}>${t}</option>
    `)].join(``),c=e=>{a.value=ae(o,e);let t=``;for(let n of e)if(Array.isArray(o[n])&&o[n].length){t=o[n][0];break}i.value=t},l=()=>{let e=re(r.value);if(!D.length){n.innerHTML=`<p class="desc">No image files found in img folder or list not loaded yet.</p>`,c(e);return}n.innerHTML=`
      <div class="admin-status-label">Pictures by color</div>
      ${e.map(e=>{let t=o[e]||[],n=t[0]||``,r=t.slice(1);return`
          <article class="history-item">
            <div class="name">Color ${e}</div>
            <label>Main image (${e})
              <select data-role="main" data-color="${e}">
                ${s(n?[n]:[])}
              </select>
            </label>
            <label>Other pictures (${e})
              <select multiple size="6" data-role="extra" data-color="${e}">
                ${s(r)}
              </select>
            </label>
          </article>
        `}).join(``)}
    `,n.querySelectorAll(`select[data-role="main"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.dataset.color;if(!n)return;let r=(o[n]||[]).slice(1).filter(e=>e!==t.value);o[n]=[t.value,...r].filter(Boolean),c(e)})}),n.querySelectorAll(`select[data-role="extra"]`).forEach(t=>{t.addEventListener(`change`,()=>{let n=t.dataset.color;if(!n)return;let r=Array.from(t.selectedOptions).map(e=>e.value).filter(Boolean);o[n]=[(o[n]||[])[0]||``,...r].filter(Boolean),c(e)})}),c(e)};r.addEventListener(`input`,()=>{l()}),r.addEventListener(`change`,()=>{l()}),l()}async function se(){let t;try{t=await(await fetch(`/api/auth/me`)).json()}catch{return alert(`Server is not running. Start backend first.`),!1}return t.user?(O=Number(t.user.id||0),t.user.role===`admin`?!0:(H(`section-overview`),e.innerHTML=`
      <article class="history-item">
        <div class="name">Admin access required</div>
        <div class="desc">Only developer can promote account in SQL database.</div>
        <div class="desc">Example: UPDATE users SET role = 'admin' WHERE phone = '+216XXXXXXXX';</div>
      </article>
    `,g.closest(`#section-add-product`)?.classList.add(`hidden`),document.getElementById(`section-products`)?.classList.add(`hidden`),document.getElementById(`section-sells`)?.classList.add(`hidden`),document.getElementById(`section-revenues`)?.classList.add(`hidden`),document.getElementById(`section-deleted-revenues`)?.classList.add(`hidden`),document.getElementById(`section-users`)?.classList.add(`hidden`),document.getElementById(`section-not-users`)?.classList.add(`hidden`),C.forEach(e=>{e.dataset.target!==`section-overview`&&e.classList.add(`hidden`)}),!1)):(window.location.href=`/auth`,!1)}function H(e){S.forEach(t=>{t.classList.toggle(`hidden`,t.id!==e)}),C.forEach(t=>{t.classList.toggle(`active`,t.dataset.target===e)}),X()}C.forEach(e=>{e.addEventListener(`click`,async()=>{H(e.dataset.target),e.dataset.target===`section-deleted-revenues`&&await he()})}),H(`section-overview`);async function U(){try{let t=await fetch(`/api/admin/summary`);if(!t.ok){L(e,`Could not load summary. Restart server and check admin login.`);return}let n=await t.json();e.innerHTML=`
      <div class="admin-card"><strong>Total Orders</strong><span>${n.ordersCount}</span></div>
      <div class="admin-card"><strong>Pending</strong><span>${n.pendingCount}</span></div>
      <div class="admin-card"><strong>Total Sales</strong><span>${Number(n.totalSalesDt).toFixed(2)} Dt</span></div>
    `}catch{L(e,`Server not reachable. Start backend first.`)}}async function W(){if(!p)return;let e;try{e=await fetch(`/api/admin/sales/monthly`,{cache:`no-store`})}catch{L(p,`Server not reachable. Start backend first.`);return}if(!e.ok){L(p,`Could not load monthly sells.`);return}let t=await e.json(),n=Array.isArray(t.months)?t.months:[];if(!n.length){p.innerHTML=`<p class="desc">No monthly sells yet.</p>`;return}p.innerHTML=n.map(e=>`
    <article class="history-item">
      <div class="meta">
        <div class="name">${N(e.monthKey)}</div>
        <div class="price">${Number(e.salesDt||0).toFixed(2)} Dt</div>
      </div>
      <div class="desc">Orders: ${Number(e.ordersCount||0)}</div>
      <button type="button" class="btn admin-month-view-btn" data-kind="sales" data-month="${e.monthKey}">Open fiche</button>
    </article>
  `).join(``),p.querySelectorAll(`button[data-kind="sales"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.month;if(!t)return;let n=window.open(`about:blank`,`_blank`);if(!n){I(`Popup blocked. Allow popups to open fiche in new tab.`);return}n.document.write(`<html><body style='font-family:Arial,sans-serif;padding:18px'>Loading fiche...</body></html>`),n.document.close();let r=await fetch(`/api/admin/sales/monthly/${encodeURIComponent(t)}`,{cache:`no-store`}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not load month details.`),n.document.body.innerHTML=`Could not load fiche.`;return}let a=Array.isArray(i.orders)?i.orders:[],o=new Map,s=0,c=0;a.forEach(e=>{let t=String(e.product_name||``).trim(),n=Number(e.amount||0),r=Number(e.unit_price_dt||0)*n;if(!t||n<=0)return;let i=o.get(t)||{qty:0,sales:0};i.qty+=n,i.sales+=r,o.set(t,i),s+=n,c+=r});let l=Array.from(o.entries()).filter(([,e])=>e.qty>0).sort((e,t)=>t[1].qty-e[1].qty).map(([e,t])=>[e,String(t.qty),`${t.sales.toFixed(2)} Dt`]);te({title:`Monthly Sells Fiche`,monthKey:t,summaryRows:[{label:`Total sold hoodies`,value:String(s)},{label:`Total product sales`,value:`${c.toFixed(2)} Dt`},{label:`Different hoodie types`,value:String(l.length)}],tableHeaders:[`Hoodie`,`Sold qty`,`Sales`],tableRows:l},n)})})}async function G(){if(!m)return;let e;try{e=await fetch(`/api/admin/revenues/monthly`,{cache:`no-store`})}catch{L(m,`Server not reachable. Start backend first.`);return}if(!e.ok){L(m,`Could not load monthly revenues.`);return}let t=await e.json(),n=Array.isArray(t.months)?t.months:[];if(!n.length){m.innerHTML=`<p class="desc">No monthly revenues yet.</p>`;return}m.innerHTML=n.map(e=>`
    <article class="history-item revenue-item ${Number(e.totalDt)>=0?`is-add`:`is-remove`}">
      <div class="meta">
        <div class="name">${N(e.monthKey)}</div>
        <div class="price revenue-amount ${Number(e.totalDt)>=0?`is-add`:`is-remove`}">${ce(e.totalDt)}</div>
      </div>
      <div class="desc">Delivered net: ${Number(e.salesNetDt||0).toFixed(2)} Dt</div>
      <div class="desc">Manual: ${Number(e.manualAdjustmentsDt||0).toFixed(2)} Dt</div>
      <button type="button" class="btn admin-month-view-btn" data-kind="revenue" data-month="${e.monthKey}">Open fiche</button>
    </article>
  `).join(``),m.querySelectorAll(`button[data-kind="revenue"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.month;if(!t)return;let n=window.open(`about:blank`,`_blank`);if(!n){I(`Popup blocked. Allow popups to open fiche in new tab.`);return}n.document.write(`<html><body style='font-family:Arial,sans-serif;padding:18px'>Loading fiche...</body></html>`),n.document.close();let r=await fetch(`/api/admin/revenues/monthly/${encodeURIComponent(t)}`,{cache:`no-store`}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not load month details.`),n.document.body.innerHTML=`Could not load fiche.`;return}let a=Array.isArray(i.entries)?i.entries:[],o=a.filter(e=>e.kind===`sale_add`).reduce((e,t)=>e+Number(t.amountDt||0),0),s=a.filter(e=>e.kind===`sewing_remove`).reduce((e,t)=>e+Math.abs(Number(t.amountDt||0)),0),c=a.filter(e=>e.kind===`adjustment`&&Number(e.amountDt||0)>0).reduce((e,t)=>e+Number(t.amountDt||0),0),l=a.filter(e=>e.kind===`adjustment`&&Number(e.amountDt||0)<0).reduce((e,t)=>e+Math.abs(Number(t.amountDt||0)),0);te({title:`Monthly Revenue Fiche`,monthKey:t,summaryRows:[{label:`Hoodie sales added`,value:`+${o.toFixed(2)} Dt`},{label:`Sewing removed`,value:`-${s.toFixed(2)} Dt`},{label:`Manual added`,value:`+${c.toFixed(2)} Dt`},{label:`Manual removed`,value:`-${l.toFixed(2)} Dt`},{label:`Net total`,value:`${Number(i.totalDt||0).toFixed(2)} Dt`}],tableHeaders:[`Type`,`Title`,`Amount`],tableRows:a.map(e=>[e.kind===`sale_add`?`Sale +`:e.kind===`sewing_remove`?`Sewing -`:`Manual`,e.title,ce(e.amountDt)])},n)})})}async function K(){if(!await E()){L(t,`Database is under maintenance. Please try again shortly.`);return}let e;try{e=await fetch(`/api/admin/products`)}catch{L(t,`Server not reachable. Start backend first.`);return}if(!e.ok){L(t,(await e.json().catch(()=>({}))).message||`Could not load products. Make sure server is restarted.`);return}let n=(await e.json()).products||[];if(!n.length){t.innerHTML=`<p class="desc">No products in database yet.</p>`;return}t.innerHTML=n.map(e=>`
    <form class="history-item admin-product-form" data-id="${e.id}">
      <label>Name
        <input name="name" value="${R(e.name)}" required>
      </label>
      <label>Price (Dt)
        <input name="priceDt" type="number" min="1" step="0.01" value="${(e.price_cents/100).toFixed(2)}" required>
      </label>
      <label>Wave
        <select name="wave" required>
          <option value="Scene Stealer" ${String(e.wave)===`Scene Stealer`?`selected`:``}>Scene Stealer</option>
          <option value="1stDrop" ${String(e.wave)===`1stDrop`?`selected`:``}>Cold Nights Drop</option>
          <option value="CAIROKEE" ${String(e.wave)===`CAIROKEE`?`selected`:``}>CAIROKEE</option>
          <option value="LEMHAF" ${String(e.wave)===`LEMHAF`?`selected`:``}>LEMHAF</option>
          <option value="UPSIDE DOWN" ${String(e.wave)===`UPSIDE DOWN`?`selected`:``}>UPSIDE DOWN</option>
        </select>
      </label>
      <label>Colors
        <div class="admin-color-palette" data-palette="edit"></div>
        <input type="hidden" name="colorsCsv" value="${R(e.colors_csv||`W`)}">
        <input type="hidden" name="mainColor" value="${R(e.main_color||`W`)}">
      </label>
      <label class="payment-option">
        <input name="soldOut" type="checkbox" ${Number(e.sold_out||0)===1?`checked`:``}>
        Sold out
      </label>
      <div class="admin-color-image-editor" data-editor="edit"></div>
      <input type="hidden" name="imageUrl" value="${R(e.image_url||``)}">
      <input type="hidden" name="colorImagesMap" value="${R(e.color_images_map||``)}">
      <label>Description
        <textarea name="description">${e.description||``}</textarea>
      </label>
      <button class="btn" type="submit">Save changes</button>
    </form>
  `).join(``),t.querySelectorAll(`.admin-product-form`).forEach(e=>{let t=Number(e.dataset.id),r=n.find(e=>Number(e.id)===t);B(e,r?.colors_csv||`W`,r?.main_color||`W`),V(e,r?.color_images_map||``),e.addEventListener(`submit`,async t=>{t.preventDefault();let n=Number(e.dataset.id),r=new FormData(e),i=Object.fromEntries(r.entries());i.soldOut=r.has(`soldOut`);try{let e=await fetch(`/api/admin/products/${n}`,{method:`PUT`,headers:{"Content-Type":`application/json`},body:JSON.stringify(i)}),t=await e.json().catch(()=>({}));if(!e.ok){I(t.details?`${t.message} (${t.details})`:t.message||`Could not save product.`);return}I(`Product updated.`,!0),U()}catch{I(`Could not save product. Server/network error.`)}})})}async function q(){if(!await E()){L(n,`Database is under maintenance. Please try again shortly.`);return}let e;try{e=await fetch(`/api/admin/orders`,{cache:`no-store`})}catch{L(n,`Server not reachable. Start backend first.`);return}if(!e.ok){L(n,`Could not load sells list. Make sure server is restarted.`);return}let t=await e.json(),a=Array.isArray(t.orders)?t.orders:[];j=a;let o=a.filter(e=>!ue(e));if(M=a.filter(e=>ue(e)),!a.length){n.innerHTML=`<p class="desc">No sells yet.</p>`,r&&(r.classList.add(`hidden`),r.innerHTML=``),i&&(i.classList.add(`hidden`),i.textContent=`Older sells list`),X();return}o.length?(n.innerHTML=de(o),fe(n)):n.innerHTML=`<p class="desc">No current sells. Scroll to bottom and open older sells list.</p>`,r&&(r.classList.add(`hidden`),r.innerHTML=M.length?de(M):`<p class="desc">No older sells found.</p>`,M.length&&fe(r)),i&&(i.textContent=M.length?`Older sells list (${M.length})`:`Older sells list`),X()}i?.addEventListener(`click`,()=>{!r||!M.length||(r.classList.contains(`hidden`)?(r.classList.remove(`hidden`),i.textContent=`Hide older sells list`,r.scrollIntoView({behavior:`smooth`,block:`start`})):(r.classList.add(`hidden`),i.textContent=`Older sells list (${M.length})`),X())}),window.addEventListener(`scroll`,X,{passive:!0}),window.addEventListener(`resize`,X);function ce(e){let t=Number(e||0);return`${t>0?`+`:t<0?`-`:``}${Math.abs(t).toFixed(2)} Dt`}function J(e){return`${Math.abs(Number(e||0)).toFixed(2)} Dt`}function le(e){let t=Number(e?.unit_price_dt||0),n=Number(e?.amount||0),r=Number(e?.delivery_fee_dt||0);return t*n+r}function Y(e){if(!e)return null;let t=new Date(e).getTime();return Number.isFinite(t)?t:null}function ue(e){let t=String(e?.status||``).toLowerCase();if(t===`delivered`){let t=Y(e?.delivered_at)??Y(e?.created_at);return Number.isFinite(t)&&Date.now()-t>=T}if(t===`returned`){let t=Y(e?.returned_at)??Y(e?.created_at);return Number.isFinite(t)&&Date.now()-t>=T}if(t===`cancelled`){let t=Y(e?.cancelled_at)??Y(e?.created_at);return Number.isFinite(t)&&Date.now()-t>=T}return!1}function X(){if(!i)return;if(!M.length){i.classList.add(`hidden`);return}if(r&&!r.classList.contains(`hidden`)){i.classList.remove(`hidden`);return}let e=o&&!o.classList.contains(`hidden`),t=a?a.getBoundingClientRect().top<=window.innerHeight:!1;i.classList.toggle(`hidden`,!(e&&t))}function de(e){return e.map(e=>{let t=Number(e.unit_price_dt)*Number(e.amount),n=Number(e.delivery_fee_dt||0),r=t+n,i=n>0,a=ne(e.product_image_url),o=e.delivered_at?new Date(e.delivered_at).getTime():null,s=e.cancelled_at?new Date(e.cancelled_at).getTime():null,c=e.returned_at?new Date(e.returned_at).getTime():null,l=String(e.status||``).toLowerCase()===`delivered`&&Number.isFinite(o)&&Date.now()-o>=T,u=String(e.status||``).toLowerCase()===`cancelled`&&Number.isFinite(s)&&Date.now()-s>=T,d=String(e.status||``).toLowerCase()===`returned`&&Number.isFinite(c)&&Date.now()-c>=T,f=l||u||d,p=l?`Status locked: this order was delivered more than 24 hours ago.`:u?`Status locked: this order was cancelled more than 24 hours ago.`:d?`Status locked: this order was returned more than 24 hours ago.`:``,m=Number(e.contact_is_verified||0)===1,h=Number(e.contact_is_blacklisted||0)===1,g=[m?`<span class="admin-user-sign sign-verified">Verified</span>`:``,h?`<span class="admin-user-sign sign-blacklisted">Blacklisted</span>`:``].filter(Boolean).join(` `),_=F(e.account_name||e.order_full_name||`-`),v=F(e.account_phone||e.order_phone||`-`),y=F(e.product_name||`-`),b=F(e.color||`-`),x=F(e.size||`-`),S=F(e.amount||`-`),C=F(e.note?e.note:`-`);return`
    <article class="history-item">
      <div class="admin-order-head">
        ${a?`<img class="admin-order-image" src="${a}" alt="${y}">`:``}
        <div class="admin-order-head-content">
      <div class="meta">
        <div class="name">#${e.id} - ${y}</div>
        <div class="price">${r.toFixed(2)} Dt</div>
      </div>
      <div class="desc">Buyer: <strong>${_}</strong> (<strong>${v}</strong>)</div>
      ${g?`<div class="desc">${g}</div>`:``}
      <div class="desc">Color: <strong>${b}</strong> • Size: <strong>${x}</strong> • Amount: <strong>${S}</strong></div>
      <div class="desc">Product: <strong>${t.toFixed(2)} Dt</strong> + Delivery: <strong>${n>0?`${n.toFixed(2)} Dt`:`OFF`}</strong> = Total: <strong>${r.toFixed(2)} Dt</strong></div>
      <div class="desc">Note: <strong>${C}</strong></div>
      <div class="desc">Date: ${new Date(e.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div class="admin-status-wrap">
        <div class="admin-status-label">Delivery fee for this order</div>
        <div class="admin-status-group" data-delivery-id="${e.id}">
          <button
            type="button"
            class="admin-status-btn delivery-btn delivery-on ${i?`active`:``}"
            data-id="${e.id}"
            data-delivery-enabled="true">
            ON
          </button>
          <button
            type="button"
            class="admin-status-btn delivery-btn delivery-off ${i?``:`active`}"
            data-id="${e.id}"
            data-delivery-enabled="false">
            OFF
          </button>
        </div>
      </div>
      <div class="admin-status-wrap">
        <div class="admin-status-label">Status</div>
        <div class="admin-status-group" data-id="${e.id}">
          ${ee.map(t=>`
            <button
              type="button"
              class="admin-status-btn status-${t} ${e.status===t?`active`:``}"
              data-id="${e.id}"
              data-status="${t}"
              ${f?`disabled`:``}>
              ${t===`returned`?`return`:t}
            </button>
          `).join(``)}
        </div>
        ${f?`<div class="desc">${p}</div>`:``}
      </div>
    </article>
  `}).join(``)}function fe(e){e&&(e.querySelectorAll(`.delivery-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id),n=e.dataset.deliveryEnabled===`true`;if(!t||e.classList.contains(`active`))return;let r=e.closest(`.admin-status-group`);r?.querySelectorAll(`.delivery-btn`).forEach(e=>{e.disabled=!0});let i=await fetch(`/api/admin/orders/${t}/delivery`,{method:`PATCH`,headers:{"Content-Type":`application/json`},cache:`no-store`,body:JSON.stringify({enabled:n})}),a=await i.json().catch(()=>({}));if(!i.ok){I(a.message||`Could not update delivery fee for this order.`),r?.querySelectorAll(`.delivery-btn`).forEach(e=>{e.disabled=!1});return}I(`Delivery fee ${a.deliveryEnabled?`enabled`:`disabled`} for order #${t}.`,!0),await Promise.all([U(),W(),Z(),G(),q()])})}),e.querySelectorAll(`.admin-status-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id),n=e.dataset.status;if(!t||!n||e.classList.contains(`active`))return;let r=e.closest(`.admin-status-group`);r?.querySelectorAll(`.admin-status-btn`).forEach(e=>{e.disabled=!0});let i=await fetch(`/api/admin/orders/${t}/status`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify({status:n})}),a=await i.json().catch(()=>({}));if(!i.ok){I(a.message||`Could not update order status.`),r?.querySelectorAll(`.admin-status-btn`).forEach(e=>{e.disabled=!1});return}I(`Order status updated.`,!0),await Promise.all([U(),W(),Z(),G(),q()])})}))}async function pe(){if(!(Array.isArray(j)&&j.length))try{let e=await fetch(`/api/admin/orders`,{cache:`no-store`});if(!e.ok)return;let t=await e.json();j=Array.isArray(t.orders)?t.orders:[]}catch{}}async function me({title:e,matcher:t}){await pe();let n=(j||[]).filter(e=>t(e));if(!n.length){P(e,`<p class="desc">No orders found for this contact.</p>`);return}P(e,n.map(e=>{let t=le(e);return`
      <article class="history-item">
        <div class="meta">
          <div class="name">#${F(e.id)} - ${F(e.product_name||`-`)}</div>
          <div class="price">${Number(t).toFixed(2)} Dt</div>
        </div>
        <div class="desc">Status: <strong>${F(e.status||`pending`)}</strong></div>
        <div class="desc">Color: <strong>${F(e.color||`-`)}</strong> • Size: <strong>${F(e.size||`-`)}</strong> • Amount: <strong>${F(e.amount||`-`)}</strong></div>
        <div class="desc">Date: ${new Date(e.created_at).toLocaleString()}</div>
      </article>
    `}).join(``))}async function Z(){if(!d)return;let e;try{e=await fetch(`/api/admin/revenues`,{cache:`no-store`})}catch{L(d,`Server not reachable. Start backend first.`);return}if(!e.ok){L(d,(await e.json().catch(()=>({}))).message||`Could not load revenues.`);return}let t=await e.json(),n=Array.isArray(t.entries)?t.entries:[],r=`
    <article class="history-item">
      <div class="meta">
        <div class="name">Total net revenue (${N(t.monthKey||``)})</div>
        <div class="price">${J(t.totalDt||0)}</div>
      </div>
      <div class="desc">Delivered hoodies net: ${J(t.salesNetDt||0)}</div>
      <div class="desc">Manual actions total: ${J(t.manualAdjustmentsDt||0)}</div>
      <div class="desc">Per delivered order: +Product price (without delivery), then -Sewing cost (35 Dt x amount).</div>
      <div class="desc">This section resets each new month. Previous months are saved in Monthly revenues fiche.</div>
    </article>
  `;if(!n.length){d.innerHTML=`${r}<p class="desc">No revenue actions yet.</p>`;return}d.innerHTML=r+n.map(e=>`
    <article class="history-item revenue-item ${Number(e.amountDt)>=0?`is-add`:`is-remove`}">
      <div class="meta">
        <div class="name">${e.title}</div>
        <div class="price revenue-amount ${Number(e.amountDt)>=0?`is-add`:`is-remove`}">${J(e.amountDt)}</div>
      </div>
      <div class="desc">Type: <strong class="revenue-type ${Number(e.amountDt)>=0?`is-add`:`is-remove`}">${e.kind===`sale_add`?`Sale +`:e.kind===`sewing_remove`?`Sewing -`:`Manual action`}</strong></div>
      <div class="desc">Date: ${new Date(e.created_at).toLocaleString()}</div>
      ${e.kind===`adjustment`&&Number(e.id)>0?`<div class="btn-row"><button type="button" class="btn admin-revenue-delete-btn" data-adjustment-id="${Number(e.id)}">Remove action</button></div>`:``}
    </article>
  `).join(``),d.querySelectorAll(`.admin-revenue-delete-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.adjustmentId||0);if(t&&window.confirm(`Delete this revenue action?`)){e.disabled=!0;try{let n=await fetch(`/api/admin/revenues/adjustments/${t}`,{method:`DELETE`}),r=await n.json().catch(()=>({}));if(!n.ok){I(r.message||`Could not delete revenue action.`),e.disabled=!1;return}I(`Revenue action removed.`,!0),await Z(),await G()}catch{I(`Could not delete revenue action. Server/network error.`),e.disabled=!1}}})})}async function he(){if(!f)return;let e;try{e=await fetch(`/api/admin/revenues/adjustments/deleted`,{cache:`no-store`})}catch{L(f,`Server not reachable. Start backend first.`);return}if(!e.ok){L(f,(await e.json().catch(()=>({}))).message||`Could not load deleted actions.`);return}let t=await e.json(),n=Array.isArray(t.actions)?t.actions:[];if(!n.length){f.innerHTML=`<p class="desc">No deleted actions yet.</p>`;return}f.innerHTML=n.map(e=>`
    <article class="history-item revenue-item ${Number(e.amountDt)>=0?`is-add`:`is-remove`}">
      <div class="meta">
        <div class="name">${e.title}</div>
        <div class="price revenue-amount ${Number(e.amountDt)>=0?`is-add`:`is-remove`}">${J(e.amountDt)}</div>
      </div>
      <div class="desc">Deleted by: <strong>${e.deletedByName||`Unknown`}</strong></div>
      <div class="desc">Deleted at: ${e.deleted_at?new Date(e.deleted_at).toLocaleString():`-`}</div>
      <div class="desc">Original date: ${e.created_at?new Date(e.created_at).toLocaleString():`-`}</div>
    </article>
  `).join(``)}async function Q(){if(!await E()){L(s,`Database is under maintenance. Please try again shortly.`);return}let e;try{e=await fetch(`/api/admin/users`)}catch{L(s,`Server not reachable. Start backend first.`);return}if(!e.ok){L(s,`Could not load users. Restart server after latest updates.`);return}let t=await e.json();k=Array.isArray(t.users)?t.users:[],ge()}function ge(){let e=String(l?.value||``).trim().toLowerCase(),t=e?k.filter(t=>{let n=String(t.full_name||``).toLowerCase(),r=String(t.phone||``).toLowerCase();return n.includes(e)||r.includes(e)}):k;if(!t.length){s.innerHTML=`<p class="desc">${k.length?`No users match your search.`:`No users yet.`}</p>`;return}s.innerHTML=t.map(e=>`
    <article class="history-item">
      <div class="meta">
        <div class="name">${e.full_name}</div>
        <div class="price">${e.role}</div>
      </div>
      <div class="desc">Phone: ${e.phone}</div>
      <div class="desc">Address: ${e.address||`-`}</div>
      <div class="desc">Orders bought: <strong>${Number(e.orders_count||0)}</strong></div>
      <div class="desc">Created: ${new Date(e.created_at).toLocaleString()}</div>
      <div class="desc">
        ${Number(e.is_verified||0)===1?`<span class="admin-user-sign sign-verified">Verified</span>`:``}
        ${Number(e.is_blacklisted||0)===1?`<span class="admin-user-sign sign-blacklisted">Blacklisted</span>`:``}
      </div>
      <div class="admin-status-group">
        <button type="button" class="admin-status-btn status-confirmed" data-action="view-user-orders" data-id="${e.id}">Details</button>
        <button
          type="button"
          class="admin-status-btn status-delivered"
          data-action="toggle-verified"
          data-id="${e.id}"
          data-current="${Number(e.is_verified||0)}"
          ${Number(e.id)===O?`disabled`:``}>
          ${Number(e.is_verified||0)===1?`Unverify`:`Verify`}
        </button>
        <button
          type="button"
          class="admin-status-btn status-cancelled"
          data-action="toggle-blacklisted"
          data-id="${e.id}"
          data-current="${Number(e.is_blacklisted||0)}"
          ${Number(e.id)===O?`disabled`:``}>
          ${Number(e.is_blacklisted||0)===1?`Unblacklist`:`Blacklist`}
        </button>
        <button type="button" class="admin-status-btn status-cancelled" data-action="delete-user" data-id="${e.id}" ${Number(e.id)===O?`disabled`:``}>Delete</button>
      </div>
    </article>
  `).join(``),s.querySelectorAll(`button[data-action="toggle-verified"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id),n=Number(e.dataset.current||0)===1;if(!t)return;let r=await fetch(`/api/admin/users/${t}/flags`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify({verified:!n,blacklisted:!1})}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not update verified status.`);return}I(`User ${n?`unverified`:`verified`}.`,!0),await Promise.all([Q(),q()])})}),s.querySelectorAll(`button[data-action="toggle-blacklisted"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id),n=Number(e.dataset.current||0)===1;if(!t)return;let r=await fetch(`/api/admin/users/${t}/flags`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify({verified:!1,blacklisted:!n})}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not update blacklist status.`);return}I(`User ${n?`removed from blacklist`:`blacklisted`}.`,!0),await Promise.all([Q(),q()])})}),s.querySelectorAll(`button[data-action="delete-user"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id);if(!t||!window.confirm(`Delete this user? Their account will be removed.`))return;let n=await fetch(`/api/admin/users/${t}`,{method:`DELETE`}),r=await n.json().catch(()=>({}));if(!n.ok){I(r.message||`Could not delete user.`);return}I(`User deleted.`,!0),await Q(),await U()})}),s.querySelectorAll(`button[data-action="view-user-orders"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.id||0);t&&await me({title:`Orders details - ${k.find(e=>Number(e.id)===t)?.full_name||`User #${t}`}`,matcher:e=>Number(e.user_id||0)===t})})})}async function $(){if(!c)return;if(!await E()){L(c,`Database is under maintenance. Please try again shortly.`);return}let e;try{e=await fetch(`/api/admin/guest-users`,{cache:`no-store`})}catch{L(c,`Server not reachable. Start backend first.`);return}if(!e.ok){L(c,`Could not load non-registered users.`);return}let t=await e.json();A=Array.isArray(t.users)?t.users:[],_e()}function _e(){let e=String(u?.value||``).trim().toLowerCase(),t=e?A.filter(t=>{let n=Array.isArray(t.names_history)&&t.names_history.length?t.names_history.join(` `):String(t.full_name||``),r=String(t.phone||``);return n.toLowerCase().includes(e)||r.toLowerCase().includes(e)}):A;if(!t.length){c.innerHTML=`<p class="desc">${A.length?`No non-registered users match your search.`:`No non-registered buyers yet.`}</p>`;return}c.innerHTML=t.map(e=>`
    <article class="history-item">
      <div class="meta">
        <div class="name">${Array.isArray(e.names_history)&&e.names_history.length?e.names_history.join(` / `):e.full_name||`-`}</div>
        <div class="price">Guest</div>
      </div>
      <div class="desc">Phone: ${e.phone}</div>
      <div class="desc">Orders bought: <strong>${Number(e.orders_count||0)}</strong></div>
      <div class="desc">Last order: ${e.latest_order_at?new Date(e.latest_order_at).toLocaleString():`-`}</div>
      <div class="desc">Address: ${e.address||`-`}</div>
      <div class="desc">
        ${Number(e.is_verified||0)===1?`<span class="admin-user-sign sign-verified">Verified</span>`:``}
        ${Number(e.is_blacklisted||0)===1?`<span class="admin-user-sign sign-blacklisted">Blacklisted</span>`:``}
      </div>
      <div class="admin-status-group">
        <button
          type="button"
          class="admin-status-btn status-confirmed"
          data-action="view-guest-orders"
          data-phone="${encodeURIComponent(e.phone)}">
          Details
        </button>
        <button
          type="button"
          class="admin-status-btn status-delivered"
          data-action="guest-toggle-verified"
          data-phone="${encodeURIComponent(e.phone)}"
          data-current="${Number(e.is_verified||0)}">
          ${Number(e.is_verified||0)===1?`Unverify`:`Verify`}
        </button>
        <button
          type="button"
          class="admin-status-btn status-cancelled"
          data-action="guest-toggle-blacklisted"
          data-phone="${encodeURIComponent(e.phone)}"
          data-current="${Number(e.is_blacklisted||0)}">
          ${Number(e.is_blacklisted||0)===1?`Unblacklist`:`Blacklist`}
        </button>
      </div>
    </article>
  `).join(``),c.querySelectorAll(`button[data-action="guest-toggle-verified"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=String(e.dataset.phone||``).trim(),n=Number(e.dataset.current||0)===1;if(!t)return;let r=await fetch(`/api/admin/guest-users/${t}/flags`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify({verified:!n,blacklisted:!1})}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not update verified status.`);return}I(`Guest ${n?`unverified`:`verified`}.`,!0),await Promise.all([$(),q()])})}),c.querySelectorAll(`button[data-action="guest-toggle-blacklisted"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=String(e.dataset.phone||``).trim(),n=Number(e.dataset.current||0)===1;if(!t)return;let r=await fetch(`/api/admin/guest-users/${t}/flags`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify({verified:!1,blacklisted:!n})}),i=await r.json().catch(()=>({}));if(!r.ok){I(i.message||`Could not update blacklist status.`);return}I(`Guest ${n?`removed from blacklist`:`blacklisted`}.`,!0),await Promise.all([$(),q()])})}),c.querySelectorAll(`button[data-action="view-guest-orders"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=decodeURIComponent(String(e.dataset.phone||``)).trim();t&&await me({title:`Orders details - ${A.find(e=>String(e.phone||``).trim()===t)?.full_name||t}`,matcher:e=>String(e.order_phone||``).trim()===t&&!e.user_id})})})}l?.addEventListener(`input`,()=>{ge()}),u?.addEventListener(`input`,()=>{_e()}),g.addEventListener(`submit`,async e=>{e.preventDefault();let t=new FormData(g),n=Object.fromEntries(t.entries());n.soldOut=t.has(`soldOut`);try{let e=await fetch(`/api/admin/products`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(n)}),t=await e.json().catch(()=>({}));if(!e.ok){I(t.details?`${t.message} (${t.details})`:t.message||`Could not add product.`);return}I(`Product added.`,!0),g.reset(),B(g,`W`),V(g,``),K(),U()}catch{I(`Could not add product. Server/network error.`)}}),B(g,`W`,`W`),V(g,``),h?.addEventListener(`submit`,async e=>{e.preventDefault();let t=new FormData(h),n=String(t.get(`title`)||``).trim(),r=String(t.get(`type`)||`add`).trim(),i=Number(t.get(`amountDt`)||0);if(!n){I(`Action title is required.`);return}if(!Number.isFinite(i)||i<=0){I(`Amount must be greater than 0.`);return}try{let e=await fetch(`/api/admin/revenues/adjustments`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({title:n,type:r,amountDt:i})}),t=await e.json().catch(()=>({}));if(!e.ok){I(t.message||`Could not save revenue action.`);return}h.reset(),I(`Revenue action saved.`,!0),await Z(),await G()}catch{I(`Could not save revenue action. Server/network error.`)}}),(async()=>{await se()&&(await oe(),V(g,``),await Promise.all([U(),W(),K(),q(),Q(),$(),Z(),he(),G()]))})();