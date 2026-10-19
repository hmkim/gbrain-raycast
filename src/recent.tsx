import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { PageDetail } from "./components/PageDetail";
import { listPages } from "./lib/gbrain";
import { t } from "./lib/i18n";

const TYPES = ["note", "synthesis", "person", "company", "project", "meeting", "concept"];

export default function Command() {
  const [type, setType] = useState("");
  const { data, isLoading, error, revalidate } = usePromise((t: string) => listPages(100, t || undefined), [type], {
    failureToastOptions: { title: t("cmdFailed", { cmd: "list" }) },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("recentPlaceholder")}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" value={type} onChange={setType}>
          <List.Dropdown.Item title="All types" value="" />
          {TYPES.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {error && <List.EmptyView icon={Icon.Warning} title={t("listFailed")} description={error.message} />}
      {data?.map((p) => (
        <List.Item
          key={p.slug}
          title={p.title || p.slug}
          subtitle={p.slug}
          keywords={[p.slug, p.type]}
          accessories={[{ tag: p.type }, { date: new Date(p.updated_at), tooltip: p.updated_at }]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Page" icon={Icon.Document} target={<PageDetail slug={p.slug} />} />
              <Action.CopyToClipboard title="Copy Slug" content={p.slug} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
