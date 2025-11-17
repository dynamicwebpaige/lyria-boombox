/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';
import { RadioAnnouncer } from './utils/RadioAnnouncer';
import { throttle } from './utils/throttle';

// FIX: Use `process.env.API_KEY` and remove `apiVersion` per coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi(initialPrompts);
  // FIX: Cast to HTMLElement to satisfy appendChild's type requirement.
  document.body.appendChild(pdjMidi as unknown as Node);

  const toastMessage = new ToastMessage();
  // FIX: Cast to HTMLElement to satisfy appendChild's type requirement.
  document.body.appendChild(toastMessage as unknown as Node);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  // Initialize Radio Announcer
  // Connect to audioAnalyser node so the speaker needles move when the DJ speaks
  const radioAnnouncer = new RadioAnnouncer(ai, liveMusicHelper.audioContext, audioAnalyser.node);
  
  // Set initial station info (Station 0)
  radioAnnouncer.onStationChange(DEFAULT_PROMPTS[0].text, '88.0');

  // Throttled handler for updating the music model to prevent socket flooding
  const updateMusicModel = throttle((prompts: Map<string, Prompt>) => {
    liveMusicHelper.setWeightedPrompts(prompts);
  }, 500);

  // FIX: Cast to unknown first to fix TS error.
  (pdjMidi as unknown as HTMLElement).addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    
    // 1. Update Music (Throttled)
    updateMusicModel(prompts);

    // 2. Update Announcer (Debounced internally)
    for (const [id, prompt] of prompts) {
      if (prompt.weight > 0) {
        // Parse index from id "prompt-N" to calculate frequency
        const parts = prompt.promptId.split('-');
        if (parts.length === 2) {
          const index = parseInt(parts[1], 10);
          if (!isNaN(index)) {
             const frequency = (88.0 + (index * 1.5)).toFixed(1);
             radioAnnouncer.onStationChange(prompt.text, frequency);
          }
        }
        break;
      }
    }
  }) as EventListener);

  // FIX: Cast to unknown first to fix TS error.
  (pdjMidi as unknown as HTMLElement).addEventListener('play-pause', (() => {
    liveMusicHelper.playPause();
  }) as EventListener);

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    
    const isPlaying = playbackState === 'playing';
    isPlaying ? audioAnalyser.start() : audioAnalyser.stop();
    
    // Update announcer state
    radioAnnouncer.setMusicPlaying(isPlaying);
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  // FIX: Cast to unknown first to fix TS error.
  (pdjMidi as unknown as HTMLElement).addEventListener('error', errorToast as EventListener);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Start on the first prompt (Station 1)
  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    
    // In Radio mode, only the first one is active initially
    const isActive = i === 0;

    prompts.set(promptId, {
      promptId,
      text,
      weight: isActive ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  { color: '#9900ff', text: 'Bossa Nova' },
  { color: '#5200ff', text: 'Chillwave' },
  { color: '#ff25f6', text: 'Drum and Bass' },
  { color: '#2af6de', text: 'Post Punk' },
  { color: '#ffdd28', text: 'Shoegaze' },
  { color: '#2af6de', text: 'Funk' },
  { color: '#9900ff', text: 'Chiptune' },
  { color: '#3dffab', text: 'Lush Strings' },
  { color: '#d8ff3e', text: 'Sparkling Arpeggios' },
  { color: '#d9b2ff', text: 'Staccato Rhythms' },
  { color: '#3dffab', text: 'Punchy Kick' },
  { color: '#ffdd28', text: 'Dubstep' },
  { color: '#ff25f6', text: 'K Pop' },
  { color: '#d8ff3e', text: 'Neo Soul' },
  { color: '#5200ff', text: 'Trip Hop' },
  { color: '#d9b2ff', text: 'Thrash' },
];

main();