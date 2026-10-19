import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { capture } from "./lib/gbrain";
import { t } from "./lib/i18n";

export default function Command() {
  const [busy, setBusy] = useState(false);

  async function submit(v: { content: string }) {
    if (!v.content.trim()) {
      await showToast({ style: Toast.Style.Failure, title: t("enterContent") });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("capturing") });
    try {
      const r = await capture(v.content);
      toast.style = Toast.Style.Success;
      toast.title = t("captured");
      toast.message = String(r.slug ?? "");
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = t("captureFailed");
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Note" placeholder={t("capturePlaceholder")} enableMarkdown autoFocus />
    </Form>
  );
}
