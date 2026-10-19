import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PageDetail } from "./components/PageDetail";
import { putPage, think, ThinkResult } from "./lib/gbrain";
import { localDate, slugify } from "./lib/slug";
import { t } from "./lib/i18n";

export default function Command(props: LaunchProps<{ arguments: { question: string } }>) {
  const question = props.arguments.question.trim();
  const { push } = useNavigation();
  const { data, isLoading, error } = usePromise(think, [question], {
    failureToastOptions: { title: t("cmdFailed", { cmd: "think" }) },
  });

  const citedSlugs = [...new Set((data?.citations ?? []).map((c) => c.page_slug))];
  const markdown = error
    ? `# ${t("thinkFailed")}\n\n\`\`\`\n${error.message}\n\`\`\``
    : data
      ? render(data)
      : `# ${question}\n\n_${t("thinking")}_`;

  async function save() {
    if (!data) return;
    const slug = `synthesis/${localDate()}-${slugify(question) || "think"}`;
    const toast = await showToast({ style: Toast.Style.Animated, title: t("saving"), message: slug });
    try {
      const body = `---\ntitle: ${JSON.stringify(question)}\ntype: synthesis\nmodel: ${JSON.stringify(data.modelUsed ?? "")}\ningested_via: "raycast-gbrain"\n---\n\n${render(data)}`;
      await putPage(slug, body, "inferred");
      toast.style = Toast.Style.Success;
      toast.title = t("saved");
      toast.primaryAction = { title: "Open Page", onAction: () => push(<PageDetail slug={slug} />) };
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = t("saveFailed");
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Think"
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={data.synthesis_status} />
            <Detail.Metadata.Label title="Pages gathered" text={String(data.pagesGathered)} />
            {data.modelUsed && <Detail.Metadata.Label title="Model" text={data.modelUsed} />}
            {citedSlugs.length > 0 && (
              <Detail.Metadata.TagList title="Cited">
                {citedSlugs.map((s) => (
                  <Detail.Metadata.TagList.Item key={s} text={s} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Answer" content={data.answer} />
            {citedSlugs.length > 0 && (
              <ActionPanel.Submenu
                title="Open Cited Page"
                icon={Icon.Document}
                shortcut={Keyboard.Shortcut.Common.Open}
              >
                {citedSlugs.map((s) => (
                  <Action.Push key={s} title={s} target={<PageDetail slug={s} />} />
                ))}
              </ActionPanel.Submenu>
            )}
            <Action
              title="Save as Synthesis Page"
              icon={Icon.SaveDocument}
              onAction={save}
              shortcut={Keyboard.Shortcut.Common.Save}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={render(data)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel>
        )
      }
    />
  );
}

function render(r: ThinkResult): string {
  const parts = [`# ${r.question}`, r.answer || `_${t("noAnswer")}_`];
  if (r.gaps?.length) parts.push("## Gaps", r.gaps.map((g) => `- ${g}`).join("\n"));
  if (r.warnings?.length) parts.push("## Warnings", r.warnings.map((w) => `- ${w}`).join("\n"));
  return parts.join("\n\n");
}
