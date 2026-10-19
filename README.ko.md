# gbrain for Raycast

[English](README.md)

개인 지식 저장소 [gbrain](https://github.com/garrytan/gbrain)을 위한 Raycast 확장입니다.
로컬 `gbrain` CLI를 호출하므로 로컬 brain과 원격 brain에 연결된 thin client 모두에서 동작합니다.
Raycast AI와 MCP를 쓰지 않으므로 **Raycast Pro가 필요 없습니다**.

## 명령

| 명령 | 기능 | 사용하는 gbrain 명령 |
|---|---|---|
| **Query Brain** | 하이브리드(의미 + 키워드) 검색, 스니펫 미리보기, ↵로 전체 페이지 | `query --json`, `get --json` |
| **Search Brain** | 빠른 키워드 검색 | `search --json` |
| **Think** | 인용 기반 다단계 종합. ⌘S로 `synthesis/<날짜>-<slug>` 저장, ⌘O로 인용 페이지 열기 | `think --json`, `put` |
| **Save URL to Brain** | 웹 페이지/PDF(또는 로컬 파일) 가져오기 → 텍스트 추출 → 제목/slug/태그 확인 → 저장 | `put --content-origin tool_output`, `tag` |
| **Capture Note** | `inbox/`에 빠른 메모 | `capture --stdin --json` |
| **Remember Fact** | 엔티티에 대한 사실 저장(출처 포함) | `remember --json` |
| **Recall Facts** | 질문 또는 엔티티로 사실 찾기 | `recall --json` |
| **Recent Pages** | 최근 수정된 페이지, 타입 필터 | `list --json` |
| **Brain Status** | 연결된 brain/클라이언트 확인, 설정 진단 | `whoami --json`, `engine status --json` |

## Save URL to Brain

- **HTML**: Readability로 본문을 추출한 뒤 Markdown으로 변환합니다. 상대 링크는 절대 링크로 바꿉니다.
- **PDF**: 페이지별로 텍스트를 추출합니다(unpdf/pdf.js). 제목은 PDF 메타데이터에서 가져오고, 없으면 첫 페이지에서 추정합니다(저장 전 수정 가능).
- **로컬 파일**: PDF, HTML, Markdown, 텍스트를 지원합니다.
- 저장된 페이지에는 YAML frontmatter(`title`, `source_url`, `content_type`, `pages`, `fetched_at` 등)가 붙습니다. `content_origin: tool_output`으로 저장되므로 gbrain은 이를 신뢰되지 않은 외부 콘텐츠로 취급합니다.

**다음 경우에는 에러를 내고 아무것도 저장하지 않습니다.**

- 잘못된 URL이거나 http(s)가 아닌 경우
- 네트워크/DNS 오류 또는 45초 타임아웃
- 서버 응답이 2xx가 아닌 경우
- 본문이 비어 있거나 50MB를 넘는 경우
- 바이너리/미지원 형식인 경우
- PDF라고 했지만 실제 PDF가 아닌 경우(로그인 페이지 등)
- 텍스트가 없는 PDF(스캔본은 OCR 필요)
- HTML 본문이 200자 미만인 경우(JS 렌더링 페이지나 로그인 필요 페이지)

**덮어쓰지 않습니다.** slug가 이미 있으면(soft-delete된 페이지 포함) 저장을 거부합니다.

## 요구사항

- macOS + [Raycast](https://raycast.com)
- [gbrain](https://github.com/garrytan/gbrain) 설치 및 설정 완료(터미널에서 `gbrain whoami`가 동작해야 함)
- [Bun](https://bun.sh)(gbrain 실행에 필요), 개발 시 Node.js 22 이상

## 설치 (소스)

```bash
git clone https://github.com/hmkim/gbrain-raycast.git && cd gbrain-raycast
npm install
npm run dev      # Raycast에 확장을 등록합니다. 끝나면 Ctrl+C로 종료하세요.
```

`npm run dev`를 종료해도 확장은 Raycast에 남아 있습니다.

## 설정

Raycast는 셸 프로필(`~/.zshrc`)을 **읽지 않습니다.** 그래서 확장이 로그인 셸에서 `PATH`와 `GBRAIN_*` 변수(예: `GBRAIN_HOME`)를
한 번 읽어 캐시합니다. 그 외 변수는 전달하지 않습니다. `~/.zshrc`를 수정했다면 **Brain Status → Reload Shell Environment**를 실행하세요.

| Preference | 기본값 | 비고 |
|---|---|---|
| Language | English | English / 한국어 |
| GBRAIN_HOME | *(로그인 셸 값)* | 직접 지정하면 셸 값보다 우선합니다 |
| gbrain binary | `~/.bun/bin/gbrain` | |
| Extra PATH | `~/.bun/bin:/opt/homebrew/bin:/usr/local/bin` | PATH 앞에 추가됩니다. gbrain 실행에 `bun`이 필요합니다 |
| Saved URL slug prefix | `web` | |
| Saved PDF slug prefix | `papers` | |

## 문제 해결

- **"No brain configured. Run: gbrain init"**: 확장이 `GBRAIN_HOME`을 찾지 못한 경우입니다. **Brain Status**를 열어 GBRAIN_HOME이 비어 있으면 *Reload Shell Environment*를 실행하거나 Preference에서 직접 지정하세요. 새 brain을 만들 생각이 아니라면 `gbrain init`은 실행하지 마세요.
- **`requires_local_engine`**: 일부 gbrain 명령(`brainstorm`, `call` 등)은 brain 호스트에서만 동작합니다. 이 확장은 thin client에서 동작하는 명령만 사용합니다.
- **`insufficient_scope`**: gbrain 클라이언트 권한이 부족한 경우입니다(예: 저장에는 `write` 필요). brain 운영자에게 권한(scope) 조정을 요청하세요.

## 개발

```bash
npm run dev        # Raycast 라이브 리로드
npm test           # fetch/추출/실패 경로 오프라인 테스트 (로컬 HTTP 서버, 생성 PDF)
npm run lint
npm run typecheck
npm run build
```

## 라이선스

MIT
