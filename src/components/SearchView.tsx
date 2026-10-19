import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { dedupeHits, queryPages, searchPages, SearchHit } from "../lib/gbrain";
import { PageDetail } from "./PageDetail";
import { t } from "../lib/i18n";

export function SearchView({ mode }: { mode: "query" | "search" }) {
  const [text, setText] = useState("");
  const fn = mode === "query" ? queryPages : searchPages;
  const { data, isLoading, error } = usePromise(
    async (q: string) => (q.trim().length < 2 ? [] : dedupeHits(await fn(q.trim(), 25))),
    [text],
    { failureToastOptions: { title: t("cmdFailed", { cmd: mode }) } },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setText}
      throttle
      isShowingDetail={!!data?.length}
      searchBarPlaceholder={mode === "query" ? t("queryPlaceholder") : t("searchPlaceholder")}
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={t("searchFailed")} description={error.message} />
      ) : text.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={mode === "query" ? "Query Brain" : "Search Brain"}
          description={t("minChars")}
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={t("noResults")} />
      )}
      {data?.map((h) => (
        <HitItem key={h.slug} hit={h} />
      ))}
    </List>
  );
}

function HitItem({ hit }: { hit: SearchHit }) {
  return (
    <List.Item
      title={hit.title || hit.slug}
      subtitle={hit.type}
      accessories={[{ text: hit.score.toFixed(2) }]}
      detail={<List.Item.Detail markdown={`### ${hit.title}\n\`${hit.slug}\`\n\n${hit.chunk_text}`} />}
      actions={
        <ActionPanel>
          <Action.Push title="Open Page" icon={Icon.Document} target={<PageDetail slug={hit.slug} />} />
          <Action.CopyToClipboard title="Copy Slug" content={hit.slug} />
          <Action.CopyToClipboard
            title="Copy Wikilink"
            content={`[[${hit.slug}]]`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          <Action.CopyToClipboard
            title="Copy Snippet"
            content={hit.chunk_text}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
