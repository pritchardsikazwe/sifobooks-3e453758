import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const FIRST_INSTALL_TRIAL_DAYS = 14;
const INSTALL_MARKER_FILE = "data/.installation.json";
import os from "node:os";

export type SifoBooksLicense = {
  license_id: string;
  customer: string;
  edition: string;
  type: "trial" | "demo" | "subscription" | "perpetual";
  issued_at: string;
  expires_at: string | null;
  max_devices: number;
  fingerprint?: string | null;
  features?: string[];
};

const LICENSE_FILE = "data/license.json";

function baseDir() {
  return process.cwd();
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string) {
  return Buffer.from(input, "base64url");
}

function publicKeyPem() {
  const configured = process.env.SIFOBOOKS_LICENSE_PUBLIC_KEY;
  if (configured) return configured.replace(/\\n/g, "\n");
  const path = join(baseDir(), "config", "license-public-key.pem");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

export function getDeviceFingerprint() {
  let machineId = "";
  if (process.platform === "win32") {
    try {
      const result = Bun.spawnSync(["cmd", "/c", "reg", "query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"]);
      const text = new TextDecoder().decode(result.stdout);
      machineId = text.match(/MachineGuid\\s+REG_SZ\\s+([^\\r\\n]+)/i)?.[1]?.trim() || "";
    } catch {}
  }
  const raw = [machineId, os.hostname(), process.platform, process.arch].filter(Boolean).join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export function encodeLicense(payload: SifoBooksLicense, privateKeyPem: string) {
  const body = b64url(JSON.stringify(payload));
  const signature = sign(null, Buffer.from(body), createPrivateKey(privateKeyPem));
  return body + "." + b64url(signature);
}

export function verifyLicenseToken(token: string): SifoBooksLicense {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) throw new Error("Invalid licence format");
  const pem = publicKeyPem();
  if (!pem) throw new Error("SifoBooks licence public key is not configured");
  const valid = verify(null, Buffer.from(body), createPublicKey(pem), fromB64url(signature));
  if (!valid) throw new Error("Invalid licence signature");
  const payload = JSON.parse(fromB64url(body).toString("utf8")) as SifoBooksLicense;
  if (!payload.license_id || !payload.edition || !payload.type || !payload.issued_at) throw new Error("Incomplete licence");
  if (payload.expires_at && Date.now() > Date.parse(payload.expires_at)) throw new Error("Licence expired");
  const edition = String(process.env.VITE_SIFOBOOKS_EDITION || "enterprise").toLowerCase();
  if (payload.edition !== "enterprise" && payload.edition !== edition) throw new Error(`Licence is for SifoBooks ${payload.edition}, not ${edition}`);
  if (payload.fingerprint && payload.fingerprint !== getDeviceFingerprint()) throw new Error("Licence is not valid for this computer");
  return payload;
}

type FirstInstallTrial = { installed_at: string; expires_at: string; fingerprint: string; };

function firstInstallTrialPath() { return join(baseDir(), INSTALL_MARKER_FILE); }

export function getFirstInstallTrial() {
  const path = firstInstallTrialPath();
  try {
    if (!existsSync(path)) {
      mkdirSync(join(baseDir(), "data"), { recursive: true });
      const installed = new Date();
      const expires = new Date(installed.getTime() + FIRST_INSTALL_TRIAL_DAYS * 86400000);
      const marker: FirstInstallTrial = {
        installed_at: installed.toISOString(),
        expires_at: expires.toISOString(),
        fingerprint: getDeviceFingerprint(),
      };
      writeFileSync(path, JSON.stringify(marker, null, 2), { mode: 0o600 });
      return marker;
    }
    const marker = JSON.parse(readFileSync(path, "utf8")) as FirstInstallTrial;
    if (!marker.installed_at || !marker.expires_at || !marker.fingerprint) throw new Error("Invalid installation marker");
    return marker;
  } catch {
    return null;
  }
}

export function firstInstallTrialStatus() {
  const marker = getFirstInstallTrial();
  if (!marker) return { status: "expired", trial_days: FIRST_INSTALL_TRIAL_DAYS, reason: "Installation trial marker is unavailable" };
  if (marker.fingerprint !== getDeviceFingerprint()) return { status: "expired", trial_days: FIRST_INSTALL_TRIAL_DAYS, expires_at: marker.expires_at, reason: "Trial belongs to a different computer" };
  const remainingMs = Date.parse(marker.expires_at) - Date.now();
  if (remainingMs <= 0) return { status: "expired", trial_days: FIRST_INSTALL_TRIAL_DAYS, expires_at: marker.expires_at };
  return {
    status: "trial",
    trial_days: FIRST_INSTALL_TRIAL_DAYS,
    expires_at: marker.expires_at,
    days_remaining: Math.ceil(remainingMs / 86400000),
    device_fingerprint: getDeviceFingerprint(),
  };
}

export function readStoredLicense(): { token: string; license: SifoBooksLicense } | null {
  const path = join(baseDir(), LICENSE_FILE);
  if (!existsSync(path)) return null;
  try {
    const token = readFileSync(path, "utf8").trim();
    return { token, license: verifyLicenseToken(token) };
  } catch {
    return null;
  }
}

export function storeLicense(token: string) {
  verifyLicenseToken(token);
  const path = join(baseDir(), LICENSE_FILE);
  mkdirSync(join(baseDir(), "data"), { recursive: true });
  writeFileSync(path, token.trim(), { mode: 0o600 });
}

export function clearStoredLicense() {
  const path = join(baseDir(), LICENSE_FILE);
  if (existsSync(path)) writeFileSync(path, "");
}

export function issueLicense(input: Omit<SifoBooksLicense, "license_id" | "issued_at"> & { days?: number }, privateKeyPem: string) {
  const issued = new Date();
  const expires = input.days ? new Date(issued.getTime() + input.days * 86400000) : input.expires_at;
  const payload: SifoBooksLicense = {
    license_id: "SB-" + issued.getTime().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    customer: input.customer,
    edition: input.edition,
    type: input.type,
    issued_at: issued.toISOString(),
    expires_at: expires ? new Date(expires).toISOString() : null,
    max_devices: input.max_devices || 1,
    fingerprint: input.fingerprint || null,
    features: input.features || [],
  };
  return { payload, token: encodeLicense(payload, privateKeyPem) };
}

export function licenseStatus() {
  const stored = readStoredLicense();
  if (stored) return { status: "active", license: stored.license, device_fingerprint: getDeviceFingerprint() };
  const trial = firstInstallTrialStatus();
  if (trial.status === "trial") return { ...trial, device_fingerprint: getDeviceFingerprint() };
  return { status: "unlicensed", ...trial, device_fingerprint: getDeviceFingerprint() };
}
