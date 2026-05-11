var e=document.getElementById(`shop`),t=document.querySelectorAll(`.wave-tab`),n=document.getElementById(`db-loading-screen`),r=document.getElementById(`db-loading-message`),i=window.COLOR_LABELS||{},a=window.normalizeProductColor||((e,t)=>t),o=window.getProductImageCandidates||(()=>[]),s=window.getMainProductImage||(()=>``),c=`Scene Stealer`,l=new Map,u=[];async function d(){try{return(await fetch(`/api/health`,{cache:`no-store`})).status!==503}catch{return!1}}function f(e){n&&(n.classList.remove(`hidden`),r&&e&&(r.textContent=e))}function p(){n&&n.classList.add(`hidden`)}async function m(){for(f(`Please wait while we connect to the database.`);;){if(await d()){f(`Database connected. Refreshing store...`),window.location.reload();return}await new Promise(e=>setTimeout(e,2e3))}}function h(e,t=[`W`]){let n=new Set([`B`,`W`,`Br`,`P`,`Grey`]),r=String(e?.colors_csv||``).split(`,`).map(e=>e.trim()).filter(e=>n.has(e));return r.length?r:t}function g(e){return u.find(t=>t.id===e)}async function _(){let e=new AbortController,t=setTimeout(()=>e.abort(),6e3);try{let n=await fetch(`/api/products`,{cache:`no-store`,signal:e.signal});if(clearTimeout(t),!n.ok)return;let r=(await n.json()).products||[];if(!Array.isArray(r)||!r.length)return;u=r.map(e=>{let t=h(e,[`W`]),n=t.includes(e.main_color)?e.main_color:t[0];return{id:Number(e.id),name:e.name,price:Number(e.price_cents||0)/100,desc:e.description||``,imageUrl:e.image_url||``,colorImagesMap:e.color_images_map||``,wave:String(e.wave||`1stDrop`),colors:t,mainColor:n,soldOut:Number(e.sold_out||0)===1}})}catch{clearTimeout(t),u=[]}b()}function v(e){let t=a(e,l.get(e.id)||e.mainColor);return l.set(e.id,t),t}function y(e,t){let n=0;t.length&&(e.src=t[n],e.onerror=()=>{n+=1,n<t.length?e.src=t[n]:(e.onerror=null,e.alt=`Image unavailable`)})}function b(){let t=u.filter(e=>e.wave===c);if(t.length===0){e.innerHTML=`<div class="empty-wave">No articles yet in WAVE: ${c}</div>`;return}e.innerHTML=t.map(e=>{let t=v(e),n=e.colors.map(n=>`
      <button
        type="button"
        class="color-dot ${n===t?`active`:``}"
        data-product-id="${e.id}"
        data-color="${n}"
        aria-label="${i[n]||n}"
        title="${i[n]||n}">
      </button>
    `).join(``);return`
    <article class="card product-card ${e.soldOut?`is-sold-out`:``}" data-product-id="${e.id}" tabindex="0" role="link" aria-label="Open ${e.name}">
      ${e.soldOut?`<div class="sold-out-badge">Sold out</div>`:``}
      <img id="product-img-${e.id}" src="${s(e,t)}" alt="${e.name}">
      <div class="meta">
        <div class="name">${e.name}</div>
        <div class="price">${e.price} Dt</div>
      </div>
      <div class="desc">${e.desc}</div>
      <label class="color-picker-label">
        Color
        <div class="color-swatches">${n}</div>
      </label>
      <div class="btn-row">
        <button class="btn primary buy-btn" data-product-id="${e.id}" ${e.soldOut?`disabled`:``}>${e.soldOut?`Sold out`:`Buy now`}</button>
      </div>
    </article>
  `}).join(``),t.forEach(e=>{let t=document.getElementById(`product-img-${e.id}`);t&&y(t,o(e,v(e)))}),e.querySelectorAll(`.color-dot`).forEach(e=>{e.addEventListener(`click`,()=>{let t=Number(e.dataset.productId),n=e.dataset.color,r=g(t);if(!r||!n)return;let i=a(r,n);l.set(r.id,i);let s=document.getElementById(`product-img-${r.id}`);if(!s)return;let c=e.closest(`.card`);c&&c.querySelectorAll(`.color-dot`).forEach(e=>{e.classList.toggle(`active`,e.dataset.color===i)}),y(s,o(r,i))})}),e.querySelectorAll(`.buy-btn`).forEach(e=>{e.addEventListener(`click`,async()=>{if(e.disabled)return;if(!await d()){alert(`The database is under maintenance. Please try again shortly.`);return}let t=g(Number(e.dataset.productId));if(!t)return;let n=v(t);x(t.id,n)})}),e.querySelectorAll(`.product-card`).forEach(e=>{let t=()=>{let t=g(Number(e.dataset.productId));if(!t||t.soldOut)return;let n=v(t);x(t.id,n)};e.addEventListener(`click`,e=>{e.target.closest(`.color-dot, .buy-btn`)||t()}),e.addEventListener(`keydown`,e=>{e.key!==`Enter`&&e.key!==` `||(e.preventDefault(),t())})})}function x(e,t){let n=t?`&color=${encodeURIComponent(t)}`:``;window.location.href=`/product?id=${e}${n}`}function S(e){c=e,t.forEach(t=>{t.classList.toggle(`active`,t.dataset.wave===e)}),b()}t.forEach(e=>{e.disabled||e.addEventListener(`click`,()=>S(e.dataset.wave))});async function C(){if(!await d()){await m();return}p(),_()}C();