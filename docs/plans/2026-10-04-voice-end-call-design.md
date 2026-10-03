# Resident-requested voice ending

The resident's explicit request to stop must close the voice conversation and release the microphone. This applies after a saved report and while a draft is unfinished. Saving alone does not imply a request to stop. Ending must preserve the same draft and any committed report reference.

Use ElevenLabs' native system `end_call`, with a short Polish farewell and clear prompt instructions. Compared with a new browser client tool, the native tool supplies the provider's conversation-ending semantics and the installed SDK's WebRTC cleanup. Compared with transcript keyword matching, the agent can distinguish the resident's intention from a thank-you mid-report or a quoted farewell inside an observation. Neither an extra application operation nor a transcript parser is needed.

V4 explicitly configures the built-in tool and subscribes to `agent_tool_response`, keeping the five existing session-bound application tools. Runtime configuration verification requires the reviewed built-in definition and event set. Explicit setup upgrades only an exact, pinned reviewed predecessor and saves a new immutable version; deployed pins require a separate release.

On the SDK's end-call disconnect, clear the browser conversation reference and use normal ending state. Reconcile pending tools and release the same owned session before making another start available. Unexpected transport failures retain the existing recovery message. Unfinished drafts use the existing form fallback; ending never confirms or submits them.

Verification follows repository rules: lint, typecheck, build and bounded manual provider/browser checks. Do not add automated tests. Configuration readback and a simulated conversation do not prove real microphone cleanup or complete spoken-report acceptance; record actual evidence in the voice session guide.
