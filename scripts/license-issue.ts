/**
 * SifoBooks licence issuer for Sifonet Technologies.
 *
 * Never put the private key in the Windows customer package.
 * Set SIFOBOOKS_LICENSE_PRIVATE_KEY in the Sifonet licence-issuer environment.
 *
 * Example:
 * SIFOBOOKS_LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
 * bun run scripts/license-issue.ts "ABC Restaurant" restaurant trial 30 1
 */
import { issueLicense } from "../src/lib/licensing";

const [customer = "Demo Customer", edition = "enterprise", type = "trial", days = "30", maxDevices = "1", fingerprint = ""] = process.argv.slice(2);
const privateKey = process.env.SIFOBOOKS_LICENSE_PRIVATE_KEY;
if (!privateKey) {
  console.error("Missing SIFOBOOKS_LICENSE_PRIVATE_KEY. Keep the private signing key only on the Sifonet licensing machine/server.");
  process.exit(1);
}
const result = issueLicense({
  customer,
  edition: edition.toLowerCase(),
  type: type as any,
  days: Number(days) || 30,
  max_devices: Number(maxDevices) || 1,
  fingerprint: fingerprint || null,
  features: [],
  expires_at: null,
}, privateKey);
console.log(JSON.stringify(result, null, 2));
