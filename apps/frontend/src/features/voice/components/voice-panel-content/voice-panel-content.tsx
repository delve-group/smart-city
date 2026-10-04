"use client";

import { DeviceMicrophone, DeviceMicrophoneOff, X } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@appica/ui-react/tooltip";
import { useState } from "react";
import type { Category } from "@/api/categories/types";
import type { IntakeDraft } from "@/api/intake/types";
import type { LocationPreview } from "@/api/locations/types";
import { useI18n } from "@/shared/i18n/locale";
import type { VoiceDraftController } from "../../types";
import { useBrowserVoice } from "../../hooks/use-browser-voice";

type Props = {
  intake: VoiceDraftController;
  categories: readonly Category[];
  onLocate?: (location: LocationPreview | null) => void;
  onClose: () => void;
  onFallback: (draft: IntakeDraft | null) => void;
};

/** One big mic button at the bottom centre. Its tooltip stays open and says what to do; red means recording. */
export function VoicePanelContent({ intake, categories, onLocate, onClose, onFallback }: Props) {
  const { t } = useI18n();
  const voice = useBrowserVoice(intake, categories, onLocate);
  const [hovered, setHovered] = useState(false);
  /** Continue appears to the right once the resident has unmuted, so the first screen is just the mic. */
  const [spoke, setSpoke] = useState(false);
  const saved = intake.report ?? intake.draft?.submission;
  const connected = voice.phase === "connected";
  const waiting = voice.phase === "starting" || voice.phase === "stopping";
  const listening = connected && !voice.isMuted;

  const errorText = voice.errorCode === "microphone_denied" ? t("voice.microphoneDenied")
    : voice.errorCode === "voice_session_active" ? t("voice.sessionActive")
    : voice.errorCode === "voice_start_limit" ? t("voice.startLimit")
    : voice.errorCode === "connection_lost" ? t("voice.disconnected") : t("voice.unavailable");
  const hint = voice.errorCode ? errorText
    : saved ? t("voice.saved", { reference: saved.reference })
    : voice.phase === "starting" ? t("voice.connecting")
    : voice.phase === "stopping" ? t("voice.stopping")
    : listening ? t("voice.speakNow")
    : t("voice.unmuteToSpeak");
  const showNotice = !spoke && !connected && !waiting && !voice.errorCode && !saved;
  // Two lines while talking: the assistant's latest reply, and below it what the resident last said.
  const lastAgent = voice.messages.findLast((message) => message.role === "agent")?.text;
  const lastUser = voice.messages.findLast((message) => message.role === "user")?.text;
  const showTranscript = connected && !voice.errorCode && Boolean(lastAgent || lastUser);

  function toggleMic() {
    // Starting or unmuting both turn the mic on.
    if (connected) {
      if (voice.isMuted) setSpoke(true);
      voice.toggleMute();
    } else if (!waiting && !saved) {
      setSpoke(true);
      void voice.start();
    }
  }

  async function continueInForm() {
    await voice.stop();
    const draft = await intake.recover(false, AbortSignal.timeout(15_000));
    onFallback(draft ?? null);
  }

  return (
    <div className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2 md:bottom-6 transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none">
      {(spoke || saved) && (
        // Centred by a flex wrapper, not a transform: the button's own press effect transforms it.
        <div className="absolute inset-y-0 left-full ml-4 flex items-center transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none">
          <Button
            variant="outline"
            size="sm"
            disabled={voice.phase === "stopping"}
            onClick={() => void continueInForm()}
            className="border-border-strong/50 bg-background shadow-xs"
          >
            {t("voice.continue")}
          </Button>
        </div>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("voice.close")}
        disabled={voice.phase === "stopping"}
        onClick={() => void voice.stop().then(onClose)}
        className="absolute -top-1 -right-1 z-10 size-7 rounded-full border-border-strong/50 bg-background shadow-xs"
      >
        <X className="size-4" />
      </Button>
      <Tooltip open={!hovered} onOpenChange={() => undefined}>
        <TooltipTrigger
          render={
            <Button
              variant={listening ? "destructive" : "primary"}
              aria-label={listening ? t("voice.mute") : t("voice.unmute")}
              aria-pressed={listening}
              disabled={waiting || (Boolean(saved) && !connected)}
              onClick={toggleMic}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              className="size-20 rounded-full p-0 shadow-md"
            />
          }
        >
          {waiting ? <Spinner className="size-8" /> : listening ? <DeviceMicrophone className="size-8" /> : <DeviceMicrophoneOff className="size-8" />}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={12} className={showTranscript ? "w-[min(28rem,calc(100vw-2rem))] text-start" : "max-w-72 text-center"}>
          {showTranscript ? (
            <span role="log" aria-live="polite" className="flex flex-col gap-1.5">
              {lastAgent && <span className="line-clamp-3">{lastAgent}</span>}
              {lastUser && <span className="line-clamp-2 opacity-70">{t("voice.you")}: {lastUser}</span>}
            </span>
          ) : (
            <span role="status" aria-live="polite" className="block">{hint}</span>
          )}
          {showNotice && <span className="mt-1 block text-xs opacity-80">{t("voice.notice")}</span>}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
