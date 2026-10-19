import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { PageDetail } from "./components/PageDetail";
import { recall } from "./lib/gbrain";
import { t } from "./lib/i18n";

export default function Command() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"question" | "entity">("question");
  const { data, isLoading, error } = usePromise(
    async (q: string, m: string) => {
      if (q.trim().length < 2) return (await recall(["--limit", "30"])).facts;
      return (await recall(m === "entity" ? [q.trim(), "--limit", "50"] : ["--question", q.trim(), "--limit", "30"]))
        .facts;
    },
    [text, mode],
    { failureToastOptions: { title: t("cmdFailed", { cmd: "recall" }) } },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setText}
      throttle
      isShowingDetail={!!data?.length}
      searchBarPlaceholder={mode === "question" ? t("recallQuestionPlaceholder") : t("recallEntityPlaceholder")}
      searchBarAccessory={
        <List.Dropdown tooltip="Mode" value={mode} onChange={(v) => setMode(v as "question" | "entity")}>
          <List.Dropdown.Item title="Question" value="question" />
          <List.Dropdown.Item title="Entity" value="entity" />
        </List.Dropdown>
      }
    >
      {error && <List.EmptyView icon={Icon.Warning} title={t("recallFailed")} description={error.message} />}
      {data?.map((f) => (
        <List.Item
          key={f.id}
          title={f.fact}
          detail={
            <List.Item.Detail
              markdown={f.fact}
              metadata={
                <List.Item.Detail.Metadata>
                  {f.entity_slug && <List.Item.Detail.Metadata.Label title="Entity" text={f.entity_slug} />}
                  <List.Item.Detail.Metadata.Label title="Kind" text={f.kind} />
                  {f.valid_from && (
                    <List.Item.Detail.Metadata.Label title="Valid from" text={f.valid_from.slice(0, 10)} />
                  )}
                  {f.source && <List.Item.Detail.Metadata.Label title="Source" text={f.source} />}
                  <List.Item.Detail.Metadata.Label title="ID" text={String(f.id)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Fact" content={f.fact} />
              {f.entity_slug && (
                <Action.Push
                  title="Open Entity Page"
                  icon={Icon.Document}
                  target={<PageDetail slug={f.entity_slug} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
