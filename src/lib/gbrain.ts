import { Cache, getPreferenceValues } from "@raycast/api";
import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { t } from "./i18n";

interface Preferences {
  gbrainHome?: string;
  gbrainPath?: string;
  extraPath?: string;
  urlSlugPrefix?: string;
  pdfSlugPrefix?: string;
}

export function prefs(): Required<Preferences> {
  const p = getPreferenceValues<Preferences>();
  return {
    gbrainHome: p.gbrainHome || "",
    gbrainPath: p.gbrainPath || "~/.bun/bin/gbrain",
    extraPath: p.extraPath || "~/.bun/bin:/opt/homebrew/bin:/usr/local/bin",
    urlSlugPrefix: p.urlSlugPrefix || "web",
    pdfSlugPrefix: p.pdfSlugPrefix || "papers",
  };
}

const expandHome = (s: string) => s.replace(/^~(?=$|\/)/, homedir()).replace(/:~(?=$|\/)/g, `:${homedir()}`);

export class GbrainError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
    readonly exitCode: number | null,
    readonly code?: string,
  ) {
    super(message);
    this.name = "GbrainError";
  }
}

interface RunOptions {
  stdin?: string;
  timeoutMs?: number;
}

const cache = new Cache();
const SHELL_ENV_KEY = "shell-env-v2";
const MARKER = "__GBRAIN_RAYCAST_ENV__";

/**
 * Raycast does not source ~/.zshrc, so variables like GBRAIN_HOME set there are missing.
 * Read GBRAIN_* and PATH from an interactive login shell once and cache them.
 */
function shellEnv(): Record<string, string> {
  const cached = cache.get(SHELL_ENV_KEY);
  if (cached) return JSON.parse(cached) as Record<string, string>;

  const shell = process.env.SHELL || "/bin/zsh";
  const r = spawnSync(shell, ["-ilc", `printf '${MARKER}'; env -0`], { encoding: "utf8", timeout: 10_000 });
  const out = r.stdout?.split(MARKER)[1];
  if (!out) return {};
  const picked: Record<string, string> = {};
  for (const kv of out.split("\0")) {
    const i = kv.indexOf("=");
    if (i <= 0) continue;
    const k = kv.slice(0, i);
    if (k === "PATH" || k.startsWith("GBRAIN_")) picked[k] = kv.slice(i + 1);
  }
  cache.set(SHELL_ENV_KEY, JSON.stringify(picked));
  return picked;
}

/** Forget the cached shell environment (e.g. after editing ~/.zshrc). */
export const clearShellEnvCache = () => cache.remove(SHELL_ENV_KEY);

export function gbrainEnv(): NodeJS.ProcessEnv {
  const { gbrainHome, extraPath } = prefs();
  const fromShell = shellEnv();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...fromShell,
    PATH: [expandHome(extraPath), fromShell.PATH, process.env.PATH ?? "/usr/bin:/bin"].filter(Boolean).join(":"),
    NO_COLOR: "1",
  };
  if (gbrainHome) env.GBRAIN_HOME = expandHome(gbrainHome);
  return env;
}

/** Run the gbrain CLI and return stdout. Throws GbrainError on non-zero exit or timeout. */
export function run(args: string[], opts: RunOptions = {}): Promise<string> {
  const { gbrainPath } = prefs();
  const env = gbrainEnv();

  return new Promise((resolve, reject) => {
    const child = spawn(expandHome(gbrainPath), args, { env, cwd: homedir() });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new GbrainError(`gbrain ${args[0]} timed out after ${(opts.timeoutMs ?? 120_000) / 1000}s`, stderr, null));
    }, opts.timeoutMs ?? 120_000);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new GbrainError(`Cannot run gbrain (${e.message}). Check the "gbrain binary" preference.`, stderr, null));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(stdout);
      reject(
        new GbrainError(
          errorMessage(stdout, stderr) || `gbrain ${args[0]} exited with code ${code}`,
          stderr || stdout,
          code,
          errorCode(stdout),
        ),
      );
    });

    if (opts.stdin !== undefined) child.stdin.end(opts.stdin);
    else child.stdin.end();
  });
}

/** gbrain --json prints a structured error object on stdout; plain mode prints "Error [code]: ..." on stderr. */
function errorMessage(stdout: string, stderr: string): string {
  try {
    const e = JSON.parse(stdout) as { message?: string; suggestion?: string };
    if (e?.message) return e.suggestion ? `${e.message} — ${e.suggestion}` : e.message;
  } catch {
    // not JSON
  }
  return firstErrorLine(stderr || stdout);
}

function errorCode(stdout: string): string | undefined {
  try {
    return (JSON.parse(stdout) as { code?: string })?.code;
  } catch {
    return undefined;
  }
}

function firstErrorLine(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => /^error/i.test(l)) ?? lines[0] ?? "";
}

export async function runJson<T>(args: string[], opts?: RunOptions): Promise<T> {
  const out = await run([...args, "--json"], opts);
  try {
    return JSON.parse(out) as T;
  } catch {
    throw new GbrainError(`gbrain ${args[0]} returned non-JSON output`, out.slice(0, 2000), 0);
  }
}

// ---- Typed wrappers -------------------------------------------------------

export interface SearchHit {
  slug: string;
  title: string;
  type: string;
  chunk_text: string;
  score: number;
  effective_date?: string | null;
  source_id?: string;
}

export interface Page {
  slug: string;
  title: string;
  type: string;
  compiled_truth: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  updated_at: string;
  created_at: string;
  effective_date?: string | null;
  source_uri?: string | null;
  source_kind?: string | null;
  trust_tier?: string;
}

export interface PageListItem {
  slug: string;
  title: string;
  type: string;
  updated_at: string;
}

export interface ThinkResult {
  question: string;
  answer: string;
  citations: { page_slug: string; citation_index: number }[];
  gaps: string[];
  pagesGathered: number;
  modelUsed?: string;
  warnings: string[];
  synthesisOk: boolean;
  synthesis_status: string;
}

export interface Fact {
  id: number;
  fact: string;
  kind: string;
  entity_slug: string | null;
  valid_from?: string | null;
  source?: string | null;
}

export const searchPages = (q: string, limit = 20) => runJson<SearchHit[]>(["search", q, "--limit", String(limit)]);
export const queryPages = (q: string, limit = 20) => runJson<SearchHit[]>(["query", q, "--limit", String(limit)]);
export const getPage = (slug: string) => runJson<Page>(["get", slug]);
export const listPages = (limit = 100, type?: string) =>
  runJson<PageListItem[]>(["list", "--limit", String(limit), ...(type ? ["--type", type] : [])]);
export const backlinks = (slug: string) => runJson<unknown>(["backlinks", slug]);
export const think = (question: string) => runJson<ThinkResult>(["think", question], { timeoutMs: 300_000 });
export const recall = (args: string[]) => runJson<{ facts: Fact[] }>(["recall", ...args]);

/** Create a new page from full markdown via stdin. Refuses to touch an existing (or soft-deleted) slug. */
export async function putPage(slug: string, markdown: string, contentOrigin: "tool_output" | "user_said" | "inferred") {
  try {
    await run(["get", slug, "--include-deleted", "--json"]);
    throw new GbrainError(t("slugExists", { slug }), "", 1, "slug_exists");
  } catch (e) {
    if (!(e instanceof GbrainError) || e.code !== "page_not_found") throw e;
  }
  return runJson<Record<string, unknown>>(["put", slug, "--content-origin", contentOrigin], {
    stdin: markdown,
    timeoutMs: 180_000,
  });
}

export const capture = (content: string, slug?: string) =>
  runJson<Record<string, unknown>>(["capture", "--stdin", ...(slug ? ["--slug", slug] : [])], { stdin: content });

export const remember = (fact: string, entity: string | undefined, provenance: string) =>
  runJson<Record<string, unknown>>([
    "remember",
    fact,
    ...(entity ? ["--entity", entity] : []),
    "--provenance",
    provenance,
    "--content-origin",
    "user_said",
  ]);

export const addTag = (slug: string, tag: string) => run(["tag", slug, tag]);

/** Dedupe chunk-level hits to one row per page, keeping the best score. */
export function dedupeHits(hits: SearchHit[]): SearchHit[] {
  const best = new Map<string, SearchHit>();
  for (const h of hits) {
    const cur = best.get(h.slug);
    if (!cur || h.score > cur.score) best.set(h.slug, h);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

export interface WhoAmI {
  transport: string;
  client_name?: string;
  scopes: string[];
  source_id?: string;
}

export const whoami = () => runJson<WhoAmI>(["whoami"]);
export const engineStatus = () => runJson<Record<string, unknown>>(["engine", "status"]);
