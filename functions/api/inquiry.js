const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
function ticketId(){ const a=new Uint8Array(6); crypto.getRandomValues(a); return 'Q-'+Array.from(a,b=>b.toString(36).padStart(2,'0')).join('').toUpperCase().slice(0,10); }
export async function onRequestPost({request, env}) {
  try {
    const body = await request.json();
    const target=clean(body.target,40), category=clean(body.category,40), message=clean(body.message,4000);
    if(!target || !category || !message) return json({ok:false,error:'必須項目を入力してください。'},400);
    let ticket='';
    for(let i=0;i<4;i++){
      ticket=ticketId();
      try {
        await env.DB.prepare(`INSERT INTO inquiries (ticket_id,target,category,message,status,created_at) VALUES (?,?,?,?,?,?)`)
          .bind(ticket,target,category,message,'unanswered',new Date().toISOString()).run();
        return json({ok:true,ticket_id:ticket});
      } catch(e) { if(!String(e).includes('UNIQUE')) throw e; }
    }
    return json({ok:false,error:'受付番号を作成できませんでした。もう一度お試しください。'},500);
  } catch(e) { return json({ok:false,error:'送信に失敗しました。時間をおいてもう一度お試しください。'},500); }
}
export async function onRequestGet({request, env}) {
  const u=new URL(request.url), ticket=clean(u.searchParams.get('ticket'),32);
  if(!ticket) return json({ok:false,error:'受付番号を入力してください。'},400);
  const row=await env.DB.prepare(`SELECT ticket_id,target,category,status,answer,created_at,answered_at FROM inquiries WHERE ticket_id=?`).bind(ticket).first();
  if(!row) return json({ok:false,error:'受付番号が見つかりません。'},404);
  return json({ok:true,inquiry:row});
}
