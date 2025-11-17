
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from './audio';

export class RadioAnnouncer {
  private ai: GoogleGenAI;
  private audioContext: AudioContext;
  private destination: AudioNode; // Visualizer node
  private timer: number | null = null;
  private debounceTimer: number | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  
  private isPlayingMusic = false;
  private currentStationName: string | null = null;
  private currentFrequency: string | null = null;

  // Track the unique 'session' of a station tune-in
  private stationId = 0;
  private pendingBufferPromise: Promise<AudioBuffer | null> | null = null;

  constructor(ai: GoogleGenAI, audioContext: AudioContext, destination: AudioNode) {
    this.ai = ai;
    this.audioContext = audioContext;
    this.destination = destination;
  }

  /**
   * Update the announcer with the current music state.
   */
  setMusicPlaying(playing: boolean) {
    this.isPlayingMusic = playing;
    if (playing) {
      // If we have a station and audio ready/pending, restart the timer
      if (this.currentStationName) {
        this.startTimer();
      }
    } else {
      this.stopTimer();
    }
  }

  /**
   * Called when the user tunes the radio.
   */
  onStationChange(stationName: string, frequency: string) {
    if (this.currentStationName === stationName) return;

    this.currentStationName = stationName;
    this.currentFrequency = frequency;
    
    // Increment ID to invalidate any previous pending generations or plays
    this.stationId++;
    
    // Reset pending buffer so we don't play old stuff
    this.pendingBufferPromise = null;

    // Stop any existing countdown or debouncer
    this.stopTimer();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Start the 15s timer immediately if music is playing
    // This ensures the 15s counts from the moment of tuning
    if (this.isPlayingMusic) {
      this.startTimer();
    }

    // Wait for the user to stop scrolling (debounce) before generating
    this.debounceTimer = window.setTimeout(() => {
       this.pendingBufferPromise = this.generateAnnouncement(this.stationId, stationName, frequency);
    }, 800);
  }

  private stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private startTimer() {
    this.stopTimer();
    
    if (this.isPlayingMusic && this.currentStationName) {
      const myId = this.stationId;
      // Wait 15 seconds before attempting to play
      this.timer = window.setTimeout(async () => {
        await this.playPendingAnnouncement(myId);
      }, 15000);
    }
  }

  private async generateAnnouncement(id: number, station: string, freq: string): Promise<AudioBuffer | null> {
    try {
      // 1. Generate the DJ Script
      const scriptResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a charismatic radio DJ. Write a single, short, punchy sentence to introduce the current song.
        The station frequency is ${freq} FM.
        The music genre is ${station}.
        Do not use quotes. Just the spoken text.
        Example: "You're locked in to 104.5, keeping it smooth with Bossa Nova."`,
      });
      
      // If station changed while generating script, abort
      if (this.stationId !== id) return null;

      const script = scriptResponse.text?.trim();
      if (!script) return null;

      // 2. Generate Audio from Script
      const ttsResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
          parts: [{ text: script }]
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' }
            }
          }
        }
      });

      // If station changed while generating audio, abort
      if (this.stationId !== id) return null;

      const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) return null;

      // 3. Decode Audio
      const audioBuffer = await decodeAudioData(
        decode(audioData),
        this.audioContext,
        24000, // TTS model output is 24k
        1
      );
      
      return audioBuffer;

    } catch (e) {
      console.error("Radio Announcer Gen Error:", e);
      return null;
    }
  }

  private async playPendingAnnouncement(id: number) {
    // Ensure we are still on the same station ID and playing music
    if (this.stationId !== id || !this.isPlayingMusic) return;
    
    // If generation is still happening, this promise will resolve when done.
    if (!this.pendingBufferPromise) return;

    try {
      const buffer = await this.pendingBufferPromise;
      
      // Check again after await
      if (this.stationId !== id || !this.isPlayingMusic || !buffer) return;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.1; 

      // CRITICAL: Connect to speakers so we can hear it
      gainNode.connect(this.audioContext.destination);
      
      // CRITICAL: Connect to visualizer so the needles move
      gainNode.connect(this.destination);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start();
      this.currentSource = source;

      source.onended = () => {
        if (this.currentSource === source) {
            this.currentSource = null;
        }
        // Cleanup connections
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (e) {
        console.error("Error playing announcement", e);
    }
  }
}
