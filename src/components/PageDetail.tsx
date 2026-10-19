import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getPage } from "../lib/gbrain";
import { t } from "../lib/i18n";

export function PageDetail({ slug }: { slug: string }) {
  const { data: page, isLoading, error } = usePromise(getPage, [slug]);

  const markdown = error
    ? `# ${t("pageLoadFailed")}\n\n\`${slug}\`\n\n\`\`\`\n${error.message}\n\`\`\``
    : (page?.compiled_truth ?? "");
  const sourceUrl = (page?.frontmatter?.source_url as string | undefined) ?? page?.source_uri ?? undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={page?.title ?? slug}
      markdown={markdown}
      metadata={
        page && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Slug" text={page.slug} />
            <Detail.Metadata.Label title="Type" text={page.type} />
            {page.effective_date && <Detail.Metadata.Label title="Date" text={page.effective_date.slice(0, 10)} />}
            <Detail.Metadata.Label title="Updated" text={new Date(page.updated_at).toLocaleString()} />
            {page.trust_tier && <Detail.Metadata.Label title="Trust" text={page.trust_tier} />}
            {page.tags?.length > 0 && (
              <Detail.Metadata.TagList title="Tags">
                {page.tags.map((t) => (
                  <Detail.Metadata.TagList.Item key={t} text={t} />
                ))}
              </Detail.Metadata.TagList>
            )}
            {sourceUrl && <Detail.Metadata.Link title="Source" target={sourceUrl} text={new URL(sourceUrl).host} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={page?.compiled_truth ?? ""} />
          <Action.CopyToClipboard title="Copy Slug" content={slug} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard
            title="Copy Wikilink"
            content={`[[${slug}]]`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          {sourceUrl && <Action.OpenInBrowser title="Open Source" url={sourceUrl} icon={Icon.Globe} />}
        </ActionPanel>
      }
    />
  );
}
