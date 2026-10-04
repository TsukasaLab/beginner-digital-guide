const p=new URLSearchParams(location.search),target=document.querySelector('[name=target]');
const map={carlog:'CarLog',pricelog:'PriceLog',android:'Androidスマホ編',windows:'Windowsパソコン編'};
if(map[p.get('app')]) target.value=map[p.get('app')];
const form=document.querySelector('#contactForm'), statusEl=document.querySelector('#status'), submit=form.querySelector('button[type=submit]');
form.addEventListener('submit',async e=>{
 e.preventDefault(); statusEl.textContent='送信中です…'; submit.disabled=true;
 try{
  const fd=new FormData(form);
  const r=await fetch('/api/inquiry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target:fd.get('target'),category:fd.get('type'),message:fd.get('message')})});
  const d=await r.json(); if(!r.ok||!d.ok) throw new Error(d.error||'送信できませんでした。');
  form.innerHTML=`<div class="successbox"><h2>送信しました</h2><p>受付番号は</p><div class="ticket">${d.ticket_id}</div><p><b>この番号を保存してください。</b><br>回答は「問い合わせの回答を確認」から確認できます。</p><p><a class="button" href="inquiry-status.html?ticket=${encodeURIComponent(d.ticket_id)}">回答を確認する</a></p></div>`;
 }catch(err){statusEl.textContent=err.message;} finally{submit.disabled=false;}
});
