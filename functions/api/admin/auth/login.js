import { json, deviceState, verifyPassword, checkRateLimit, recordFailure, clearFailures, registerDevice, makeSession, authCookies } from '../../../_lib/admin-auth.js';
export async function onRequestPost({request,env}){
  try{
    if(!env.ADMIN_PASSWORD) return json({ok:false,error:'CloudflareにADMIN_PASSWORDが設定されていません。'},503);
    const rate=await checkRateLimit(request,env);
    if(!rate.ok) return json({ok:false,error:'ログイン失敗が続いたため一時的にロックしています。15分ほど待ってください。'},429,{'retry-after':String(rate.retryAfter||900)});
    const body=await request.json();
    const password=String(body.password??'');
    if(!await verifyPassword(env,password)){
      await recordFailure(rate.ip,env);
      return json({ok:false,error:'パスワードが違います。'},401);
    }
    let d=await deviceState(request,env), deviceToken='';
    if(d.registered && !d.recognized){
      return json({ok:false,error:'この管理画面は登録済みの管理用PCからのみ利用できます。'},403);
    }
    if(!d.registered){
      const reg=await registerDevice(env); deviceToken=reg.token; d={registered:true,recognized:true,deviceHash:reg.hash};
    }
    await clearFailures(rate.ip,env);
    const session=await makeSession(env,d.deviceHash);
    const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
    for(const c of authCookies(deviceToken,session)) headers.append('Set-Cookie',c);
    return new Response(JSON.stringify({ok:true,device_registered:!!deviceToken}),{status:200,headers});
  }catch(e){return json({ok:false,error:'ログイン処理に失敗しました。'},500)}
}
