import { getDb, generateUUID } from "./database";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { isCloudDatabaseConfigured, getCloudDb } from "@/lib/cloud/postgres";

const JWT_SECRET = isCloudDatabaseConfigured() ? (process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET is required for SifoBooks Cloud."); })()) : (process.env.JWT_SECRET || loadPersistentSecret());
const JWT_EXPIRY = 60 * 60 * 24 * 7; // 7 days
let cloudSecurityReady = false;

async function ensureCloudSecurityColumns() {
  if (!isCloudDatabaseConfigured() || cloudSecurityReady) return;
  const db = getCloudDb();
  await db`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0`;
  await db`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS must_change_password INTEGER NOT NULL DEFAULT 0`;
  await db`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_changed_at TEXT`;
  cloudSecurityReady = true;
}

function loadPersistentSecret(): string {
  // Standalone Windows builds may not have a .env file. Persist the generated
  // signing key beside the local database so sessions survive application restarts.
  const secretPath = join(process.cwd(), "data", ".jwt-secret");
  try {
    if (existsSync(secretPath)) {
      const saved = readFileSync(secretPath, "utf8").trim();
      if (saved.length >= 32) return saved;
    }
    const secret = crypto.randomUUID() + crypto.randomUUID();
    mkdirSync(dirname(secretPath), { recursive: true });
    writeFileSync(secretPath, secret, { encoding: "utf8" });
    console.warn("[auth] JWT_SECRET not set — created persistent local signing key at data/.jwt-secret");
    return secret;
  } catch (error) {
    // If the directory is not writable, keep the app usable for this process.
    const secret = crypto.randomUUID() + crypto.randomUUID();
    console.warn("[auth] Could not persist local JWT secret; sessions will reset if the app restarts.", error);
    return secret;
  }
}

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function signJWT(payload: Record<string, any>): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${base64url(signature)}`;
}

async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const data = `${header}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = (() => {
      const padded = signature.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(padded);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    })();
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const claims = JSON.parse(base64urlDecode(payload));
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string, metadata?: Record<string, any>) {
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb();
    await ensureCloudSecurityColumns();
    const existing = await db`SELECT id FROM auth_users WHERE email = ${email} LIMIT 1`;
    if (existing[0]) return { data: null, error: { message: "User already registered" } };
    const id = generateUUID();
    const hash = await Bun.password.hash(password);
    await db`INSERT INTO auth_users (id,email,password_hash) VALUES (${id},${email},${hash})`;
    await db`INSERT INTO profiles (id,email,full_name,onboarded,created_at,updated_at) VALUES (${id},${email},${metadata?.full_name || metadata?.name || email},false,now(),now())`;
    const token = await signJWT({ sub:id, email, sv:0, mustChange:false, iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+JWT_EXPIRY });
    return { data:{ user:{id,email,user_metadata:metadata||{}}, session:{access_token:token,user:{id,email}} }, error:null };
  }
  const db = getDb();
  // Check if user exists
  const existing = db.prepare("SELECT id FROM auth_users WHERE email = ?").get(email);
  if (existing) {
    return { data: null, error: { message: "User already registered" } };
  }
  const id = generateUUID();
  const hash = await Bun.password.hash(password);
  db.prepare("INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)").run(id, email, hash);

  // Create profile (replaces Supabase trigger)
  db.prepare(`INSERT INTO profiles (id, email, full_name, onboarded, created_at, updated_at) VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`)
    .run(id, email, metadata?.full_name || metadata?.name || email);

  const token = await signJWT({ sub: id, email, sv: 0, mustChange: false, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY });
  return {
    data: { user: { id, email, user_metadata: metadata || {} }, session: { access_token: token, user: { id, email } } },
    error: null,
  };
}

export async function signInWithPassword(email: string, password: string) {
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb();
    await ensureCloudSecurityColumns();
    const rows = await db`SELECT * FROM auth_users WHERE email=${email} LIMIT 1`;
    const user = rows[0] as any;
    if (!user) return { data:null, error:{message:"Invalid login credentials"} };
    const valid = await Bun.password.verify(password,user.password_hash);
    if (!valid) return { data:null, error:{message:"Invalid login credentials"} };
    const token = await signJWT({sub:user.id,email:user.email,sv:Number(user.session_version ?? 0),mustChange:Boolean(user.must_change_password),iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+JWT_EXPIRY});
    return {data:{user:{id:user.id,email:user.email},session:{access_token:token,user:{id:user.id,email:user.email}}},error:null};
  }
  const db = getDb();
  const user = db.prepare("SELECT * FROM auth_users WHERE email = ?").get(email) as any;
  if (!user) {
    return { data: null, error: { message: "Invalid login credentials" } };
  }
  const valid = await Bun.password.verify(password, user.password_hash);
  if (!valid) {
    return { data: null, error: { message: "Invalid login credentials" } };
  }
  const token = await signJWT({ sub: user.id, email: user.email, sv: Number(user.session_version ?? 0), mustChange: Boolean(user.must_change_password), iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY });
  return {
    data: { user: { id: user.id, email: user.email, user_metadata: { must_change_password: Boolean(user.must_change_password) } }, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { must_change_password: Boolean(user.must_change_password) } } } },
    error: null,
  };
}

export async function getUser(token: string) {
  if (!token) return { data:{user:null}, error:null };
  const claims = await verifyJWT(token);
  if (!claims) return { data:{user:null}, error:null };
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb();
    await ensureCloudSecurityColumns();
    const rows = await db`SELECT id,email,created_at,session_version,must_change_password FROM auth_users WHERE id=${claims.sub} LIMIT 1`;
    const user = rows[0] as any;
    if (!user) return {data:{user:null},error:null};
    const profiles = await db`SELECT full_name FROM profiles WHERE id=${user.id} LIMIT 1`;
    return {data:{user:{id:user.id,email:user.email,user_metadata:{...(profiles[0]?{full_name:profiles[0].full_name}: {}),must_change_password:Boolean(user.must_change_password)}}},error:null};
  }
  const db = getDb();
  const user = db.prepare("SELECT id, email, created_at, session_version, must_change_password FROM auth_users WHERE id = ?").get(claims.sub) as any;
  if (!user) return { data: { user: null }, error: null };
  // Get profile
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(user.id) as any;
  return {
    data: { user: { id: user.id, email: user.email, user_metadata: { ...(profile ? { full_name: profile.full_name } : {}), must_change_password: Boolean(user.must_change_password) } } },
    error: null,
  };
}

export async function getSession(token: string) {
  if (!token) return { data:{session:null}, error:null };
  const claims = await verifyJWT(token);
  if (!claims) return { data:{session:null}, error:null };
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb();
    await ensureCloudSecurityColumns();
    const rows = await db`SELECT id,email,session_version,must_change_password FROM auth_users WHERE id=${claims.sub} LIMIT 1`;
    const user = rows[0] as any;
    if (!user) return {data:{session:null},error:null};
    return {data:{session:{access_token:token,user:{id:user.id,email:user.email}}},error:null};
  }
  const db = getDb();
  const user = db.prepare("SELECT id, email, session_version, must_change_password FROM auth_users WHERE id = ?").get(claims.sub) as any;
  if (!user) return { data: { session: null }, error: null };
  return {
    data: { session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { must_change_password: Boolean(user.must_change_password) } } } },
    error: null,
  };
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; claims: any } | null> {
  const claims = await verifyJWT(token);
  if (!claims) return null;
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb();
    await ensureCloudSecurityColumns();
    const rows = await db`SELECT session_version FROM auth_users WHERE id=${claims.sub} LIMIT 1`;
    const row = rows[0] as any;
    if (!row || Number(row.session_version ?? 0) !== Number(claims.sv ?? 0)) return null;
  } else {
    const row = getDb().prepare("SELECT session_version FROM auth_users WHERE id = ?").get(claims.sub) as any;
    if (!row || Number(row.session_version ?? 0) !== Number(claims.sv ?? 0)) return null;
  }
  return { userId: claims.sub, email: claims.email, claims };
}

export async function updateUser(token: string, attrs: Record<string, any>) {
  const auth = await verifyToken(token);
  if (!auth) return {data:null,error:{message:"Invalid token"}};
  const password = attrs.password ? String(attrs.password) : "";
  if (password && (password.length < 8 || password.length > 72)) return {data:null,error:{message:"Password must be 8–72 characters"}};
  if (isCloudDatabaseConfigured()) {
    const db = getCloudDb(); await ensureCloudSecurityColumns();
    if (password) { const hash=await Bun.password.hash(password); await db`UPDATE auth_users SET password_hash=${hash},must_change_password=0,session_version=session_version+1,password_changed_at=now(),updated_at=now() WHERE id=${auth.userId}`; }
    if (attrs.email) await db`UPDATE auth_users SET email=${attrs.email},updated_at=now() WHERE id=${auth.userId}`;
    const user=(await db`SELECT id,email,session_version,must_change_password FROM auth_users WHERE id=${auth.userId} LIMIT 1`)[0] as any;
    const newToken=await signJWT({sub:user.id,email:user.email,sv:Number(user.session_version??0),mustChange:Boolean(user.must_change_password),iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+JWT_EXPIRY});
    return {data:{user:{id:user.id,email:user.email,user_metadata:{must_change_password:Boolean(user.must_change_password)}},session:{access_token:newToken,user:{id:user.id,email:user.email}}},error:null};
  }
  const db = getDb();
  if (password) db.prepare("UPDATE auth_users SET password_hash=?, must_change_password=0, session_version=session_version+1, password_changed_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(await Bun.password.hash(password), auth.userId);
  if (attrs.email) db.prepare("UPDATE auth_users SET email=?, updated_at=datetime('now') WHERE id=?").run(attrs.email, auth.userId);
  const user=db.prepare("SELECT id,email,session_version,must_change_password FROM auth_users WHERE id=?").get(auth.userId) as any;
  const newToken=await signJWT({sub:user.id,email:user.email,sv:Number(user.session_version??0),mustChange:Boolean(user.must_change_password),iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+JWT_EXPIRY});
  return {data:{user:{id:user.id,email:user.email,user_metadata:{must_change_password:Boolean(user.must_change_password)}},session:{access_token:newToken,user:{id:user.id,email:user.email}}},error:null};
}

export async function adminResetPassword(token: string, targetUserId: string, newPassword: string, forceChange = true, reason = "Administrator password reset") {
  const auth = await verifyToken(token); if (!auth) return {data:null,error:{message:"NOT_AUTHENTICATED"}};
  const password=String(newPassword||""); if(password.length<8||password.length>72) return {data:null,error:{message:"Password must be 8–72 characters"}};
  const cloud=isCloudDatabaseConfigured(); if(cloud) await ensureCloudSecurityColumns(); const db:any=cloud?getCloudDb():getDb();
  const caller=cloud ? (await db`SELECT company_id,role FROM company_members WHERE user_id=${auth.userId} AND role IN ('owner','admin') ORDER BY updated_at LIMIT 1`)[0] : db.prepare("SELECT company_id,role FROM company_members WHERE user_id=? AND role IN ('owner','admin') ORDER BY updated_at LIMIT 1").get(auth.userId);
  if(!caller) return {data:null,error:{message:"ADMIN_REQUIRED"}};
  const target=cloud ? (await db`SELECT company_id,role FROM company_members WHERE company_id=${caller.company_id} AND user_id=${targetUserId} LIMIT 1`)[0] : db.prepare("SELECT company_id,role FROM company_members WHERE company_id=? AND user_id=? LIMIT 1").get(caller.company_id,targetUserId);
  if(!target) return {data:null,error:{message:"USER_NOT_IN_COMPANY"}};
  if(target.role==="owner" && caller.role!=="owner") return {data:null,error:{message:"ONLY_OWNER_CAN_RESET_OWNER"}};
  const hash=await Bun.password.hash(password);
  if(cloud) await db`UPDATE auth_users SET password_hash=${hash},must_change_password=${forceChange?1:0},session_version=session_version+1,password_changed_at=now(),updated_at=now() WHERE id=${targetUserId}`;
  else db.prepare("UPDATE auth_users SET password_hash=?,must_change_password=?,session_version=session_version+1,password_changed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").run(hash,forceChange?1:0,targetUserId);
  const details=JSON.stringify({target_user_id:targetUserId,force_change:forceChange,reason});
  if(cloud) await db`INSERT INTO audit_logs (id,user_id,actor_email,action,entity_type,entity_id,details) VALUES (${generateUUID()},${auth.userId},${auth.email},'admin_password_reset','auth_user',${targetUserId},${details})`;
  else db.prepare("INSERT INTO audit_logs (id,user_id,actor_email,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?,?)").run(generateUUID(),auth.userId,auth.email,"admin_password_reset","auth_user",targetUserId,details);
  return {data:{reset:true,force_change:forceChange},error:null};
}
