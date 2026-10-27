/**
 * Browser speech features, feature-detected (no API keys, no third-party SDKs).
 *
 *  - Voice output: window.speechSynthesis. Captions are ALWAYS shown alongside, because
 *    voice quality varies by browser/OS and some systems have no voices at all.
 *  - Speech input (optional, OFF by default): window.SpeechRecognition /
 *    webkitSpeechRecognition. It only checks whether the key chunk was said (approximate,
 *    not pronunciation scoring) and always falls back to choose mode.
 *
 * Privacy disclosure (MDN, verified 2026-10-27; see research/sources.md): in some
 * browsers, such as Chrome, recognition uses a server-based engine, so audio is sent to
 * the browser vendor's speech service. The game never records or stores audio itself.
 * @module systems/speech
 */

export const RATE_MIN = 0.75;
export const RATE_MAX = 1.25;

export const SPEECH_DISCLOSURE =
  'Speaking practice uses your browser\'s built-in speech recognition. In some browsers (for example Chrome), ' +
  'your voice is sent to the browser company\'s speech service to turn it into text. This game does not record ' +
  'or store your voice. The check is approximate: it only listens for the key phrase, it does not score pronunciation. ' +
  'You can switch this off at any time, and choosing or building an answer always works.';

export function clampRate(r) {
  const n = Number(r);
  if (!Number.isFinite(n)) return 1;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, n));
}

export function hasSynthesis() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

export function recognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function hasRecognition() { return Boolean(recognitionCtor()); }

/** Voice output with a caption callback. Never throws; silently skips if unavailable or muted. */
export class Voice {
  constructor({ getSettings }) {
    this.getSettings = getSettings;
    this.available = hasSynthesis();
  }

  voices() {
    if (!this.available) return [];
    return window.speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  }

  /**
   * Speak a line. `rateMul` lets repair lines go slower (e.g. 0.8 x the user rate).
   * Resolves when finished (or immediately when unavailable/muted).
   */
  speak(text, { rateMul = 1 } = {}) {
    const s = this.getSettings();
    if (!this.available || s.muted || s.voiceOn === false) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang = 'en-GB';
        u.rate = clampRate((s.speechRate || 1) * rateMul) || 1;
        u.volume = Math.max(0, Math.min(1, (s.volumeMaster ?? 0.8) * (s.volumeVoice ?? 1)));
        const v = this.voices().find((x) => x.name === s.voiceName);
        if (v) u.voice = v;
        u.onend = () => resolve(true);
        u.onerror = () => resolve(false);
        window.speechSynthesis.speak(u);
        setTimeout(() => resolve(false), 20000);
      } catch { resolve(false); }
    });
  }

  stop() { try { if (this.available) window.speechSynthesis.cancel(); } catch { /* ignore */ } }
}

/**
 * One-shot listener. Only constructed after the learner has switched speech input ON
 * and pressed "Speak". Resolves with { ok, transcript } or { ok:false, error }.
 */
export function listenOnce({ lang = 'en-GB', timeoutMs = 9000 } = {}) {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.resolve({ ok: false, error: 'unsupported' });
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    try {
      const rec = new Ctor();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.onresult = (e) => {
        const alts = [];
        for (const res of e.results) for (const alt of res) alts.push(alt.transcript);
        finish({ ok: true, transcript: alts.join(' | ') });
      };
      rec.onerror = (e) => finish({ ok: false, error: e.error || 'error' });
      rec.onend = () => finish({ ok: false, error: 'no-speech' });
      rec.start();
      setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } finish({ ok: false, error: 'timeout' }); }, timeoutMs);
    } catch (err) { finish({ ok: false, error: String(err?.message || err) }); }
  });
}
