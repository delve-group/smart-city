"use client";

import { Button } from "@appica/ui-react/button";
import { Alert, AlertDescription } from "@appica/ui-react/alert";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { X } from "@appica/icons-react";
import type { Category } from "@/api/categories/types";
import type { IntakeDraft } from "@/api/intake/types";
import { FloatingPanel } from "@/shared/components/floating-panel/floating-panel";
import { useI18n } from "@/shared/i18n/locale";
import type { VoiceDraftController } from "../../types";
import { useBrowserVoice } from "../../hooks/use-browser-voice";

type Props = { intake: VoiceDraftController; categories: readonly Category[]; onClose: () => void; onFallback: (draft: IntakeDraft | null) => void };

export function VoicePanelContent({ intake, categories, onClose, onFallback }: Props) {
  const { t } = useI18n();
  const voice = useBrowserVoice(intake, categories);
  const saved = intake.report ?? intake.draft?.submission;
  const active = voice.phase === "connected";
  const waiting = voice.phase === "starting" || voice.phase === "stopping";
  const errorText = voice.errorCode === "microphone_denied" ? t("voice.microphoneDenied")
    : voice.errorCode === "voice_session_active" ? t("voice.sessionActive")
    : voice.errorCode === "voice_start_limit" ? t("voice.startLimit")
    : voice.errorCode === "connection_lost" ? t("voice.disconnected") : t("voice.unavailable");

  async function fallback() {
    await voice.stop();
    const draft = await intake.recover(false, AbortSignal.timeout(15_000));
    onFallback(draft ?? null);
  }

  return <FloatingPanel labelledBy="voice-panel-title" header={
    <div className="flex items-center justify-between gap-3">
      <h2 id="voice-panel-title" className="text-lg font-semibold text-foreground-intense">{t("voice.title")}</h2>
      <Button variant="ghost" size="icon-md" aria-label={t("report.closeAria")} disabled={voice.phase === "stopping"} onClick={() => void voice.stop().then(onClose)}><X /></Button>
    </div>
  }>
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-5 px-5 py-5">
        <p className="text-sm text-foreground-muted">{t("voice.introduction")}</p>
        <p role="status" className="text-sm font-medium text-foreground-intense">
          {voice.phase === "starting" ? t("voice.connecting") : voice.phase === "stopping" ? t("voice.stopping")
            : active ? voice.isMuted ? t("voice.muted") : voice.isSpeaking ? t("voice.speaking") : t("voice.listening")
              : t("voice.ready")}
        </p>
        {saved && <Alert variant="success"><AlertDescription>{t("voice.saved", { reference: saved.reference })}</AlertDescription></Alert>}
        {voice.errorCode && <Alert variant="warning"><AlertDescription>{errorText}</AlertDescription></Alert>}
        {intake.draft && <section aria-labelledby="voice-summary-title" className="flex flex-col gap-2">
          <h3 id="voice-summary-title" className="text-sm font-semibold text-foreground-intense">{t("voice.summary")}</h3>
          <p className="text-sm text-foreground">{intake.draft.readback_summary}</p>
          <p className="text-xs text-foreground-muted">{t("voice.editHint")}</p>
        </section>}
        {voice.messages.length > 0 && <section aria-labelledby="voice-transcript-title" className="flex flex-col gap-3">
          <h3 id="voice-transcript-title" className="text-sm font-semibold text-foreground-intense">{t("voice.transcript")}</h3>
          {voice.messages.map((message, index) => <p key={index} className="text-sm break-words text-foreground">
            <span className="font-medium text-foreground-intense">{message.role === "user" ? t("voice.you") : "mRadar"}: </span>{message.text}
          </p>)}
        </section>}
      </div>
    </ScrollArea>
    <footer className="flex flex-col gap-2 border-t border-border-muted px-5 py-4">
      <div className="flex gap-2">
        {active ? <>
          <Button variant="outline" className="flex-1" size="lg" onClick={voice.toggleMute}>{voice.isMuted ? t("voice.unmute") : t("voice.mute")}</Button>
          <Button className="flex-1" size="lg" onClick={() => void voice.stop()}>{t("voice.end")}</Button>
        </> : !saved && <Button className="flex-1" size="lg" disabled={waiting} onClick={() => void voice.start()}>{waiting ? t("report.working") : t("voice.start")}</Button>}
      </div>
      <Button variant="outline" size="lg" disabled={voice.phase === "stopping"} onClick={() => void fallback()}>{saved ? t("voice.viewSaved") : t("voice.useForm")}</Button>
    </footer>
  </FloatingPanel>;
}
