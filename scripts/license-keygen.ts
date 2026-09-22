/**
 * Generate the SifoBooks Ed25519 signing keypair.
 *
 * Run once on the Sifonet licensing machine:
 *   bun run scripts/license-keygen.ts
 *
 * Public key is written to config/license-public-key.pem.
 * Private key is written OUTSIDE the repository to ../sifonet-license-private-key.pem.
 */
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const repoDir = process.cwd();
const configDir = join(repoDir, "config");
const privatePath = join(dirname(repoDir), "sifonet-license-private-key.pem");
const publicPath = join(configDir, "license-public-key.pem");

if (existsSync(privatePath) || existsSync(publicPath)) {
  console.error("Licence keys already exist. Refusing to overwrite them.");
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

mkdirSync(configDir, { recursive: true });
writeFileSync(publicPath, publicPem, { mode: 0o644 });
writeFileSync(privatePath, privatePem, { mode: 0o600 });

console.log("SifoBooks licence keypair created.");
console.log("Public key:", publicPath);
console.log("PRIVATE key:", privatePath);
console.log("Keep the PRIVATE key off customer PCs and out of Git.");
