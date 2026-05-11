var e=`<!doctype html>
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
</html>`;function t(){document.open(),document.write(e),document.close()}async function n(){try{let e=await fetch(`/api/health`,{cache:`no-store`});if(e.status===503)return t(),!1;if(!e.ok)return!0;if((await e.json().catch(()=>({})))?.ok===!1)return t(),!1}catch{return!0}return!0}var r=document.getElementById(`register-form`),i=document.getElementById(`auth-message`),a=document.getElementById(`register-phone`),o=document.getElementById(`register-password`),s=document.getElementById(`password-strength`);function c(e,t=!1){i.textContent=e,i.style.display=`block`,i.style.color=t?`#047857`:`#b91c1c`}function l(e){if(!e)return;let t=()=>{let t=String(e.value||``).replace(/\s+/g,``);t.startsWith(`+216`)||(t=`+216${t.replace(/^\+?216?/,``)}`),e.value=`+216${t.slice(4).replace(/\D/g,``).slice(0,8)}`};e.addEventListener(`input`,t),e.addEventListener(`focus`,()=>{e.value.startsWith(`+216`)||(e.value=`+216`)}),e.addEventListener(`keydown`,t=>{(t.key===`Backspace`||t.key===`Delete`)&&e.selectionStart<=4&&t.preventDefault()}),t()}function u(e){return/^\+216\d{8}$/.test(String(e||``).trim())}function d(e){let t=String(e||``).trim();return!t||/\d/.test(t)?!1:t.includes(` `)}function f(e){let t=String(e||``),n=0;return t.length>=8&&(n+=1),/[a-z]/.test(t)&&/[A-Z]/.test(t)&&(n+=1),/\d/.test(t)&&(n+=1),/[^A-Za-z0-9]/.test(t)&&(n+=1),n<=1?`low`:n<=3?`mid`:`strong`}function p(e){if(!s)return;let t=f(e);s.classList.remove(`level-low`,`level-mid`,`level-strong`),s.classList.add(`level-${t}`),s.textContent=`Security level: ${t}`}async function m(){l(a),o?.addEventListener(`input`,()=>{p(o.value)}),p(o?.value||``),await n()}m(),r.addEventListener(`submit`,async e=>{e.preventDefault();let t=Object.fromEntries(new FormData(r).entries());if(!d(t.fullName)){c(`Full name must contain a space and no numbers.`);return}if(!u(t.phone)){c(`Phone must be +216 followed by 8 numbers.`);return}if(!String(t.address||``).trim()){c(`Address is required.`);return}if(f(t.password)===`low`){c(`Password security is low. Use a mid or strong password.`);return}if(String(t.password||``)!==String(t.confirmPassword||``)){c(`Password confirmation does not match.`);return}try{let e=await fetch(`/api/auth/register`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}),n=await e.json().catch(()=>({}));if(!e.ok){c(n.message||`Register failed.`);return}c(`Account created and logged in.`,!0),setTimeout(()=>{window.location.href=`/`},700)}catch{c(`Cannot connect to server. Start backend and open http://localhost:3000/signup`)}});