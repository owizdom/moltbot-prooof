import * as crypto from "crypto";
import type { KeyObject } from "crypto";

/** Canonical separator for binding prompt and output in the signed message. */
export const MESSAGE_SEP = "\0";

export interface Attestation {
  signature: string;
  publicKey?: string;
}

/**
 * Build the message that is signed: prompt + separator + output.
 * Must match verifier's buildMessage exactly.
 */
export function buildMessage(prompt: string, output: string): Buffer {
  return Buffer.from(prompt + MESSAGE_SEP + output, "utf8");
}

/**
 * Create an attestation (signature) over (prompt, output) using the bot's secret key.
 * Only the holder of sk can produce a valid attestation for a given (prompt, output).
 */
export function createAttestation(
  prompt: string,
  output: string,
  privateKey: KeyObject
): Attestation {
  const message = buildMessage(prompt, output);
  // Ed25519: use crypto.sign with algorithm null
  const signature = crypto.sign(null, message, privateKey);
  return {
    signature: signature.toString("base64"),
  };
}

/**
 * Create attestation and optionally include public key in the attestation object
 * (e.g. for Moltbook when multiple bot keys may exist).
 */
export function createAttestationWithPublicKey(
  prompt: string,
  output: string,
  privateKey: KeyObject,
  publicKey: KeyObject
): Attestation {
  const att = createAttestation(prompt, output, privateKey);
  att.publicKey = publicKey.export({ format: "pem", type: "spki" }).toString();
  return att;
}
