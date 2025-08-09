(() => {
  // Global per-tab processor state
  let ctx = null;
  let mediaNodes = new Map(); // mediaEl -> { source, gain, eq, comp, out, analyser, timers }
  let enabled = false;

  // Default settings
  const settings = {
    voiceBoostDb: 6,         // peaking EQ + compressor make speech clearer
    musicCutDb: -12,         // reduction applied to non-speech shelves during speech
    bassCutHz: 120,          // high-pass cutoff
    sparkleCutHz: 8000,      // low-pass cutoff when Music Suppress active
    vadIntervalMs: 75,       // detection cadence
    vadSpeechThreshold: 0.14,// energy ratio threshold
    autoAttach: true
  };

  function dbToGain(db) { return Math.pow(10, db / 20); }

  function buildChainFor(el) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const source = ctx.createMediaElementSource(el);

      // Base gain node for master control
      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      // EQ nodes: high-pass to remove rumble, peaking for voice, low-shelf ducking for music, high-shelf tame
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = settings.bassCutHz;
      hp.Q.value = 0.707;

      const voicePeak = ctx.createBiquadFilter();
      voicePeak.type = 'peaking';
      voicePeak.frequency.value = 1700;  // center of speech formants
      voicePeak.Q.value = 1.0;
      voicePeak.gain.value = settings.voiceBoostDb;

      const musicLowShelf = ctx.createBiquadFilter();
      musicLowShelf.type = 'lowshelf';
      musicLowShelf.frequency.value = 200;
      musicLowShelf.gain.value = 0; // dynamically reduced when speech detected

      const musicHighShelf = ctx.createBiquadFilter();
      musicHighShelf.type = 'highshelf';
      musicHighShelf.frequency.value = 3000;
      musicHighShelf.gain.value = 0; // dynamically reduced when speech detected

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 20000; // full band by default, may tighten during suppression
      lp.Q.value = 0.707;

      // Mild compressor to tighten dynamics around speech
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -28;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.005;
      comp.release.value = 0.08;

      // For crude VAD: band-pass around speech, then energy ratio vs. broadband
      const speechBp = ctx.createBiquadFilter();
      speechBp.type = 'bandpass';
      speechBp.frequency.value = 1600;
      speechBp.Q.value = 0.8;

      const analyserWide = ctx.createAnalyser();
      analyserWide.fftSize = 1024;
      const analyserSpeech = ctx.createAnalyser();
      analyserSpeech.fftSize = 1024;

      // Wire: source -> gain -> hp -> voicePeak -> musicLowShelf -> musicHighShelf -> lp -> comp -> destination
      source.connect(gain);
      gain.connect(hp);
      hp.connect(voicePeak);
      voicePeak.connect(musicLowShelf);
      musicLowShelf.connect(musicHighShelf);
      musicHighShelf.connect(lp);
      lp.connect(comp);
      comp.connect(ctx.destination);

      // Tap for analysis
      voicePeak.connect(analyserWide);
      voicePeak.connect(speechBp);
      speechBp.connect(analyserSpeech);

      mediaNodes.set(el, {
        source, gain, eq: { hp, voicePeak, musicLowShelf, musicHighShelf, lp }, comp,
        analyser: { analyserWide, analyserSpeech }, timers: { vad: null },
      });

      // Start VAD loop when enabled
      if (enabled) startVad(el);

    } catch (e) {
      console.warn('[HushMode] Could not attach to media element', e);
    }
  }

  function startVad(el) {
    const node = mediaNodes.get(el);
    if (!node || node.timers.vad) return;

    const { analyserWide, analyserSpeech } = node.analyser;
    const wide = new Float32Array(analyserWide.frequencyBinCount);
    const speech = new Float32Array(analyserSpeech.frequencyBinCount);

    const tick = () => {
      if (!enabled) return;
      analyserWide.getFloatFrequencyData(wide);
      analyserSpeech.getFloatFrequencyData(speech);

      // Convert to linear magnitudes, compute mean energy
      const eWide = avgLinear(wide);
      const eSpeech = avgLinear(speech);
      const ratio = eSpeech / (eWide + 1e-9);

      const speaking = ratio > settings.vadSpeechThreshold; // rough VAD
      applyDucking(el, speaking);
      node.timers.vad = setTimeout(tick, settings.vadIntervalMs);
    };
    tick();
  }

  function stopVad(el) {
    const node = mediaNodes.get(el);
    if (!node) return;
    if (node.timers.vad) {
      clearTimeout(node.timers.vad);
      node.timers.vad = null;
    }
  }

  function avgLinear(arrDb) {
    let sum = 0, n = 0;
    for (let i = 0; i < arrDb.length; i++) {
      const db = arrDb[i];
      if (!isFinite(db)) continue;
      sum += Math.pow(10, db / 20);
      n++;
    }
    return n ? sum / n : 0;
  }

  function applyDucking(el, speaking) {
    const node = mediaNodes.get(el);
    if (!node) return;
    const { musicLowShelf, musicHighShelf, lp } = node.eq;

    if (speaking) {
      // Reduce low and high shelves to push music back while dialogue is present
      musicLowShelf.gain.setTargetAtTime(settings.musicCutDb, ctx.currentTime, 0.02);
      musicHighShelf.gain.setTargetAtTime(settings.musicCutDb * 0.6, ctx.currentTime, 0.02);
      // Tighten bandwidth a bit to favor mid band during speech
      lp.frequency.setTargetAtTime(settings.sparkleCutHz, ctx.currentTime, 0.05);
    } else {
      // Restore full mix between lines
      musicLowShelf.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      musicHighShelf.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      lp.frequency.setTargetAtTime(20000, ctx.currentTime, 0.1);
    }
  }

  function attachAll() {
    const media = document.querySelectorAll('video, audio');
    media.forEach((el) => {
      if (!mediaNodes.has(el)) buildChainFor(el);
    });
  }

  function detachAll() {
    mediaNodes.forEach((node, el) => {
      stopVad(el);
      try {
        // Disconnect safely
        node.source.disconnect();
        node.gain.disconnect();
        Object.values(node.eq).forEach(n => n.disconnect());
        node.comp.disconnect();
        // NOTE: AudioContext cannot disconnect destination; we simply stop using it.
      } catch (e) {
        console.warn('[HushMode] Detach error', e);
      }
    });
    mediaNodes.clear();

    // Optionally suspend the context to save CPU when disabled
    if (ctx && ctx.state !== 'closed') ctx.suspend().catch(()=>{});
  }

  // Observe new media elements (SPA sites like YouTube)
  const mo = new MutationObserver(() => {
    if (!enabled) return;
    attachAll();
  });
  mo.observe(document.documentElement, { subtree: true, childList: true });

  // Messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'HUSH_TOGGLE') {
      enabled = !!msg.enabled;
      if (enabled) {
        if (ctx && ctx.state === 'suspended') ctx.resume();
        attachAll();
      } else {
        detachAll();
      }
      sendResponse({ ok: true, enabled });
      return true;
    }
    if (msg?.type === 'HUSH_UPDATE_SETTINGS') {
      Object.assign(settings, msg.payload || {});
      sendResponse({ ok: true, settings });
      return true;
    }
  });

  // Auto attach on first play if enabled
  document.addEventListener('play', (e) => {
    if (!enabled) return;
    const el = e.target;
    if (el && (el.tagName === 'VIDEO' || el.tagName === 'AUDIO')) {
      if (!mediaNodes.has(el)) buildChainFor(el);
    }
  }, true);

  // Expose a small debug hook for quick testing
  window.HushMode = {
    enable: () => chrome.runtime.sendMessage({ type: 'HUSH_TOGGLE', enabled: true }),
    disable: () => chrome.runtime.sendMessage({ type: 'HUSH_TOGGLE', enabled: false })
  };
})();
