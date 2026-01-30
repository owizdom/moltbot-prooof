import * as crypto from "crypto";
import type { KeyObject } from "crypto";
import { buildMessage } from "./attestation";
import type { Attestation } from "./attestation";

/**
 * Verify an attestation: checks that the signature over (prompt, output) is valid
 * for the given bot public key. If true, the post is attested as moltbot(prompt) → output.
 */
export function verifyAttestation(
  prompt: string,
  output: string,
  signature: string,
  publicKey: KeyObject | string
): boolean {
  const message = buildMessage(prompt, output);
  const sigBuffer = Buffer.from(signature, "base64");
  const pk = typeof publicKey === "string" ? crypto.createPublicKey(publicKey) : publicKey;
  try {
    return crypto.verify(null, message, pk, sigBuffer);
  } catch {
    return false;
  }
}

/**
 * Verify a full attestation object (signature and optional publicKey).
 * If attestation.publicKey is set, use it; otherwise caller must pass botPublicKey.
 */
export function verifyAttestationObject(
  prompt: string,
  output: string,
  attestation: Attestation,
  botPublicKey?: KeyObject | string
): boolean {
  const pk = attestation.publicKey
    ? crypto.createPublicKey(attestation.publicKey)
    : botPublicKey;
  if (!pk) return false;
  return verifyAttestation(prompt, output, attestation.signature, pk);
}
