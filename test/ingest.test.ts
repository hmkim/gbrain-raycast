import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { setLang } from "../src/lib/i18n";
import { extractFromFile, extractFromUrl, IngestError, suggestSlug, toPageMarkdown } from "../src/lib/ingest";
import { slugify } from "../src/lib/slug";

setLang("en");

/** Minimal single-page PDF with real text, offsets computed so pdf.js accepts the xref table. */
function makePdf(lines: string[]): Buffer {
  const text = lines.map((l, i) => `BT /F1 14 Tf 72 ${720 - i * 20} Td (${l}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

const ARTICLE = `<!doctype html><html><head><title>Test Article</title></head><body>
<nav>menu</nav><article><h1>Test Article</h1>${"<p>This is a long paragraph of readable article text for extraction. </p>".repeat(20)}
<a href="/rel">relative link</a></article></body></html>`;

let server: Server;
let base = "";

before(async () => {
  const pdf = makePdf([
    "Attention Is All You Need",
    "A transformer paper body with enough text to pass the threshold.",
    "More words here to exceed one hundred characters total.",
  ]);
  server = createServer((req, res) => {
    const routes: Record<string, [number, string, string | Buffer]> = {
      "/article": [200, "text/html; charset=utf-8", ARTICLE],
      "/short": [200, "text/html", "<html><body><p>tiny</p></body></html>"],
      "/paper.pdf": [200, "application/pdf", pdf],
      "/fake.pdf": [200, "application/pdf", "<html>login required</html>"],
      "/image": [200, "image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])],
      "/notes.md": [200, "text/markdown", "# Heading Title\n\nbody text"],
      "/empty": [200, "text/plain", ""],
    };
    const r = routes[req.url ?? ""] ?? [404, "text/plain", "not found"];
    res.writeHead(r[0], { "content-type": r[1] });
    res.end(r[2]);
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const rejects = (p: Promise<unknown>, re: RegExp) =>
  assert.rejects(p, (e: unknown) => e instanceof IngestError && re.test((e as Error).message));

describe("extractFromUrl", () => {
  it("extracts an HTML article to markdown with absolute links", async () => {
    const e = await extractFromUrl(`${base}/article`);
    assert.equal(e.kind, "html");
    assert.equal(e.title, "Test Article");
    assert.match(e.markdown, /readable article text/);
    assert.match(e.markdown, new RegExp(`\\(${base}/rel\\)`));
    assert.doesNotMatch(e.markdown, /menu/);
  });

  it("extracts PDF text and guesses the title", async () => {
    const e = await extractFromUrl(`${base}/paper.pdf`);
    assert.equal(e.kind, "pdf");
    assert.equal(e.pages, 1);
    assert.equal(e.title, "Attention Is All You Need");
    assert.match(e.markdown, /transformer paper body/);
  });

  it("uses the first markdown heading as title", async () => {
    const e = await extractFromUrl(`${base}/notes.md`);
    assert.equal(e.title, "Heading Title");
    assert.equal(e.markdown, "body text");
  });

  it("fails on HTTP errors", () => rejects(extractFromUrl(`${base}/missing`), /HTTP 404/));
  it("fails on short/JS-rendered HTML", () => rejects(extractFromUrl(`${base}/short`), /HTML/));
  it("fails on fake PDFs", () => rejects(extractFromUrl(`${base}/fake.pdf`), /not a PDF/));
  it("fails on binary types", () => rejects(extractFromUrl(`${base}/image`), /Unsupported binary/));
  it("fails on empty bodies", () => rejects(extractFromUrl(`${base}/empty`), /Empty response/));
  it("fails on non-http URLs", () => rejects(extractFromUrl("ftp://example.com/x"), /http\(s\)/));
  it("fails on invalid URLs", () => rejects(extractFromUrl("not a url"), /Invalid URL/));
  it("fails on unreachable hosts", () => rejects(extractFromUrl("http://127.0.0.1:1/"), /Fetch failed/));
});

describe("extractFromFile", () => {
  const dir = mkdtempSync(join(tmpdir(), "gbrain-raycast-test-"));

  it("fails on image-only PDFs (needs OCR)", async () => {
    const p = join(dir, "scan.pdf");
    writeFileSync(p, makePdf([]));
    await rejects(extractFromFile(p), /OCR/);
  });

  it("fails on missing files", () => rejects(extractFromFile(join(dir, "nope.pdf")), /Cannot read file/));

  it("reads local markdown", async () => {
    const p = join(dir, "note.md");
    writeFileSync(p, "# Local note\n\nhello");
    const e = await extractFromFile(p);
    assert.equal(e.title, "Local note");
    assert.equal(e.sourceFile, "note.md");
  });
});

describe("page rendering", () => {
  it("builds frontmatter and slug", async () => {
    const e = await extractFromUrl(`${base}/article`);
    const md = toPageMarkdown(e, new Date("2026-01-02T03:04:05Z"));
    assert.match(md, /^---\ntitle: "Test Article"\nsource_url: /);
    assert.match(md, /fetched_at: "2026-01-02T03:04:05.000Z"/);
    assert.match(suggestSlug(e, "web/", new Date(2026, 0, 2)), /^web\/2026-01-02-test-article$/);
  });

  it("slugifies to ascii", () => {
    assert.equal(slugify("Héllo, World! 한글"), "hello-world");
  });
});
