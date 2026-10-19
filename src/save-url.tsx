import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { PageDetail } from "./components/PageDetail";
import { addTag, prefs, putPage } from "./lib/gbrain";
import { extractFromFile, extractFromUrl, Extracted, suggestSlug, toPageMarkdown } from "./lib/ingest";
import { t } from "./lib/i18n";

export default function Command() {
  const { push } = useNavigation();
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Clipboard.readText().then((t) => {
      if (t && /^https?:\/\/\S+$/.test(t.trim())) setUrl((cur) => cur || t.trim());
    });
  }, []);

  async function submit() {
    const target = files[0] ?? url.trim();
    if (!target) {
      await showToast({ style: Toast.Style.Failure, title: t("enterUrlOrFile") });
      return;
    }
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: files[0] ? t("parsingFile") : t("fetching"),
      message: target,
    });
    try {
      const e = files[0] ? await extractFromFile(files[0]) : await extractFromUrl(target);
      toast.style = Toast.Style.Success;
      toast.title = t("extracted", { kind: e.kind.toUpperCase() });
      toast.message = t("extractStats", {
        chars: e.markdown.length.toLocaleString(),
        pages: e.pages ? t("pagesSuffix", { pages: e.pages }) : "",
      });
      push(<ReviewForm extracted={e} />);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = t("fetchFailedNotSaved");
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Fetch & Review" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder={t("urlPlaceholder")} value={url} onChange={setUrl} />
      <Form.FilePicker
        id="file"
        title={t("orLocalFile")}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
        info={t("fileInfo")}
      />
      <Form.Description text={t("saveUrlNote")} />
    </Form>
  );
}

function ReviewForm({ extracted }: { extracted: Extracted }) {
  const { push } = useNavigation();
  const p = prefs();
  const [title, setTitle] = useState(extracted.title);
  const [slug, setSlug] = useState(
    suggestSlug(extracted, extracted.kind === "pdf" ? p.pdfSlugPrefix : p.urlSlugPrefix),
  );
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const final = { ...extracted, title: title.trim() || extracted.title };
  const slugError = /^[a-z0-9][a-z0-9/_.-]*[a-z0-9]$/.test(slug) && !slug.includes("//") ? undefined : t("slugInvalid");

  async function save() {
    if (slugError) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("savingToBrain"), message: slug });
    try {
      await putPage(slug, toPageMarkdown(final), "tool_output");
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const tagErrors: string[] = [];
      for (const t of tagList) {
        try {
          await addTag(slug, t);
        } catch (e) {
          tagErrors.push(`${t}: ${e instanceof Error ? e.message : e}`);
        }
      }
      if (tagErrors.length) {
        toast.style = Toast.Style.Failure;
        toast.title = t("tagsFailed");
        toast.message = tagErrors.join("; ");
      } else {
        toast.style = Toast.Style.Success;
        toast.title = t("saved");
      }
      push(<PageDetail slug={slug} />);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = t("saveFailed");
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  }

  const stats = [
    extracted.kind.toUpperCase(),
    extracted.pages ? t("pagesLabel", { pages: extracted.pages }) : undefined,
    t("charsLabel", { chars: extracted.markdown.length.toLocaleString() }),
    extracted.siteName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Form
      isLoading={busy}
      navigationTitle="Review & Save"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Brain" icon={Icon.SaveDocument} onSubmit={save} />
          <Action.Push
            title="Preview Markdown"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            target={<Detail markdown={toPageMarkdown(final).replace(/^---[\s\S]*?---\n/, "")} />}
          />
          <Action.CopyToClipboard title="Copy Markdown" content={toPageMarkdown(final)} />
        </ActionPanel>
      }
    >
      <Form.Description title="Source" text={extracted.sourceUrl ?? extracted.sourceFile ?? ""} />
      <Form.Description title="Extracted" text={stats} />
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextField id="slug" title="Slug" value={slug} onChange={setSlug} error={slugError} info={t("slugInfo")} />
      <Form.TextField id="tags" title="Tags" placeholder="comma, separated" value={tags} onChange={setTags} />
      <Form.Separator />
      <Form.Description title="Preview" text={extracted.markdown.slice(0, 800).replace(/<!-- page \d+ -->\n?/g, "")} />
    </Form>
  );
}
