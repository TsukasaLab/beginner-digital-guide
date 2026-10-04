import { json, deviceState, isAuthenticated } from '../../../_lib/admin-auth.js';
export async function onRequestGet({request,env}){
  try{
    const d=await deviceState(request,env);
    const authenticated=await isAuthenticated(request,env);
    return json({ok:true,registered:d.registered,device_recognized:d.recognized,authenticated,configured:!!env.ADMIN_PASSWORD});
  }catch(e){return json({ok:false,error:'管理者認証の状態を確認できませんでした。'},500)}
}
