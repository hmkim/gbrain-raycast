import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { remember } from "./lib/gbrain";
import { localDate } from "./lib/slug";
import { t } from "./lib/i18n";

interface Values {
  fact: string;
  entity: string;
  provenance: string;
}

export default function Command() {
  const [busy, setBusy] = useState(false);

  async function submit(v: Values) {
    if (!v.fact.trim()) {
      await showToast({ style: Toast.Style.Failure, title: t("enterFact") });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("saving") });
    try {
      const provenance = v.provenance.trim() || `user said via Raycast ${localDate()}`;
      const r = await remember(v.fact.trim(), v.entity.trim() || undefined, provenance);
      toast.style = Toast.Style.Success;
      toast.title = t("remembered", { status: String(r.status ?? "ok") });
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = t("saveFailed");
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
          <Action.SubmitForm title="Remember" icon={Icon.Bookmark} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="fact" title="Fact" placeholder={t("factPlaceholder")} autoFocus />
      <Form.TextField id="entity" title="Entity" placeholder={t("entityPlaceholder")} />
      <Form.TextField id="provenance" title="Provenance" placeholder={t("provenancePlaceholder")} />
    </Form>
  );
}
