import { json, requireAdmin, clearAllCookies } from '../../../_lib/admin-auth.js';
export async function onRequestPost({request,env}){
  if(!await requireAdmin(request,env)) return json({ok:false,error:'認証が必要です。'},401);
  await env.DB.prepare('DELETE FROM admin_devices WHERE id=1').run();
  const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  for(const c of clearAllCookies()) headers.append('Set-Cookie',c);
  return new Response(JSON.stringify({ok:true}),{headers});
}
