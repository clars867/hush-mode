# Hush Mode 🎧  
**Selective sound layer control for streaming media.**  
Boost dialogue, suppress background music, and reclaim your focus — in real time, directly in your browser.

---

## 📌 What is Hush Mode?
Hush Mode is a Chrome extension that lets you control the audio mix on most streaming platforms.  
It uses the Web Audio API to:
- **Boost voices** so speech is easier to hear
- **Reduce background music** during dialogue
- **Cut low rumble and high-frequency distractions**
- Apply changes locally in your browser — no cloud processing, no tracking

Perfect for:
- People with sensory overload sensitivity
- Viewers who prefer spoken content without overpowering music
- Accessibility use cases where layered sound interferes with comprehension

---

## 🚀 Features
- **Voice Boost**: Adjustable gain on speech frequencies
- **Music Suppression**: Dynamic ducking of non-speech layers
- **Custom Filters**: Adjustable high-pass and low-pass cutoffs
- **Real-time Toggle**: Enable/disable instantly
- **Local-Only Processing**: No audio leaves your device

---

## 🛠 Installation (Developer Mode)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/<your-username>/hush-mode.git

2. Open Chrome and go to:
   ```
   chrome://extensions

3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the hush-mode folder.
5. Pin the extensioin from the toolbar for quick access.

---
## 📖 How to Use
1. Open a video or audio stream (YouTube, online courses, etc.).
2. Click the Hush Mode Icon in Chrome.
3. Toggle **Enable** to activate audio filtering.
4. Adjust:
   * **Voice Boost** (defailt: +6 dB)
   * **Music Suppress** (default: -12 dB)
   * **Base Cut (HPF)** and **Sparkle Limit (LPF)**
5. Enjoy clearer, calmer listening.

---
## ⚙️ Roadmap
* Preset modes (Speech Only, Lecture, Movie Night, White Noise Cut)
* Per-site auto-enabled
* Enhanced voice/music seperation using on-device ML models
* Support for more DRM-heavy platforms

---
## 🛡️ Privacy
Hush mode processes all audio **locally** in your browser.
It does **not** record, transmit, or store your data.

## 📜 License
MIT License — see LICENSE for details.
