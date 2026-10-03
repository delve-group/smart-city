"use client";

import { DeviceMicrophone, DeviceMicrophoneOff, X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import type { Category } from "@/api/categories/types";
import type { IntakeDraft } from "@/api/intake/types";
import { useI18n } from "@/shared/i18n/locale";
import type { VoiceDraftController } from "../../types";
import { useBrowserVoice } from "../../hooks/use-browser-voice";

type Props = { intake: VoiceDraftController; categories: readonly Category[]; onLocate?: (location: { lat: number; lng: number }) => void; onClose: () => void; onFallback: (draft: IntakeDraft | null) => void };

/** Siri-like voice card: one mic button, the app's latest line and the resident's latest line. */
export function VoicePanelContent({ intake, categories, onLocate, onClose, onFallback }: Props) {
  const { t } = useI18n();
  const voice = useBrowserVoice(intake, categories, onLocate);
  const saved = intake.report ?? intake.draft?.submission;
  const connected = voice.phase === "connected";
  const waiting = voice.phase === "starting" || voice.phase === "stopping";
  const listening = connected && !voice.isMuted;
  const lastAgent = voice.messages.findLast((message) => message.role === "agent")?.text;
  const lastUser = voice.messages.findLast((message) => message.role === "user")?.text;
  const errorText = voice.errorCode === "microphone_denied" ? t("voice.microphoneDenied")
    : voice.errorCode === "voice_session_active" ? t("voice.sessionActive")
    : voice.errorCode === "voice_start_limit" ? t("voice.startLimit")
    : voice.errorCode === "connection_lost" ? t("voice.disconnected") : t("voice.unavailable");

  // The app's line: an error or saved report first, then what it last said, then what to do next.
  const appLine = voice.errorCode ? errorText
    : saved ? t("voice.saved", { reference: saved.reference })
    : voice.phase === "starting" ? t("voice.connecting")
    : voice.phase === "stopping" ? t("voice.stopping")
    : connected && lastAgent ? lastAgent
    : listening ? t("voice.speakNow")
    : t("voice.unmuteToSpeak");

  function toggleMic() {
    if (connected) voice.toggleMute();
    else if (!waiting && !saved) void voice.start();
  }

  async function continueInForm() {
    await voice.stop();
    const draft = await intake.recover(false, AbortSignal.timeout(15_000));
    onFallback(draft ?? null);
  }

  return (
    <section
      aria-label={t("voice.title")}
      className="absolute right-[4.25rem] bottom-3 left-3 z-30 flex items-center gap-3 rounded-2xl border border-border bg-background p-3 shadow-lg transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none md:left-auto md:w-[26rem]"
    >
      <Button
        variant={listening ? "primary" : "outline"}
        aria-label={listening ? t("voice.mute") : t("voice.unmute")}
        aria-pressed={listening}
        aria-describedby="voice-privacy"
        disabled={waiting || (Boolean(saved) && !connected)}
        onClick={toggleMic}
        className="size-14 shrink-0 rounded-full p-0"
      >
        {waiting ? <Spinner className="size-6" /> : listening ? <DeviceMicrophone className="size-6" /> : <DeviceMicrophoneOff className="size-6" />}
      </Button>

      <div role="status" aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p title={appLine} className={`${lastUser ? "truncate" : "line-clamp-2"} text-sm font-medium ${voice.errorCode ? "text-warning-emphasis" : "text-foreground-intense"}`}>{appLine}</p>
        {lastUser && <p title={lastUser} className="truncate text-sm text-foreground-muted">{lastUser}</p>}
      </div>
      <p id="voice-privacy" className="sr-only">{t("voice.introduction")}</p>

      <Button variant="ghost" size="sm" className="shrink-0" disabled={voice.phase === "stopping"} onClick={() => void continueInForm()}>
        {t("voice.continue")}
      </Button>

      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("report.closeAria")}
        disabled={voice.phase === "stopping"}
        onClick={() => void voice.stop().then(onClose)}
        className="absolute -top-2.5 -right-2.5 size-6 rounded-full bg-background shadow-sm"
      >
        <X className="size-3.5" />
      </Button>
    </section>
  );
}
