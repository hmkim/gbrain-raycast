import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { clearShellEnvCache, engineStatus, gbrainEnv, prefs, whoami } from "./lib/gbrain";
import { t } from "./lib/i18n";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const env = gbrainEnv();
    const [who, engine] = await Promise.allSettled([whoami(), engineStatus()]);
    return { env, who, engine };
  });

  const p = prefs();
  let md = `# ${t("statusTitle")}\n\n`;
  if (data) {
    md += `| | |\n|---|---|\n| GBRAIN_HOME | \`${data.env.GBRAIN_HOME ?? t("noGbrainHome")}\` ${p.gbrainHome ? "(preference)" : "(login shell)"} |\n| gbrain binary | \`${p.gbrainPath}\` |\n\n`;
    if (data.who.status === "fulfilled") {
      const w = data.who.value;
      md += `## ✅ ${t("connected")}\n\n- client: **${w.client_name ?? "-"}** (${w.transport})\n- scopes: ${w.scopes?.join(", ")}\n- source: ${w.source_id ?? "-"}\n`;
    } else {
      md += `## ❌ ${t("connectFailed")}\n\n\`\`\`\n${data.who.reason instanceof Error ? data.who.reason.message : data.who.reason}\n\`\`\`\n\n`;
      md += t("statusHint") + "\n";
    }
    if (data.engine.status === "fulfilled")
      md += `\n## Engine\n\n\`\`\`json\n${JSON.stringify(data.engine.value, null, 2)}\n\`\`\`\n`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Reload Shell Environment"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              clearShellEnvCache();
              revalidate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
