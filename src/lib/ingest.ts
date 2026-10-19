import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import TurndownService from "turndown";
import { extractText, getDocumentProxy, getMeta } from "unpdf";
import { localDate, slugify } from "./slug";
import { t } from "./i18n";

/** Raised for any fetch/parse failure. Saving must never proceed past one of these. */
export class IngestError extends Error {
  name = "IngestError";
}

export interface Extracted {
  title: string;
  markdown: string;
  kind: "pdf" | "html" | "text";
  sourceUrl?: string;
  sourceFile?: string;
  contentType: string;
  pages?: number;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
}

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_CHARS = 3_000_000;
const MIN_HTML_CHARS = 200;
const MIN_PDF_CHARS = 100;
const FETCH_TIMEOUT_MS = 45_000;

export async function extractFromUrl(rawUrl: string): Promise<Extracted> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new IngestError(t("invalidUrl", { url: rawUrl }));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new IngestError(t("httpOnly", { protocol: url.protocol }));

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,text/plain;q=0.8,*/*;q=0.5",
      },
    });
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
    const msg =
      e instanceof Error && e.name === "TimeoutError"
        ? t("timeout", { sec: FETCH_TIMEOUT_MS / 1000 })
        : cause?.code || cause?.message || (e instanceof Error ? e.message : String(e));
    throw new IngestError(t("fetchFailedHost", { host: url.host, msg }));
  }
  if (!res.ok)
    throw new IngestError(t("fetchFailedHttp", { status: res.status, statusText: res.statusText, url: res.url }));

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES)
    throw new IngestError(t("tooLargeMax", { mb: (declared / 1e6).toFixed(1), max: MAX_BYTES / 1e6 }));
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new IngestError(t("emptyResponse"));
  if (buf.byteLength > MAX_BYTES) throw new IngestError(t("tooLarge", { mb: (buf.byteLength / 1e6).toFixed(1) }));

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const finalUrl = res.url || url.href;
  return finish(await extractBytes(buf, contentType, finalUrl, charsetOf(res.headers.get("content-type"))), {
    sourceUrl: finalUrl,
  });
}

export async function extractFromFile(path: string): Promise<Extracted> {
  let buf: Uint8Array;
  try {
    buf = new Uint8Array(await readFile(path));
  } catch (e) {
    throw new IngestError(t("cannotReadFile", { msg: e instanceof Error ? e.message : String(e) }));
  }
  if (buf.byteLength > MAX_BYTES) throw new IngestError(t("tooLarge", { mb: (buf.byteLength / 1e6).toFixed(1) }));
  const ext = extname(path).toLowerCase();
  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".html" || ext === ".htm"
        ? "text/html"
        : ext === ".md"
          ? "text/markdown"
          : "text/plain";
  const extracted = await extractBytes(buf, contentType, undefined, "utf-8");
  if (extracted.kind === "text" && !extracted.title) extracted.title = basename(path, ext);
  return finish(extracted, { sourceFile: basename(path) });
}

async function extractBytes(
  buf: Uint8Array,
  contentType: string,
  url: string | undefined,
  charset: string,
): Promise<Extracted> {
  const looksPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  if (contentType === "application/pdf" || looksPdf) {
    if (!looksPdf) throw new IngestError(t("fakePdf"));
    return extractPdf(buf, url);
  }
  if (isBinary(buf)) throw new IngestError(t("unsupportedBinary", { type: contentType || "unknown" }));

  const text = decode(buf, charset);
  if (
    contentType === "text/html" ||
    contentType === "application/xhtml+xml" ||
    (!contentType && /^\s*<(!doctype|html)/i.test(text))
  ) {
    return extractHtml(text, url);
  }
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/xml" ||
    !contentType
  ) {
    const body = contentType === "application/json" ? "```json\n" + text.trim() + "\n```" : text.trim();
    if (!body) throw new IngestError(t("emptyBody"));
    const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? "";
    return {
      title: heading || (url ? lastPathSegment(url) : ""),
      markdown: heading ? body.replace(/^#\s+.+\n*/m, "") : body,
      kind: "text",
      contentType: contentType || "text/plain",
    };
  }
  throw new IngestError(t("unsupportedType", { type: contentType }));
}

async function extractPdf(buf: Uint8Array, url?: string): Promise<Extracted> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(buf);
  } catch (e) {
    throw new IngestError(t("pdfParseFailed", { msg: e instanceof Error ? e.message : String(e) }));
  }
  let pages: string[];
  let totalPages: number;
  try {
    const r = await extractText(pdf, { mergePages: false });
    pages = r.text as string[];
    totalPages = r.totalPages;
  } catch (e) {
    throw new IngestError(t("pdfTextFailed", { msg: e instanceof Error ? e.message : String(e) }));
  }
  const chars = pages.reduce((n, p) => n + p.trim().length, 0);
  if (chars < MIN_PDF_CHARS) {
    throw new IngestError(t("pdfNoText", { pages: totalPages, chars }));
  }

  let title = "";
  try {
    const { info } = await getMeta(pdf);
    title = typeof info?.Title === "string" ? info.Title.trim() : "";
  } catch {
    // Metadata is optional; text extraction already succeeded.
  }
  if (!title || /^(untitled|microsoft word)/i.test(title))
    title = guessPdfTitle(pages[0]) || (url ? lastPathSegment(url) : "");

  const markdown = pages.map((p, i) => `<!-- page ${i + 1} -->\n${normalizePdfText(p)}`).join("\n\n");
  return { title, markdown, kind: "pdf", contentType: "application/pdf", pages: totalPages };
}

function extractHtml(html: string, url?: string): Extracted {
  const { document } = parseHTML(html);
  if (url) absolutize(document, url);
  const pageTitle = document.querySelector("title")?.textContent?.trim() ?? "";

  // Readability mutates the DOM it receives.
  const article = new Readability(document as unknown as Document, { charThreshold: MIN_HTML_CHARS }).parse();
  if (!article || !article.content) throw new IngestError(t("htmlNoArticle"));
  const textLen = (article.textContent ?? "").trim().length;
  if (textLen < MIN_HTML_CHARS) throw new IngestError(t("htmlTooShort", { chars: textLen }));

  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  td.remove(["script", "style", "noscript", "iframe"]);
  const markdown = td.turndown(article.content).trim();
  if (!markdown) throw new IngestError(t("htmlEmptyMarkdown"));

  return {
    title: article.title?.trim() || pageTitle || (url ? lastPathSegment(url) : ""),
    markdown,
    kind: "html",
    contentType: "text/html",
    byline: article.byline?.trim() || undefined,
    siteName: article.siteName?.trim() || undefined,
    publishedTime: article.publishedTime?.trim() || undefined,
  };
}

function finish(e: Extracted, src: { sourceUrl?: string; sourceFile?: string }): Extracted {
  if (e.markdown.length > MAX_CHARS)
    throw new IngestError(
      t("extractTooLarge", { chars: e.markdown.length.toLocaleString(), max: MAX_CHARS.toLocaleString() }),
    );
  return {
    ...e,
    ...src,
    title: e.title || src.sourceFile || (src.sourceUrl ? new URL(src.sourceUrl).host : "untitled"),
  };
}

// ---- Page rendering -------------------------------------------------------

/** Build the full page markdown (YAML frontmatter + body) for `gbrain put`. */
export function toPageMarkdown(e: Extracted, fetchedAt = new Date()): string {
  const fm: Record<string, string | number | undefined> = {
    title: e.title,
    source_url: e.sourceUrl,
    source_file: e.sourceFile,
    content_type: e.contentType,
    pages: e.pages,
    byline: e.byline,
    site_name: e.siteName,
    published: e.publishedTime,
    fetched_at: fetchedAt.toISOString(),
    ingested_via: "raycast-gbrain",
  };
  const yaml = Object.entries(fm)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
    .join("\n");
  const src = e.sourceUrl ? `> Source: <${e.sourceUrl}>\n\n` : e.sourceFile ? `> Source file: ${e.sourceFile}\n\n` : "";
  return `---\n${yaml}\n---\n\n# ${e.title}\n\n${src}${e.markdown}\n`;
}

export function suggestSlug(e: Extracted, prefix: string, now = new Date()): string {
  const date = localDate(now);
  let base = slugify(e.title);
  if (base.length < 3)
    base = slugify(e.sourceUrl ? new URL(e.sourceUrl).host + "-" + lastPathSegment(e.sourceUrl) : (e.sourceFile ?? ""));
  if (base.length < 3) base = shortHash(e.markdown);
  return `${prefix.replace(/\/+$/, "")}/${date}-${base}`.slice(0, 120).replace(/-+$/, "");
}

// ---- helpers --------------------------------------------------------------

function absolutize(document: ReturnType<typeof parseHTML>["document"], base: string) {
  for (const [sel, attr] of [
    ["a[href]", "href"],
    ["img[src]", "src"],
  ] as const) {
    for (const el of document.querySelectorAll(sel)) {
      const v = el.getAttribute(attr);
      if (!v || v.startsWith("#") || v.startsWith("data:") || v.startsWith("javascript:")) continue;
      try {
        el.setAttribute(attr, new URL(v, base).href);
      } catch {
        // leave malformed URLs untouched
      }
    }
  }
}

function charsetOf(ct: string | null): string {
  return (
    /charset=([^;]+)/i
      .exec(ct ?? "")?.[1]
      ?.trim()
      .replace(/"/g, "") || "utf-8"
  );
}

function decode(buf: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

function isBinary(buf: Uint8Array): boolean {
  const n = Math.min(buf.byteLength, 8192);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

function normalizePdfText(t: string): string {
  return t
    .replace(/\r/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2") // re-join hyphenated line breaks
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** First plausible title line on page 1, skipping license/venue boilerplate. Editable in the preview form. */
function guessPdfTitle(t = ""): string {
  const boiler =
    /(permission|copyright|licen[cs]e|arxiv|preprint|proceedings|conference|journal|doi|http|@|©|\d{4}\s*$)/i;
  const lines = t.split("\n").map((l) => l.trim());
  return (
    lines.find(
      (l) =>
        l.length >= 8 && l.length <= 160 && !boiler.test(l) && !/[.,;:]$/.test(l) && /^[\p{Lu}\p{Lo}\d"'“]/u.test(l),
    ) ??
    lines.find((l) => l.length > 3) ??
    ""
  ).slice(0, 200);
}

function lastPathSegment(u: string): string {
  try {
    const p = new URL(u).pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(p).replace(/\.(pdf|html?)$/i, "");
  } catch {
    return "";
  }
}

function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0");
}
