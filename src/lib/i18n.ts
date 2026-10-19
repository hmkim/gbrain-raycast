/* eslint-disable @typescript-eslint/no-require-imports */
type Lang = "en" | "ko";

const en = {
  // gbrain
  slugExists: "Slug already exists: {slug} (not overwritten; choose another slug)",
  // ingest
  invalidUrl: "Invalid URL: {url}",
  httpOnly: "Only http(s) URLs are supported: {protocol}",
  timeout: "timed out after {sec}s",
  fetchFailedHost: "Fetch failed ({host}): {msg}",
  fetchFailedHttp: "Fetch failed: HTTP {status} {statusText} ({url})",
  tooLargeMax: "File too large: {mb}MB (max {max}MB)",
  tooLarge: "File too large: {mb}MB",
  emptyResponse: "Empty response body",
  cannotReadFile: "Cannot read file: {msg}",
  fakePdf: "Content-Type says PDF but the data is not a PDF (possibly a login or block page)",
  unsupportedBinary: "Unsupported binary format: {type}",
  emptyBody: "Body is empty",
  unsupportedType: "Unsupported Content-Type: {type}",
  pdfParseFailed: "PDF parsing failed: {msg}",
  pdfTextFailed: "PDF text extraction failed: {msg}",
  pdfNoText: "No text could be extracted from the PDF ({pages} pages, {chars} chars). Scanned PDFs need OCR.",
  htmlNoArticle: "HTML extraction failed: no readable article found (page may be JS-rendered or require login)",
  htmlTooShort: "HTML body too short ({chars} chars). Page may be JS-rendered or access-restricted.",
  htmlEmptyMarkdown: "HTML → Markdown conversion produced nothing",
  extractTooLarge: "Extracted content too large: {chars} chars (max {max})",
  // common
  saving: "Saving…",
  saved: "Saved",
  saveFailed: "Save failed",
  openPage: "Open Page",
  // page detail
  pageLoadFailed: "Could not load page",
  // search
  cmdFailed: "gbrain {cmd} failed",
  queryPlaceholder: "Hybrid semantic search…",
  searchPlaceholder: "Keyword search…",
  searchFailed: "Search failed",
  minChars: "Type at least 2 characters",
  noResults: "No results",
  // capture
  enterContent: "Enter some content",
  capturing: "Capturing…",
  captured: "Captured",
  captureFailed: "Capture failed",
  capturePlaceholder: "Note to save under inbox/ (Markdown)",
  // recall
  recallQuestionPlaceholder: "Find facts by question… (empty = recent)",
  recallEntityPlaceholder: "Entity name or slug…",
  recallFailed: "Recall failed",
  // recent
  recentPlaceholder: "Filter recent pages…",
  listFailed: "List failed",
  // remember
  enterFact: "Enter a fact",
  remembered: "Remembered ({status})",
  factPlaceholder: "One claim",
  entityPlaceholder: "Person/company/project name or slug (empty = infer)",
  provenancePlaceholder: "Source (empty = 'user said via Raycast')",
  // save url
  enterUrlOrFile: "Enter a URL or choose a file",
  parsingFile: "Parsing file…",
  fetching: "Fetching…",
  extracted: "{kind} extracted",
  extractStats: "{chars} chars{pages}",
  pagesSuffix: " · {pages} pages",
  pagesLabel: "{pages} pages",
  charsLabel: "{chars} chars",
  fetchFailedNotSaved: "Fetch failed — nothing saved",
  urlPlaceholder: "https://… (web page or PDF)",
  orLocalFile: "Or local file",
  fileInfo: "PDF, HTML, Markdown, or text. A selected file takes precedence over the URL.",
  saveUrlNote:
    "If text extraction (HTML Readability / PDF text) fails, the command stops with an error and saves nothing.",
  slugInvalid: "Use only lowercase letters, digits, - _ . and /",
  savingToBrain: "Saving to brain…",
  tagsFailed: "Page saved, but adding tags failed",
  slugInfo: "gbrain refuses existing slugs (never overwrites).",
  // status
  statusTitle: "gbrain connection",
  noGbrainHome: "(unset — default ~/.gbrain)",
  connected: "Connected",
  connectFailed: "Connection failed",
  statusHint:
    "If `gbrain whoami` works in your terminal but fails here: run **Reload Shell Environment** after editing ~/.zshrc, or set GBRAIN_HOME in Preferences.",
  // think
  thinkFailed: "Think failed",
  thinking: "Gathering evidence and synthesizing…",
  noAnswer: "(no answer)",
};

type Key = keyof typeof en;

const ko: Record<Key, string> = {
  slugExists: "이미 존재하는 slug입니다: {slug} (덮어쓰지 않음 — 다른 slug를 지정하세요)",
  invalidUrl: "잘못된 URL: {url}",
  httpOnly: "http(s) URL만 지원합니다: {protocol}",
  timeout: "{sec}s 타임아웃",
  fetchFailedHost: "Fetch 실패 ({host}): {msg}",
  fetchFailedHttp: "Fetch 실패: HTTP {status} {statusText} ({url})",
  tooLargeMax: "파일이 너무 큽니다: {mb}MB (최대 {max}MB)",
  tooLarge: "파일이 너무 큽니다: {mb}MB",
  emptyResponse: "빈 응답 본문",
  cannotReadFile: "파일을 읽을 수 없습니다: {msg}",
  fakePdf: "Content-Type은 PDF이지만 실제 PDF 데이터가 아닙니다 (로그인/차단 페이지일 수 있음)",
  unsupportedBinary: "지원하지 않는 바이너리 형식: {type}",
  emptyBody: "본문이 비어 있습니다",
  unsupportedType: "지원하지 않는 Content-Type: {type}",
  pdfParseFailed: "PDF 파싱 실패: {msg}",
  pdfTextFailed: "PDF 텍스트 추출 실패: {msg}",
  pdfNoText: "PDF에서 텍스트를 추출하지 못했습니다 ({pages}쪽, {chars}자). 스캔 이미지 PDF는 OCR이 필요합니다.",
  htmlNoArticle:
    "HTML 본문 추출 실패: 읽을 수 있는 본문을 찾지 못했습니다 (JS 렌더링 페이지/로그인 필요 페이지일 수 있음)",
  htmlTooShort: "HTML 본문이 너무 짧습니다 ({chars}자). JS 렌더링 또는 접근 제한 페이지일 수 있습니다.",
  htmlEmptyMarkdown: "HTML → Markdown 변환 결과가 비어 있습니다",
  extractTooLarge: "추출 결과가 너무 큽니다: {chars}자 (최대 {max}자)",
  saving: "저장 중…",
  saved: "저장됨",
  saveFailed: "저장 실패",
  openPage: "페이지 열기",
  pageLoadFailed: "페이지를 불러오지 못했습니다",
  cmdFailed: "gbrain {cmd} 실패",
  queryPlaceholder: "의미 기반 하이브리드 검색…",
  searchPlaceholder: "키워드 검색…",
  searchFailed: "검색 실패",
  minChars: "2자 이상 입력하세요",
  noResults: "결과 없음",
  enterContent: "내용을 입력하세요",
  capturing: "캡처 중…",
  captured: "캡처됨",
  captureFailed: "캡처 실패",
  capturePlaceholder: "inbox/에 저장할 메모 (Markdown)",
  recallQuestionPlaceholder: "질문으로 사실 찾기… (비우면 최근)",
  recallEntityPlaceholder: "엔티티 이름/slug…",
  recallFailed: "Recall 실패",
  recentPlaceholder: "최근 페이지 필터…",
  listFailed: "목록 실패",
  enterFact: "사실(fact)을 입력하세요",
  remembered: "기억함 ({status})",
  factPlaceholder: "한 가지 사실",
  entityPlaceholder: "사람/회사/프로젝트 이름 또는 slug (비우면 자동 추론)",
  provenancePlaceholder: "출처 (비우면 'user said via Raycast')",
  enterUrlOrFile: "URL 또는 파일을 입력하세요",
  parsingFile: "파일 파싱 중…",
  fetching: "가져오는 중…",
  extracted: "{kind} 추출 완료",
  extractStats: "{chars}자{pages}",
  pagesSuffix: " · {pages}쪽",
  pagesLabel: "{pages}쪽",
  charsLabel: "{chars}자",
  fetchFailedNotSaved: "가져오기 실패 — 저장하지 않았습니다",
  urlPlaceholder: "https://… (웹 페이지 또는 PDF)",
  orLocalFile: "또는 로컬 파일",
  fileInfo: "PDF, HTML, Markdown, 텍스트. 파일을 선택하면 URL보다 우선합니다.",
  saveUrlNote: "본문 추출(HTML Readability / PDF 텍스트)에 실패하면 에러로 중단되고 저장하지 않습니다.",
  slugInvalid: "소문자/숫자/-/_/. 와 / 만 사용",
  savingToBrain: "Brain에 저장 중…",
  tagsFailed: "페이지는 저장됐지만 태그 추가 실패",
  slugInfo: "이미 존재하는 slug면 gbrain이 거부합니다 (덮어쓰지 않음).",
  statusTitle: "gbrain 연결 상태",
  noGbrainHome: "(없음 — 기본 ~/.gbrain 사용)",
  connected: "연결됨",
  connectFailed: "연결 실패",
  statusHint:
    "터미널에서 `gbrain whoami`가 되는데 여기서 실패하면: ~/.zshrc 수정 후 **Reload Shell Environment** 실행, 또는 Preferences에서 GBRAIN_HOME 지정.",
  thinkFailed: "Think 실패",
  thinking: "근거를 모으고 종합하는 중…",
  noAnswer: "(답변 없음)",
};

let forced: Lang | undefined;

/** For tests and non-Raycast runtimes. */
export function setLang(lang: Lang) {
  forced = lang;
}

function lang(): Lang {
  if (forced) return forced;
  try {
    // Loaded lazily so lib code also runs outside Raycast (tests), where it falls back to English.
    const { getPreferenceValues } = require("@raycast/api") as typeof import("@raycast/api");
    return getPreferenceValues<{ language?: Lang }>().language === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
}

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const template = (lang() === "ko" ? ko : en)[key];
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
