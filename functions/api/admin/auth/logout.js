import { clearSessionCookie } from '../../../_lib/admin-auth.js';
export async function onRequestPost(){
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','Set-Cookie':clearSessionCookie()}});
}
