# PromptDJ MIDI (Lyria Boombox) - Architecture Guide

A beginner-friendly guide to understanding this codebase.

---

## How to Generate Documentation Like This

When asking an LLM to explain a codebase, try these prompts using standard software engineering terminology:

### Quick Prompts
- "Give me a **system architecture overview** of this codebase"
- "Create an **architecture diagram** showing the main components"
- "Explain the **data flow** through the application"
- "Show me the **component hierarchy** and dependencies"
- "Document the **event-driven architecture** and message flow"

### Key Terms to Use
| Term | What It Means |
|------|---------------|
| **System Architecture** | High-level structure showing how major pieces connect |
| **Component Diagram** | Visual breakdown of modules/classes and their relationships |
| **Data Flow Diagram (DFD)** | How data moves through the system |
| **Sequence Diagram** | Step-by-step flow of a specific operation over time |
| **State Machine / State Diagram** | All possible states and transitions (like playback states) |
| **Dependency Graph** | What depends on what |
| **Call Graph** | Which functions call which other functions |
| **Event Flow** | How events propagate through event-driven systems |
| **Audio Pipeline / Signal Flow** | Specific to audio: how sound data is processed |

### Power Prompt (Comprehensive)
> "Explain this codebase for a beginner. Include:
> 1. A **system architecture diagram** showing main components
> 2. The **component hierarchy** and file structure
> 3. **Data flow diagrams** for key user interactions
> 4. Any **state machines** for stateful logic
> 5. Key **data structures** and their schemas
>
> Use ASCII diagrams where helpful."

---

## What This Project Does

**PromptDJ MIDI** is a virtual retro boombox that generates music in real-time using AI. Think of it as a radio where an AI creates the music on-the-fly based on what genre "station" you tune to.

You get a visual boombox on your screen where you can:
- **Turn a tuning knob** to switch between 16 different music genres (Bossa Nova, Chillwave, Drum & Bass, etc.)
- **Press play** and hear AI-generated music in that style
- **Watch the UI react** - speakers pulse, cassette reels spin, LCD display shows the "frequency"
- **Hear an AI DJ** announce station changes with context-aware commentary

## Technologies Used

- **TypeScript** - The programming language (like JavaScript but with type safety)
- **Lit** - Creates the UI components (the boombox, buttons, knobs)
- **Vite** - Builds and runs the development server
- **Google Gemini AI** - Powers everything: music generation, DJ scripts, voice, and background image

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     UI LAYER (Lit)                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │       PromptDjMidi (Main Boombox Component)         │  │  │
│  │  │                                                       │  │  │
│  │  │  [Tuning Knob] [LCD Display] [Play/Pause Button]   │  │  │
│  │  │  [Speakers]    [Cassette Deck] [VU Meters]         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│                          │ (Custom Events)                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           ORCHESTRATOR (index.tsx)                        │  │
│  │   - Wires up event listeners                              │  │
│  │   - Coordinates between UI and utilities                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                │                 │                   │
│           ▼                ▼                 ▼                   │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ LiveMusicHelper│  │AudioAnalyser │  │RadioAnnouncer│        │
│  │                │  │              │  │              │        │
│  │ - Connects to  │  │ - Analyzes   │  │ - Generates  │        │
│  │   Gemini AI    │  │   audio      │  │   DJ script  │        │
│  │ - Streams music│  │ - Fires      │  │ - Creates    │        │
│  │ - Buffers audio│  │   level      │  │   speech     │        │
│  │                │  │   events     │  │              │        │
│  └────────────────┘  └──────────────┘  └──────────────┘        │
│           │                                    │                  │
└───────────┼────────────────────────────────────┼─────────────────┘
            │                                    │
            ▼                                    ▼
    ┌──────────────┐                    ┌──────────────┐
    │  Web Audio   │                    │  Web Audio   │
    │    API       │                    │    API       │
    │  (playback)  │                    │    (TTS)     │
    └──────────────┘                    └──────────────┘
            │                                    │
            └────────────────┬───────────────────┘
                             ▼
                      ┌──────────────┐
                      │   SPEAKERS   │
                      └──────────────┘

            ▲                                    ▲
            │        (WebSocket/HTTP)            │
            │                                    │
    ┌───────┴────────┐                  ┌───────┴────────┐
    │  Gemini API    │                  │  Gemini API    │
    │  (Lyria Music) │                  │  (Text + TTS)  │
    └────────────────┘                  └────────────────┘

    [GOOGLE'S SERVERS]
```

---

## 2. COMPONENT HIERARCHY

```
index.html
    │
    └─── index.tsx (Main Entry Point)
            │
            ├─── UI Components
            │     │
            │     ├─── <prompt-dj-midi>        (Main Boombox UI)
            │     │        │
            │     │        └─── <play-pause-button>  (Play/Pause Control)
            │     │
            │     └─── <toast-message>         (Error Notifications)
            │
            └─── Utility Helpers
                  │
                  ├─── LiveMusicHelper          (Music Generation)
                  │
                  ├─── AudioAnalyser            (Audio Visualization)
                  │
                  ├─── RadioAnnouncer           (DJ Voice)
                  │
                  └─── MidiDispatcher           (MIDI Controller Support)
```

---

## 3. EVENT FLOW: User Rotates Tuning Knob

```
┌───────────────────────────────────────────────────────────────────┐
│  STEP 1: User rotates tuning knob on boombox                      │
└───────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │  PromptDjMidi.ts                       │
        │  - Detects mouse/touch rotation        │
        │  - Calculates new station (0-15)       │
        │  - Updates internal state               │
        │  - Fires "prompts-changed" event       │
        └────────────────────────────────────────┘
                            │
                            │ CustomEvent<Map<string, Prompt>>
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │  index.tsx (Event Listener)            │
        │  - Receives prompts map                │
        │  - Extracts active genre & frequency   │
        └────────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
                ▼                        ▼
    ┌──────────────────────┐   ┌────────────────────────┐
    │  updateMusicModel()  │   │  RadioAnnouncer        │
    │  (throttled 500ms)   │   │  .onStationChange()    │
    │                      │   │  (debounced 15s)       │
    └──────────────────────┘   └────────────────────────┘
                │                         │
                ▼                         ▼
    ┌──────────────────────┐   ┌────────────────────────┐
    │  LiveMusicHelper     │   │  1. Generate DJ script │
    │  .setWeightedPrompts │   │  2. Convert to speech  │
    │                      │   │  3. Play announcement  │
    │  Sends to Gemini AI  │   │                        │
    └──────────────────────┘   └────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │  AI streams   │
        │  new music    │
        │  for genre    │
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │  SPEAKERS!    │
        └───────────────┘
```

---

## 4. AUDIO PIPELINE ARCHITECTURE

```
                    ┌─────────────────────┐
                    │   GEMINI AI         │
                    │   (Lyria Model)     │
                    └─────────────────────┘
                              │
                              │ WebSocket Stream
                              │ (Base64 encoded PCM)
                              ▼
                  ┌───────────────────────────┐
                  │   LiveMusicHelper         │
                  │   .processAudioChunks()   │
                  │                           │
                  │   1. Decode base64        │
                  │   2. Create AudioBuffer   │
                  │   3. Create BufferSource  │
                  │   4. Schedule playback    │
                  └───────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │    Web Audio Graph (Nodes)          │
            │                                     │
            │   BufferSource → GainNode           │
            │                    │                │
            │                    ├─────────┐      │
            │                    │         │      │
            │                    ▼         ▼      │
            │          AudioContext   AudioAnalyser│
            │          .destination      .node    │
            │                │              │     │
            └────────────────┼──────────────┼─────┘
                             │              │
                             ▼              ▼
                     ┌────────────┐  ┌──────────────┐
                     │  SPEAKERS  │  │  Visual      │
                     │  (Output)  │  │  Feedback    │
                     └────────────┘  │  (VU Meter)  │
                                     └──────────────┘
```

---

## 5. DATA STRUCTURE: Prompt Map

```
Map<string, Prompt>
│
├─ "prompt-0" → { promptId: "prompt-0",
│                 text: "Bossa Nova",
│                 weight: 1.0,          ← Active (playing)
│                 cc: 0,
│                 color: "#9900ff" }
│
├─ "prompt-1" → { promptId: "prompt-1",
│                 text: "Chillwave",
│                 weight: 0,            ← Inactive
│                 cc: 1,
│                 color: "#5200ff" }
│
├─ "prompt-2" → { promptId: "prompt-2",
│                 text: "Drum and Bass",
│                 weight: 0,            ← Inactive
│                 cc: 2,
│                 color: "#ff25f6" }
│
└─ ... (13 more prompts, all with weight: 0)

NOTE: In "Radio Mode" only ONE prompt has weight=1 at a time
      This represents the currently tuned station
```

---

## 6. PLAYBACK STATE MACHINE

```
                     [User clicks Play]
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │         LOADING                       │
        │  - Connecting to AI                   │
        │  - Buffering first 2 seconds          │
        └───────────────────────────────────────┘
                            │
                            │ [Buffer filled]
                            ▼
        ┌───────────────────────────────────────┐
        │         PLAYING                       │
        │  - Music audible                      │
        │  - Speakers animated                  │
        │  - Cassette reels spinning            │
        └───────────────────────────────────────┘
                 │                  │
    [User clicks │                  │ [Connection error]
      Pause]     │                  │
                 ▼                  ▼
        ┌─────────────┐    ┌──────────────┐
        │   PAUSED    │    │   STOPPED    │
        │  - Silent   │    │  - Cleanup   │
        │  - UI idle  │    │  - Reconnect │
        └─────────────┘    └──────────────┘
                 │
    [User clicks │
      Play]      │
                 ▼
        ┌─────────────┐
        │   LOADING   │
        └─────────────┘
```

---

## 7. THE 16 RADIO STATIONS

| Station | Frequency | Genre            | Color        |
|---------|-----------|------------------|--------------|
| 0       | 88.0 FM   | Bossa Nova       | Purple       |
| 1       | 89.5 FM   | Chillwave        | Blue         |
| 2       | 91.0 FM   | Drum and Bass    | Pink         |
| 3       | 92.5 FM   | Post Punk        | Cyan         |
| 4       | 94.0 FM   | Shoegaze         | Yellow       |
| 5       | 95.5 FM   | Funk             | Cyan         |
| 6       | 97.0 FM   | Chiptune         | Purple       |
| 7       | 98.5 FM   | Lush Strings     | Green        |
| 8       | 100.0 FM  | Sparkling Arps   | Yellow-Green |
| 9       | 101.5 FM  | Staccato Rhythms | Lavender     |
| 10      | 103.0 FM  | Punchy Kick      | Green        |
| 11      | 104.5 FM  | Dubstep          | Yellow       |
| 12      | 106.0 FM  | K Pop            | Pink         |
| 13      | 107.5 FM  | Neo Soul         | Yellow-Green |
| 14      | 109.0 FM  | Trip Hop         | Blue         |
| 15      | 110.5 FM  | Thrash           | Lavender     |

**Formula:** `frequency = 88.0 + (index × 1.5)`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `index.tsx` | Main entry point, orchestrates everything |
| `components/PromptDjMidi.ts` | Main boombox UI (600+ lines) |
| `components/PlayPauseButton.ts` | Play/pause button component |
| `utils/LiveMusicHelper.ts` | Connects to Gemini AI, streams music |
| `utils/RadioAnnouncer.ts` | Generates and plays DJ announcements |
| `utils/AudioAnalyser.ts` | Analyzes audio for visual feedback |
| `utils/MidiDispatcher.ts` | Optional MIDI controller support |
| `types.ts` | TypeScript type definitions |
