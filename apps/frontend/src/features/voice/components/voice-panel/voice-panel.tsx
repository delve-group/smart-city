"use client";

import { useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import type { ComponentProps } from "react";
import { VoicePanelContent } from "../voice-panel-content/voice-panel-content";

export function VoicePanel(props: ComponentProps<typeof VoicePanelContent>) {
  const [muted, setMuted] = useState(false);
  return <ConversationProvider isMuted={muted} onMutedChange={setMuted}><VoicePanelContent {...props} /></ConversationProvider>;
}
