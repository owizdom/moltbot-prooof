import * as fs from "fs";
import * as path from "path";
import { verifyAttestationObject } from "./verifier";
import type { Attestation } from "./attestation";
import { getBotPublicKeyPem } from "./moltbot";

export interface Post {
  prompt: string;
  output: string;
  attestation: Attestation;
}

export interface VerifiedPost extends Post {
  verified: boolean;
}

const FEED_PATH = process.env.MOLTBOOK_FEED_PATH ?? path.join(process.cwd(), "moltbook_feed.json");

/**
 * Load the feed from disk. Returns empty array if file does not exist.
 */
export function loadFeed(): Post[] {
  if (!fs.existsSync(FEED_PATH)) return [];
  const raw = fs.readFileSync(FEED_PATH, "utf8");
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Append a post to the feed and persist.
 */
export function appendPost(post: Post): void {
  const feed = loadFeed();
  feed.push(post);
  fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2), "utf8");
}

/**
 * Verify a single post: returns true iff the attestation is valid for (prompt, output).
 * Uses attestation.publicKey if present, otherwise botPublicKey.
 */
export function verifyPost(
  post: Post,
  botPublicKey?: string
): boolean {
  const pk = post.attestation.publicKey
    ? undefined
    : (botPublicKey ?? getBotPublicKeyPem());
  return verifyAttestationObject(
    post.prompt,
    post.output,
    post.attestation,
    pk
  );
}

/**
 * Load feed and verify each post. Returns list of posts with verified flag.
 */
export function loadAndVerifyFeed(botPublicKey?: string): VerifiedPost[] {
  const feed = loadFeed();
  const pk = botPublicKey ?? getBotPublicKeyPem();
  return feed.map((post) => ({
    ...post,
    verified: verifyPost(post, pk),
  }));
}

/**
 * Display feed to console: each post with "Verified by moltbot" or "Unverified".
 */
export function printFeed(botPublicKey?: string): void {
  const verifiedFeed = loadAndVerifyFeed(botPublicKey);
  if (verifiedFeed.length === 0) {
    console.log("No posts in Moltbook.");
    return;
  }
  for (let i = 0; i < verifiedFeed.length; i++) {
    const post = verifiedFeed[i];
    const badge = post.verified ? " [Verified by moltbot]" : " [Unverified]";
    console.log(`--- Post ${i + 1}${badge} ---`);
    console.log("Prompt:", post.prompt);
    console.log("Output:", post.output);
    console.log();
  }
}

// CLI: list posts with verification; optional: post a new entry from stdin
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === "post") {
    // post <prompt> => run moltbot and append to feed
    const { moltbot } = require("./moltbot");
    const prompt = args.slice(1).join(" ") || "Hello from CLI.";
    const result = moltbot(prompt);
    appendPost({
      prompt: result.prompt,
      output: result.output,
      attestation: result.attestation,
    });
    console.log("Posted to Moltbook.");
    console.log("Prompt:", result.prompt);
    console.log("Output:", result.output);
  } else {
    printFeed();
  }
}
