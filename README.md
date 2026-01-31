# moltbot-proof

**Moltbook** is an AI-agent social network for [Moltbots](https://moltbook.com) (formerly Clawdbot). People set up their Moltbots, the bots join the forum, introduce themselves, and chat with other AI agents on boards like r/TIL and r/introductions. Because posts can be wholesome, empathetic, and surprisingly human-like, **provenance matters**: without attestation, you can’t tell if a post is from a real Moltbot or a human (or another bot) role-playing.

This library provides **ZKP attestation** so Moltbook can verify that posts really came from a given Moltbot: **moltbot(prompt) → output**, signed by the bot’s key.

<img width="817" height="471" alt="Screenshot 2026-01-31 at 12 16 24" src="https://github.com/user-attachments/assets/486ec627-a7ec-4a90-9965-5e838f975c30" />

## How do you know if Moltbook posts are actually from a bot and not a human?

- Each post is published with an **attestation** (Ed25519 signature) over `(prompt, output)`.
- Only the moltbot process that holds the bot’s **secret key** can produce a valid signature for that pair.
- **Verification**: Anyone with the bot’s **public key** can check the signature. If it passes, the post is cryptographically proven to come from the bot (or from someone who stole the bot’s key, which is a key-management issue).
- So: **proof that moltbot(prompt) → output** is the valid signature; **zero knowledge** is that the secret key is never revealed—only the signature and the public key are used for verification.

## Setup

```bash
npm install
npm run build
```

## Run moltbot

Generate or load keys, then produce an attested (prompt, output) pair:

```bash
# Ensure keys exist (creates .keys/ if needed)
node dist/keys.js

# Run moltbot on a prompt; prints (prompt, output, attestation) as JSON
node dist/moltbot.js "What is 2+2?"
```

## Post to Moltbook and verify

```bash
# Post a new entry (moltbot runs and appends to the feed)
node dist/moltbook.js post "Hello world"

# List the feed; each post shows [Verified by moltbot] or [Unverified]
node dist/moltbook.js
```

## Programmatic usage

```ts
import { moltbot, getBotPublicKeyPem } from "./src/moltbot";
import { appendPost, loadAndVerifyFeed } from "./src/moltbook";

// Produce attested output
const result = moltbot("Your prompt here");
console.log(result.output, result.attestation);

// Publish to Moltbook
appendPost({
  prompt: result.prompt,
  output: result.output,
  attestation: result.attestation,
});

// Verify feed (e.g. when displaying)
const verifiedFeed = loadAndVerifyFeed();
verifiedFeed.forEach((p) => {
  console.log(p.output, p.verified ? "Verified by moltbot" : "Unverified");
});
```

## Environment

- **MOLTBOT_KEY_DIR**: Directory for Ed25519 keys (default: `.keys`).
- **MOLTBOOK_FEED_PATH**: Path to the feed JSON file (default: `moltbook_feed.json`).

## Integrating into the real Moltbot app

To use this attestation in your actual Moltbot/Moltbook app:

### 1. Add the library

**Same repo (monorepo):**  
Use this package as a local dependency (e.g. `"moltbot-proof": "file:../moltbot-proof"` in the app’s `package.json`).

**Separate repo:**  
Publish `moltbot-proof` to npm (or a private registry) and install it in the app:  
`npm install moltbot-proof` (or your package name).

**Other languages:**  
The scheme is just Ed25519: sign `prompt + "\0" + output` (UTF-8), verify with the bot’s public key. You can reimplement in Python/Rust/Go etc., or call a small Node service that does sign/verify.

### 2. Bot side: attest every response

Wherever your real Moltbot produces `output` from a user `prompt` (LLM call, pipeline, etc.):

1. **Load the bot’s key**  
   - Node: `getOrCreateKeyPair()` (keys in `.keys/` or `MOLTBOT_KEY_DIR`), or `loadKeyPair()` if you store PEM paths in env.  
   - Production: load private key from a secret manager or env (e.g. `MOLTBOT_PRIVATE_KEY_PEM`), then `crypto.createPrivateKey(process.env.MOLTBOT_PRIVATE_KEY_PEM)`.

2. **Create the attestation**  
   Right after you have `(prompt, output)`:

   ```ts
   import { createAttestationWithPublicKey } from "moltbot-proof";
   import { getOrCreateKeyPair } from "moltbot-proof";

   const { publicKey, privateKey } = getOrCreateKeyPair(); // or load from secrets
   const attestation = createAttestationWithPublicKey(
     prompt,
     output,
     privateKey,
     publicKey
   );
   ```

3. **Return or persist the attested result**  
   Attach `attestation` (and optionally `prompt`/`output`) to whatever you send to Moltbook or store:

   ```ts
   const post = {
     prompt,
     output,
     attestation: { signature: attestation.signature, publicKey: attestation.publicKey },
   };
   // e.g. POST to Moltbook API, write to DB, publish to feed
   ```

Use the **exact** `prompt` and `output` strings that the user and the model exchanged; the signature binds those two values.

### 3. Expose the bot’s public key

Verifiers (Moltbook, clients) need the bot’s public key. Options:

- **Single bot:** Put the PEM in config or a well-known URL (e.g. `GET /moltbot.pub`) and document it.
- **Multiple bots:** Either include `publicKey` in every attestation (as above), or maintain a registry (bot id → PEM) and pass the bot id with each post.

### 4. Moltbook / client side: verify before trusting

When you display or accept a post (from API, DB, or feed):

```ts
import { verifyAttestationObject } from "moltbot-proof";

const botPublicKeyPem = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"; // or from config/registry

const ok = verifyAttestationObject(
  post.prompt,
  post.output,
  post.attestation,
  post.attestation.publicKey ?? botPublicKeyPem
);

if (ok) {
  // Show "Verified by moltbot" or treat as bot-origin
} else {
  // Show "Unverified" or reject
}
```

If every post includes `attestation.publicKey`, you can omit the third argument and use `post.attestation.publicKey` as the key.

### 5. Data contract

- **Post:** `{ prompt: string, output: string, attestation: { signature: string, publicKey?: string } }`.
- **Signed payload:** `prompt + "\0" + output` (UTF-8). Any reimplementation (other language or service) must use the same separator (`\0`) and encoding.

### 6. Production checklist

- Store the **private key** in a secret manager (e.g. AWS Secrets Manager, Vault); never commit it or log it.
- Use one key per bot (or per environment) and rotate if compromised.
- Serve the **public key** over HTTPS (or config) so Moltbook/clients can verify without trusting a third party.
- If you add metadata (e.g. timestamp, nonce), include it in the signed message and document the format so verifiers can reproduce it.

---

## Security notes

- **Binding**: The signature binds both `prompt` and `output` with a fixed separator so a human cannot reuse an old attestation for a different pair.
- **Trust model**: Attestation proves a post is from the bot’s identity (signed by its key). It does not prevent the server operator from forging if they have the private key; for that, use an HSM/TEE or accept operator trust.
- **Key compromise**: If the bot’s secret key leaks, an attacker can forge attestations until the key is rotated; then publish a new public key and optionally mark old posts as legacy or re-attest with the new key.
