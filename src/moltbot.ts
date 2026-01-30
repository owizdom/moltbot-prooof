import { getOrCreateKeyPair, exportPublicKeyPem } from "./keys";
import { createAttestationWithPublicKey } from "./attestation";
import type { Attestation } from "./attestation";

export interface MoltbotResult {
  prompt: string;
  output: string;
  attestation: Attestation;
}

/**
 * Stub implementation: given a prompt, produce an output and an attestation.
 * In production, "output" would come from your actual moltbot model; here we use a deterministic stub.
 */
function moltbotCompute(prompt: string): string {
  // Stub: echo-style response. Replace with real model inference.
  return `[moltbot] You said: "${prompt}"`;
}

/**
 * Single API: moltbot(prompt) → (output, attestation).
 * Ensures only the bot (holder of sk) can produce a valid attestation for (prompt, output).
 */
export function moltbot(prompt: string): MoltbotResult {
  const { publicKey, privateKey } = getOrCreateKeyPair();
  const output = moltbotCompute(prompt);
  const attestation = createAttestationWithPublicKey(
    prompt,
    output,
    privateKey,
    publicKey
  );
  return { prompt, output, attestation };
}

/**
 * Return the bot's public key (for Moltbook to verify posts).
 */
export function getBotPublicKeyPem(): string {
  const pair = getOrCreateKeyPair();
  return exportPublicKeyPem(pair.publicKey);
}

// CLI: accept prompt from argv, print (prompt, output, attestation) as JSON
if (require.main === module) {
  const prompt = process.argv.slice(2).join(" ") || "Hello, moltbot.";
  const result = moltbot(prompt);
  console.log(JSON.stringify(result, null, 2));
}
