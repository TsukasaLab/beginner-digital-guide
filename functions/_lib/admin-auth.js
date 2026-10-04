const enc = new TextEncoder();
const cookieName = 'kd_admin_device';
const sessionName = 'kd_admin_session';

export const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
});

function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

function b64(bytes) {
  let s=''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function randomToken(n=32){ const a=new Uint8Array(n); crypto.getRandomValues(a); return b64(a); }
async function sha256(s){ return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }
async function hmac(secret, data){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(data))));
}
async function safeEqual(a,b){
  const ah=await sha256(String(a)), bh=await sha256(String(b));
  if(ah.length!==bh.length) return false;
  let x=0; for(let i=0;i<ah.length;i++) x|=ah.charCodeAt(i)^bh.charCodeAt(i); return x===0;
}

export async function ensureAdminTables(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_devices (
    id INTEGER PRIMARY KEY CHECK (id=1), token_hash TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, window_started TEXT NOT NULL
  )`).run();
}

export async function deviceState(request, env){
  await ensureAdminTables(env);
  const row=await env.DB.prepare('SELECT token_hash FROM admin_devices WHERE id=1').first();
  if(!row) return {registered:false, recognized:false, deviceHash:'', token:''};
  const token=getCookie(request,cookieName);
  if(!token) return {registered:true, recognized:false, deviceHash:row.token_hash, token:''};
  const hash=await sha256(token);
  return {registered:true, recognized:await safeEqual(hash,row.token_hash), deviceHash:row.token_hash, token};
}

export async function verifyPassword(env, password){
  if(!env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD secret is not configured');
  return safeEqual(password, env.ADMIN_PASSWORD);
}

export async function checkRateLimit(request, env){
  await ensureAdminTables(env);
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  const row=await env.DB.prepare('SELECT failures, window_started FROM admin_login_attempts WHERE ip=?').bind(ip).first();
  if(!row) return {ok:true,ip};
  const age=Date.now()-Date.parse(row.window_started);
  if(!Number.isFinite(age) || age>15*60*1000){ await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip=?').bind(ip).run(); return {ok:true,ip}; }
  return {ok:Number(row.failures)<5,ip,retryAfter:Math.max(1,Math.ceil((15*60*1000-age)/1000))};
}
export async function recordFailure(ip, env){
  const now=new Date().toISOString();
  const row=await env.DB.prepare('SELECT failures, window_started FROM admin_login_attempts WHERE ip=?').bind(ip).first();
  if(!row || Date.now()-Date.parse(row.window_started)>15*60*1000){
    await env.DB.prepare('INSERT OR REPLACE INTO admin_login_attempts(ip,failures,window_started) VALUES(?,?,?)').bind(ip,1,now).run();
  } else {
    await env.DB.prepare('UPDATE admin_login_attempts SET failures=failures+1 WHERE ip=?').bind(ip).run();
  }
}
export async function clearFailures(ip, env){ await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip=?').bind(ip).run(); }

export async function registerDevice(env){
  const token=randomToken(32), hash=await sha256(token), now=new Date().toISOString();
  await env.DB.prepare('INSERT INTO admin_devices(id,token_hash,created_at,last_seen_at) VALUES(1,?,?,?)').bind(hash,now,now).run();
  return {token,hash};
}

export async function makeSession(env, deviceHash){
  const exp=Date.now()+12*60*60*1000;
  const payload=`${exp}.${deviceHash}`;
  const sig=await hmac(env.ADMIN_PASSWORD,payload);
  return `${exp}.${sig}`;
}

export async function isAuthenticated(request, env){
  if(!env.ADMIN_PASSWORD) return false;
  const ds=await deviceState(request,env);
  if(!ds.registered || !ds.recognized) return false;
  const session=getCookie(request,sessionName);
  const [expRaw,sig]=session.split('.');
  const exp=Number(expRaw);
  if(!exp || !sig || Date.now()>exp) return false;
  const expected=await hmac(env.ADMIN_PASSWORD,`${exp}.${ds.deviceHash}`);
  const ok=await safeEqual(sig,expected);
  if(ok) await env.DB.prepare('UPDATE admin_devices SET last_seen_at=? WHERE id=1').bind(new Date().toISOString()).run();
  return ok;
}

export function authCookies(deviceToken, session){
  const secure='Path=/; Secure; HttpOnly; SameSite=Strict';
  const arr=[];
  if(deviceToken) arr.push(`${cookieName}=${encodeURIComponent(deviceToken)}; ${secure}; Max-Age=31536000`);
  if(session) arr.push(`${sessionName}=${encodeURIComponent(session)}; ${secure}; Max-Age=43200`);
  return arr;
}
export function clearSessionCookie(){ return `${sessionName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`; }
export function clearAllCookies(){ return [
  `${sessionName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`,
  `${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`
]; }
export async function requireAdmin(request, env){ return isAuthenticated(request,env); }
