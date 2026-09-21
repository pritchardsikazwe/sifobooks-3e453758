import { getDb, generateUUID } from "./database";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const JWT_SECRET = process.env.JWT_SECRET || loadPersistentSecret();
const JWT_EXPIRY = 60 * 60 * 24 * 7; // 7 days

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

  const token = await signJWT({ sub: id, email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY });
  return {
    data: { user: { id, email, user_metadata: metadata || {} }, session: { access_token: token, user: { id, email } } },
    error: null,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const db = getDb();
  const user = db.prepare("SELECT * FROM auth_users WHERE email = ?").get(email) as any;
  if (!user) {
    return { data: null, error: { message: "Invalid login credentials" } };
  }
  const valid = await Bun.password.verify(password, user.password_hash);
  if (!valid) {
    return { data: null, error: { message: "Invalid login credentials" } };
  }
  const token = await signJWT({ sub: user.id, email: user.email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY });
  return {
    data: { user: { id: user.id, email: user.email }, session: { access_token: token, user: { id: user.id, email: user.email } } },
    error: null,
  };
}

export async function getUser(token: string) {
  if (!token) return { data: { user: null }, error: null };
  const claims = await verifyJWT(token);
  if (!claims) return { data: { user: null }, error: null };
  const db = getDb();
  const user = db.prepare("SELECT id, email, created_at FROM auth_users WHERE id = ?").get(claims.sub) as any;
  if (!user) return { data: { user: null }, error: null };
  // Get profile
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(user.id) as any;
  return {
    data: { user: { id: user.id, email: user.email, user_metadata: profile ? { full_name: profile.full_name } : {} } },
    error: null,
  };
}

export async function getSession(token: string) {
  if (!token) return { data: { session: null }, error: null };
  const claims = await verifyJWT(token);
  if (!claims) return { data: { session: null }, error: null };
  const db = getDb();
  const user = db.prepare("SELECT id, email FROM auth_users WHERE id = ?").get(claims.sub) as any;
  if (!user) return { data: { session: null }, error: null };
  return {
    data: { session: { access_token: token, user: { id: user.id, email: user.email } } },
    error: null,
  };
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string; claims: any } | null> {
  const claims = await verifyJWT(token);
  if (!claims) return null;
  return { userId: claims.sub, email: claims.email, claims };
}

export async function updateUser(token: string, attrs: Record<string, any>) {
  const claims = await verifyJWT(token);
  if (!claims) return { data: null, error: { message: "Invalid token" } };
  const db = getDb();
  if (attrs.password) {
    const hash = await Bun.password.hash(attrs.password);
    db.prepare("UPDATE auth_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, claims.sub);
  }
  if (attrs.email) {
    db.prepare("UPDATE auth_users SET email = ?, updated_at = datetime('now') WHERE id = ?").run(attrs.email, claims.sub);
  }
  const user = db.prepare("SELECT id, email FROM auth_users WHERE id = ?").get(claims.sub) as any;
  return { data: { user }, error: null };
}
