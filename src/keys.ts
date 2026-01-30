import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const SEP = "\0";
const KEY_DIR = process.env.MOLTBOT_KEY_DIR ?? path.join(process.cwd(), ".keys");
const PRIVATE_KEY_PATH = path.join(KEY_DIR, "moltbot_ed25519.pem");
const PUBLIC_KEY_PATH = path.join(KEY_DIR, "moltbot_ed25519.pub.pem");

export interface KeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
}

/**
 * Generate a new Ed25519 key pair for moltbot.
 * Keys are persisted under KEY_DIR (default: .keys/).
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  const publicKeyObj = crypto.createPublicKey(publicKey);
  const privateKeyObj = crypto.createPrivateKey(privateKey);
  return { publicKey: publicKeyObj, privateKey: privateKeyObj };
}

/**
 * Persist key pair to disk. Creates KEY_DIR if needed.
 */
export function persistKeyPair(pair: KeyPair): void {
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }
  fs.writeFileSync(PRIVATE_KEY_PATH, pair.privateKey.export({ format: "pem", type: "pkcs8" }).toString());
  fs.writeFileSync(PUBLIC_KEY_PATH, pair.publicKey.export({ format: "pem", type: "spki" }).toString());
}

/**
 * Load key pair from disk. Returns null if files do not exist.
 */
export function loadKeyPair(): KeyPair | null {
  if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
    return null;
  }
  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH, "utf8"));
  const publicKey = crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY_PATH, "utf8"));
  return { publicKey, privateKey };
}

/**
 * Get or create moltbot key pair. If no keys exist, generates and persists them.
 */
export function getOrCreateKeyPair(): KeyPair {
  const existing = loadKeyPair();
  if (existing) return existing;
  const pair = generateKeyPair();
  persistKeyPair(pair);
  return pair;
}

/**
 * Export public key as PEM string (for sharing with Moltbook/verifiers).
 */
export function exportPublicKeyPem(publicKey: crypto.KeyObject): string {
  return publicKey.export({ format: "pem", type: "spki" }).toString();
}

// CLI: generate/ensure keys and print public key path
if (require.main === module) {
  const pair = getOrCreateKeyPair();
  console.log("Moltbot keys ready.");
  console.log("Public key (share with Moltbook):", PUBLIC_KEY_PATH);
  console.log("Public key PEM:\n" + exportPublicKeyPem(pair.publicKey));
}
