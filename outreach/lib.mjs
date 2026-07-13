/**
 * Shared helpers for the outreach pipeline. Dependency-free (Node 18+ built-ins only).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(ROOT, "data");
export const OUTPUT_DIR = resolve(ROOT, "output");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Load outreach/.env into process.env (simple KEY=VALUE parser, no dependency). */
export async function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = await readFile(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

/** fetch() with an AbortController timeout. Returns null on any failure. */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Run `fn` over `items` with bounded concurrency; preserves input order. */
export async function pMap(items, fn, concurrency = 6) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_JUNK = /\.(png|jpe?g|gif|svg|webp|ico|css|js)$/i;
const EMAIL_BLOCKLIST = [
  "example.com", "sentry", "wixpress.com", "domain.com", "email.com",
  "yourdomain", "godaddy", "squarespace", "wix.com", "no-reply", "noreply",
];

/** Pull plausible contact emails out of raw HTML, ranked (info@/contact@ first). */
export function extractEmails(html, siteDomain = "") {
  if (!html) return [];
  const found = new Set();
  for (const raw of html.match(EMAIL_RE) || []) {
    const e = raw.toLowerCase().replace(/^mailto:/, "");
    if (EMAIL_JUNK.test(e)) continue;
    if (EMAIL_BLOCKLIST.some((b) => e.includes(b))) continue;
    if (e.length > 60) continue;
    found.add(e);
  }
  const emails = [...found];
  const score = (e) => {
    let s = 0;
    const local = e.split("@")[0];
    const dom = e.split("@")[1] || "";
    if (["info", "contact", "hello", "office", "sales", "admin"].includes(local)) s += 3;
    if (siteDomain && dom.includes(siteDomain.replace(/^www\./, ""))) s += 2; // matches the business's own domain
    if (["gmail.com", "yahoo.com", "aol.com", "hotmail.com", "outlook.com"].includes(dom)) s += 1;
    return s;
  };
  return emails.sort((a, b) => score(b) - score(a));
}

/** Bare hostname of a URL (no protocol, no www, no path). */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

export async function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(path, data) {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2));
}

/** Escape one CSV cell (RFC-4180: quote if it contains comma, quote, or newline). */
function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows: array of objects; columns: array of keys. Returns CSV text with a header row. */
export function toCsv(rows, columns) {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

/** Parse `--flag value` and `--flag=value` style args into a plain object. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq !== -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      out[a.slice(2)] = argv[++i];
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}
