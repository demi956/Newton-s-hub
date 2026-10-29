#!/usr/bin/env node
// Vercel install step.
//
// bun.lock is written by Lovable and pins tarball URLs on Lovable's private npm cache,
// which returns 403 outside Lovable. On Vercel we point those same pinned versions at the
// public npm registry, then install with the lockfile. This only changes the build
// machine's working copy; the committed lockfile is untouched.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const LOCK = "bun.lock";
if (existsSync(LOCK)) {
  const original = readFileSync(LOCK, "utf8");
  const rewritten = original.replace(
    /https:\/\/[a-z0-9-]+-npm\.pkg\.dev\/lovable-core-prod\/sandbox-npm-cache\//g,
    "https://registry.npmjs.org/",
  );
  if (rewritten !== original) {
    writeFileSync(LOCK, rewritten);
    console.log("[vercel-install] Pointed Lovable cache URLs in bun.lock at registry.npmjs.org");
  }
}

execSync("bun install", { stdio: "inherit" });
