import { json, requireAdmin } from '../../_lib/admin-auth.js';
export async function onRequestGet({request,env}){
 if(!await requireAdmin(request,env)) return json({ok:false,error:'管理者ログインが必要です。'},401);
 const u=new URL(request.url), status=u.searchParams.get('status');
 const q=status==='unanswered'||status==='answered' ? env.DB.prepare(`SELECT * FROM inquiries WHERE status=? ORDER BY id DESC LIMIT 200`).bind(status) : env.DB.prepare(`SELECT * FROM inquiries ORDER BY id DESC LIMIT 200`);
 return json({ok:true,inquiries:(await q.all()).results});
}
export async function onRequestPost({request,env}){
 if(!await requireAdmin(request,env)) return json({ok:false,error:'管理者ログインが必要です。'},401);
 try{
  const b=await request.json(), ticket=String(b.ticket_id??'').trim(), answer=String(b.answer??'').trim().slice(0,6000);
  if(!ticket||!answer) return json({ok:false,error:'受付番号と回答を入力してください。'},400);
  const r=await env.DB.prepare(`UPDATE inquiries SET answer=?, status='answered', answered_at=? WHERE ticket_id=?`).bind(answer,new Date().toISOString(),ticket).run();
  if(!r.meta?.changes) return json({ok:false,error:'問い合わせが見つかりません。'},404);
  return json({ok:true});
 }catch(e){return json({ok:false,error:'回答の保存に失敗しました。'},500)}
}
