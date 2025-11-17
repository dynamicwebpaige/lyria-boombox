/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { GoogleGenAI, Modality } from '@google/genai';

import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';

/** A retro boombox radio interface. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  // FIX: Removed override keyword to fix TS error.
  static styles = css`
    :host {
      height: 100%;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: radial-gradient(circle, #ffc0d5, #ff9ebc);
      user-select: none;
      touch-action: none;
      font-family: 'Helvetica', 'Arial', sans-serif;
      overflow: hidden;
      background-size: cover;
      background-position: center;
      transition: background-image 1s ease-in-out;
    }

    /* --- Main Chassis --- */
    .boombox {
      position: relative;
      display: flex;
      flex-direction: row;
      background: #222;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 
        0 30px 60px rgba(0,0,0,0.8),
        inset 0 2px 3px rgba(255,255,255,0.1);
      border: 4px solid #000;
      gap: 15px;
      width: 90vw;
      max-width: 900px;
      aspect-ratio: 2.8 / 1;
      box-sizing: border-box;
    }
    
    @media (max-width: 600px) {
      .boombox {
        flex-direction: column;
        height: auto;
        aspect-ratio: auto;
        padding: 10px;
        gap: 10px;
      }
      .handle { display: none; }
    }

    /* --- Handle --- */
    .handle {
      position: absolute;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 50px;
      border-radius: 10px 10px 0 0;
      background: linear-gradient(180deg, #ccc 0%, #666 100%);
      z-index: -1;
      box-shadow: 0 5px 10px rgba(0,0,0,0.5);
    }
    .handle::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 15px;
      right: 15px;
      top: 15px;
      background: #111;
      border-radius: 5px 5px 0 0;
      box-shadow: inset 0 5px 10px rgba(0,0,0,0.8);
    }

    /* --- Speakers --- */
    .speaker-housing {
      flex: 1;
      background: #181818;
      border-radius: 4px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #333;
      box-shadow: inset 0 0 20px #000;
      min-height: 150px;
    }
    
    .speaker-ring {
      width: 85%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(140% 140% at 0% 0%, #555 0%, #222 80%);
      border: 4px solid #111;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        2px 2px 5px rgba(255,255,255,0.05),
        -2px -2px 5px rgba(0,0,0,0.5);
    }

    .speaker-cone {
      width: 90%;
      height: 90%;
      border-radius: 50%;
      background: #111;
      background-image: 
        radial-gradient(#000 30%, transparent 31%),
        radial-gradient(circle, #222 1px, transparent 1.5px);
      background-size: 100% 100%, 4px 4px;
      position: relative;
      box-shadow: inset 0 0 15px #000;
      transition: transform 0.05s cubic-bezier(0.1, 0.7, 1.0, 0.1);
    }
    
    .dust-cap {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 30%; height: 30%;
      background: radial-gradient(circle at 30% 30%, #444, #111);
      border-radius: 50%;
      box-shadow: 0 5px 10px rgba(0,0,0,0.8);
    }

    /* --- Center Console --- */
    .center-console {
      flex: 1.4;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 5px;
      background: #2a2a2a;
      border-radius: 2px;
      border: 1px solid #444;
    }

    /* --- Top: Display --- */
    .display-panel {
      background: #000;
      height: 70px;
      border: 4px solid #555;
      border-radius: 4px;
      border-bottom-color: #777;
      border-right-color: #777;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    
    .lcd-screen {
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .station-freq {
      color: #33ff33;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      opacity: 0.8;
      letter-spacing: 2px;
    }

    .station-name {
      color: #33ff33;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 0 0 8px rgba(51, 255, 51, 0.6);
      text-transform: uppercase;
      white-space: nowrap;
    }

    .station-name.no-signal {
      color: #ff3333;
      text-shadow: 0 0 8px rgba(255, 51, 51, 0.6);
    }

    /* --- Middle: Cassette --- */
    .cassette-deck {
      flex: 1;
      background: #1a1a1a;
      border-top: 1px solid #000;
      border-bottom: 1px solid #444;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
    }
    
    .tape-window {
      width: 70%;
      height: 60px;
      background: #2e2e2e;
      border-radius: 6px;
      border: 2px solid #111;
      box-shadow: inset 0 2px 5px #000;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      position: relative;
      overflow: hidden;
    }
    
    /* Tape Spools */
    .spool {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid #eee;
      background: #fff;
      position: relative;
      box-shadow: 0 0 2px #000;
    }
    .spool::after {
      content: '';
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 10px; height: 10px;
      background: #111;
      border-radius: 50%;
    }
    .spool-teeth {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: 
        linear-gradient(0deg, transparent 45%, #111 45%, #111 55%, transparent 55%),
        linear-gradient(90deg, transparent 45%, #111 45%, #111 55%, transparent 55%);
      border-radius: 50%;
    }
    .spool.spinning .spool-teeth {
      animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .tape-connector {
      position: absolute;
      bottom: 10px;
      left: 20%;
      right: 20%;
      height: 10px;
      background: #111;
      z-index: 0;
    }

    /* --- Bottom: Controls --- */
    .controls-panel {
      height: 90px;
      background: #333;
      border: 1px solid #444;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15px;
      position: relative;
    }
    
    /* Fake piano keys decoration */
    .piano-keys {
        display: flex;
        gap: 2px;
        height: 20px;
        position: absolute;
        top: -20px;
        left: 15px;
    }
    .key {
        width: 15px; height: 20px;
        background: #111;
        border-radius: 2px 2px 0 0;
        border: 1px solid #444;
        border-bottom: none;
    }

    .play-btn-container {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #222;
      border-radius: 50%;
      box-shadow: 
        inset 0 5px 10px rgba(0,0,0,0.5),
        0 1px 0 rgba(255,255,255,0.1);
      border: 1px solid #111;
    }
    
    play-pause-button {
      width: 50px;
      height: 50px;
    }

    /* Tuning Knob Container */
    .tuning-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }
    
    .knob-label {
      color: #ccc;
      font-size: 10px;
      letter-spacing: 1px;
      font-weight: bold;
    }

    .knob-wrapper {
        width: 70px;
        height: 70px;
        position: relative;
    }

    .tuning-knob {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      cursor: grab;
      position: relative;
      box-shadow: 0 5px 10px rgba(0,0,0,0.5);
    }
    .tuning-knob:active {
      cursor: grabbing;
    }
  `;

  private prompts: Map<string, Prompt>;
  private promptKeys: string[];

  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @state() public audioLevel = 0;
  @state() private activeIndex = 0;
  @state() private rotation = 0; // 0-360 degrees

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor(initialPrompts: Map<string, Prompt>) {
    super();
    this.prompts = initialPrompts;
    this.promptKeys = Array.from(initialPrompts.keys());
    
    // Find active one
    const activeKey = this.promptKeys.find(k => this.prompts.get(k)?.weight === 1);
    if (activeKey) {
      this.activeIndex = this.promptKeys.indexOf(activeKey);
      this.rotation = this.calculateAngleForIndex(this.activeIndex);
    }

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.generateBackgroundImage();
  }

  private async generateBackgroundImage() {
    // FIX: Use `process.env.API_KEY` per coding guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'A 90s-style girl\'s bedroom, dreamy, nostalgic, vaporwave aesthetic, anime posters on the wall, lava lamp, beaded curtains, photorealistic.',
            },
          ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          // FIX: Cast to unknown first to fix TS error on style property access.
          (this as unknown as HTMLElement).style.backgroundImage = `url(data:image/png;base64,${base64ImageBytes})`;
          return;
        }
      }
    } catch (error) {
      console.error('Failed to generate background image:', error);
      // The default pink gradient will serve as a fallback.
    }
  }

  private get currentPrompt(): Prompt {
    return this.prompts.get(this.promptKeys[this.activeIndex])!;
  }

  private calculateAngleForIndex(index: number) {
    const count = this.promptKeys.length;
    // Map index to a portion of the circle, e.g., start at -135deg to +135deg range
    // Or just 360 wrap around. Let's do infinite wrap.
    return (index / count) * 360;
  }

  private setStation(index: number) {
    if (index === this.activeIndex) return;
    
    this.activeIndex = index;
    
    const newPrompts = new Map(this.prompts);
    this.promptKeys.forEach((key, i) => {
      const p = newPrompts.get(key)!;
      p.weight = i === index ? 1 : 0;
      newPrompts.set(key, p);
    });
    
    this.prompts = newPrompts;
    // FIX: Cast to LitElement to access dispatchEvent.
    (this as LitElement).dispatchEvent(
      new CustomEvent('prompts-changed', { detail: this.prompts }),
    );
    // FIX: Cast to LitElement to access requestUpdate.
    (this as LitElement).requestUpdate();
  }

  private startAngle = 0;
  private startRotation = 0;

  private getAngleFromEvent(e: PointerEvent, rect: DOMRect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    let deg = rad * (180 / Math.PI);
    deg += 90; // Shift so 0 is top
    if (deg < 0) deg += 360;
    return deg;
  }

  private handlePointerDown(e: PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    this.startAngle = this.getAngleFromEvent(e, rect);
    this.startRotation = this.rotation;
    
    target.setPointerCapture(e.pointerId);
    target.addEventListener('pointermove', this.handlePointerMove);
    target.addEventListener('pointerup', this.handlePointerUp);
    target.addEventListener('pointercancel', this.handlePointerUp);
  }

  private handlePointerMove(e: PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const currentAngle = this.getAngleFromEvent(e, rect);
    
    let delta = currentAngle - this.startAngle;
    
    // Handle crossing the 0/360 boundary smoothly
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    this.rotation = (this.startRotation + delta + 360) % 360;
    
    // Calculate active station
    const count = this.promptKeys.length;
    const segmentSize = 360 / count;
    const rawIndex = Math.floor(((this.rotation + segmentSize/2) % 360) / segmentSize);
    const index = Math.max(0, Math.min(count - 1, rawIndex)); // Safety clamp
    
    this.setStation(index);
  }

  private handlePointerUp(e: PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    target.removeEventListener('pointermove', this.handlePointerMove);
    target.removeEventListener('pointerup', this.handlePointerUp);
    target.removeEventListener('pointercancel', this.handlePointerUp);
    
    // Snap to exact center of station
    const count = this.promptKeys.length;
    const step = 360 / count;
    this.rotation = this.activeIndex * step;
  }

  private playPause() {
    // FIX: Cast to LitElement to access dispatchEvent.
    (this as LitElement).dispatchEvent(new CustomEvent('play-pause'));
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
    // FIX: Cast to LitElement to access requestUpdate.
    (this as LitElement).requestUpdate();
  }

  // FIX: Removed override keyword to fix TS error.
  render() {
    const prompt = this.currentPrompt;
    const isFiltered = this.filteredPrompts.has(prompt.text);
    const isPlaying = this.playbackState === 'playing';

    // Fake frequency logic: Start at 88.0, add 1.5 per station index
    const frequency = (88.0 + (this.activeIndex * 1.5)).toFixed(1);

    // Speaker Pulse
    const pulseScale = 1 + (this.audioLevel * 0.15); // subtle pulse
    const speakerStyle = styleMap({
        transform: `scale(${pulseScale})`
    });

    return html`
      <div class="handle"></div>
      <div class="boombox">
        
        <!-- Left Speaker -->
        <div class="speaker-housing">
            <div class="speaker-ring">
                <div class="speaker-cone" style=${speakerStyle}>
                    <div class="dust-cap"></div>
                </div>
            </div>
        </div>

        <!-- Center Console -->
        <div class="center-console">
            
            <!-- Display -->
            <div class="display-panel">
                <div class="lcd-screen">
                    <div class="station-freq">FM ${frequency} MHz</div>
                    <div class="station-name ${isFiltered ? 'no-signal' : ''}">
                        ${isFiltered ? 'NO SIGNAL' : prompt.text}
                    </div>
                </div>
            </div>

            <!-- Cassette Deck -->
            <div class="cassette-deck">
                <div class="tape-window">
                    <div class="tape-connector"></div>
                    <div class="spool ${isPlaying ? 'spinning' : ''}">
                        <div class="spool-teeth"></div>
                    </div>
                    <div class="spool ${isPlaying ? 'spinning' : ''}">
                        <div class="spool-teeth"></div>
                    </div>
                </div>
            </div>

            <!-- Controls -->
            <div class="controls-panel">
                <!-- Fake keys -->
                <div class="piano-keys">
                    <div class="key"></div><div class="key"></div><div class="key"></div>
                </div>

                <div class="play-btn-container">
                    <play-pause-button 
                        .playbackState=${this.playbackState} 
                        @click=${this.playPause}
                    ></play-pause-button>
                </div>

                <div class="tuning-section">
                    <div class="knob-label">TUNING</div>
                    <div class="knob-wrapper">
                        <svg class="tuning-knob" viewBox="0 0 100 100" @pointerdown=${this.handlePointerDown}>
                             <defs>
                                <radialGradient id="knobGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                                    <stop offset="0%" stop-color="#666"/>
                                    <stop offset="100%" stop-color="#111"/>
                                </radialGradient>
                                <filter id="dropShadow">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                    <feOffset dx="1" dy="2" result="offsetblur"/>
                                    <feMerge> 
                                        <feMergeNode/>
                                        <feMergeNode in="SourceGraphic"/> 
                                    </feMerge>
                                </filter>
                             </defs>
                             
                             <!-- Knob Body -->
                             <circle cx="50" cy="50" r="48" fill="url(#knobGrad)" stroke="#000" stroke-width="2" filter="url(#dropShadow)" />
                             
                             <!-- Grip ridges -->
                             ${Array.from({length: 12}).map((_, i) => {
                                 const rot = i * 30;
                                 return svg`<rect x="46" y="2" width="8" height="10" fill="#333" transform="rotate(${rot} 50 50)" />`
                             })}
                             
                             <!-- Indicator Dot -->
                             <g transform="rotate(${this.rotation} 50 50)">
                                 <circle cx="50" cy="15" r="4" fill="#fff" />
                             </g>
                        </svg>
                    </div>
                </div>

            </div>
        </div>
        
        <!-- Right Speaker -->
        <div class="speaker-housing">
            <div class="speaker-ring">
                <div class="speaker-cone" style=${speakerStyle}>
                    <div class="dust-cap"></div>
                </div>
            </div>
        </div>
        
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-dj-midi': PromptDjMidi;
  }
}