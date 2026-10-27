/**
 * Settings dialog: quality preset, text size, contrast, captions, reduced motion, FOV,
 * voice on/off + voice choice + speech rate (0.75-1.25x), volume/mute, and the optional
 * speech input (OFF by default, with the browser-vendor disclosure shown before it can be
 * switched on). Persisted under the slug-prefixed key `arrival-english:settings`.
 * @module ui/settings
 */
import { openDialog, closeDialog } from '../a11y/focus.js';
import { RATE_MIN, RATE_MAX, clampRate, hasRecognition, hasSynthesis, SPEECH_DISCLOSURE } from '../systems/speech.js';

export const DEFAULTS = {
  textSize: 'normal',
  contrast: 'normal',
  captions: true,
  voiceOn: true,
  voiceName: '',
  speechRate: 1,
  speechInput: false, // OFF by default (plan §5.4)
  volumeMaster: 0.8,
  volumeVoice: 1.0,
  muted: false,
  fov: 55,
};

export class Settings {
  constructor({ slug, dialog, quality, motion, voice, onChange }) {
    this.slug = slug;
    this.dialog = dialog;
    this.quality = quality;
    this.motion = motion;
    this.voice = voice;
    this.onChange = onChange;
    this.state = this._load();
    this._apply();
  }

  _load() {
    const d = { ...DEFAULTS };
    try { Object.assign(d, JSON.parse(localStorage.getItem(`${this.slug}:settings`) || '{}')); } catch { /* ignore */ }
    d.speechRate = clampRate(d.speechRate);
    if (!hasRecognition()) d.speechInput = false;
    return d;
  }

  save() {
    try { localStorage.setItem(`${this.slug}:settings`, JSON.stringify(this.state)); } catch { /* ignore */ }
  }

  get() { return this.state; }

  _build() {
    const s = this.state;
    const recog = hasRecognition();
    const synth = hasSynthesis();
    const voices = this.voice?.voices() || [];
    const q = this.dialog;
    q.innerHTML = `
      <h2 id="settings-h">Settings</h2>
      <form method="dialog">
        <fieldset>
          <legend>Voice and captions</legend>
          <label><input type="checkbox" id="set-captions"> Captions over the scene (the conversation text is always shown in the panel)</label>
          <label><input type="checkbox" id="set-voice" ${synth ? '' : 'disabled'}> Read lines aloud (browser voice)</label>
          ${synth ? '' : '<p class="hint">Your browser has no built-in voices. All lines are shown as text.</p>'}
          <label for="set-voicename">Voice</label>
          <select id="set-voicename" ${voices.length ? '' : 'disabled'}>
            <option value="">Default English voice</option>
            ${voices.map((v) => `<option value="${escapeAttr(v.name)}">${escapeHTML(v.name)} (${escapeHTML(v.lang)})</option>`).join('')}
          </select>
          <label for="set-rate">Speech rate <output id="set-rate-out" for="set-rate">${s.speechRate.toFixed(2)}\u00D7</output></label>
          <input type="range" id="set-rate" min="${RATE_MIN}" max="${RATE_MAX}" step="0.05" value="${s.speechRate}">
          <label><input type="checkbox" id="set-muted"> Mute all audio</label>
          <label for="set-vol-master">Master volume</label>
          <input type="range" id="set-vol-master" min="0" max="1" step="0.05" value="${s.volumeMaster}">
          <label for="set-vol-voice">Voice volume</label>
          <input type="range" id="set-vol-voice" min="0" max="1" step="0.05" value="${s.volumeVoice}">
        </fieldset>
        <fieldset>
          <legend>Speaking practice (optional)</legend>
          <p class="disclosure" id="speech-disclosure">${escapeHTML(SPEECH_DISCLOSURE)}</p>
          ${recog
            ? '<label><input type="checkbox" id="set-speech" aria-describedby="speech-disclosure"> Turn on speech input (off by default)</label>'
            : '<p class="hint" id="set-speech-unsupported">Speech input is not available in this browser. You can still choose or build every answer.</p>'}
        </fieldset>
        <fieldset>
          <legend>Display and comfort</legend>
          <label for="set-textsize">Text size</label>
          <select id="set-textsize"><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">Extra large</option></select>
          <label for="set-contrast">Contrast</label>
          <select id="set-contrast"><option value="normal">Normal</option><option value="high">High contrast</option></select>
          <label for="set-fov">Field of view <output id="set-fov-out" for="set-fov">${s.fov}\u00B0</output></label>
          <input type="range" id="set-fov" min="40" max="75" step="5" value="${s.fov}">
          <label><input type="checkbox" id="set-motion"> Reduce motion (no camera moves; still frames and cuts instead)</label>
          <label for="set-quality">Graphics quality</label>
          <select id="set-quality">
            <option value="low">Low (phones, older laptops)</option>
            <option value="medium">Medium (integrated GPUs)</option>
            <option value="high">High (discrete GPUs)</option>
            <option value="ultra">Ultra (strong desktops)</option>
          </select>
        </fieldset>
        <menu>
          <button value="cancel" type="button" id="set-cancel">Cancel</button>
          <button value="confirm" type="submit" id="set-save">Save settings</button>
        </menu>
      </form>`;
    const $ = (sel) => q.querySelector(sel);
    $('#set-captions').checked = s.captions;
    $('#set-voice').checked = s.voiceOn && synth;
    $('#set-voicename').value = s.voiceName;
    $('#set-muted').checked = s.muted;
    if ($('#set-speech')) $('#set-speech').checked = s.speechInput;
    $('#set-textsize').value = s.textSize;
    $('#set-contrast').value = s.contrast;
    $('#set-motion').checked = Boolean(this.motion?.reduced);
    if (this.quality) $('#set-quality').value = this.quality.name;
    else $('#set-quality').disabled = true;
    $('#set-rate').addEventListener('input', (e) => { $('#set-rate-out').textContent = `${Number(e.target.value).toFixed(2)}\u00D7`; });
    $('#set-fov').addEventListener('input', (e) => { $('#set-fov-out').textContent = `${e.target.value}\u00B0`; });
    $('#set-cancel').addEventListener('click', () => closeDialog(q));
    q.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      s.captions = $('#set-captions').checked;
      s.voiceOn = $('#set-voice').checked;
      s.voiceName = $('#set-voicename').value;
      s.speechRate = clampRate($('#set-rate').value);
      s.muted = $('#set-muted').checked;
      s.volumeMaster = parseFloat($('#set-vol-master').value);
      s.volumeVoice = parseFloat($('#set-vol-voice').value);
      s.speechInput = Boolean($('#set-speech')?.checked) && recog;
      s.textSize = $('#set-textsize').value;
      s.contrast = $('#set-contrast').value;
      s.fov = parseFloat($('#set-fov').value);
      if (this.motion) this.motion.setToggle($('#set-motion').checked);
      if (this.quality && $('#set-quality').value !== this.quality.name) this.quality.set($('#set-quality').value);
      this.save();
      this._apply();
      closeDialog(q);
    });
  }

  /** Programmatic update (used by tests and the "Speak" onboarding). */
  update(patch) {
    Object.assign(this.state, patch);
    this.state.speechRate = clampRate(this.state.speechRate);
    if (!hasRecognition()) this.state.speechInput = false;
    this.save();
    this._apply();
  }

  _apply() {
    const root = document.documentElement;
    root.dataset.textSize = this.state.textSize;
    root.dataset.contrast = this.state.contrast;
    root.dataset.captions = this.state.captions ? 'on' : 'off';
    this.onChange?.(this.state);
  }

  open(trigger) { this._build(); openDialog(this.dialog, trigger); }
}

function escapeHTML(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function escapeAttr(s) { return escapeHTML(s).replace(/'/g, '&#39;'); }
