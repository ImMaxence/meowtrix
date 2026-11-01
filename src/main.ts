import './style.css';
import { Mic } from './audio/mic';
import { Voice } from './audio/voice';
import {
  enterFullscreen, exitFullscreen, isFullscreen, isIOS, isStandalone, registerServiceWorker, ScreenWakeLock,
} from './device';
import { Game } from './game/game';
import { PointerInput } from './game/input';
import { World } from './game/world';
import { setLang, t } from './i18n';
import { Menu } from './menu';
import { loadSettings, saveSettings, SPEED_FACTOR, type Settings } from './settings';

const HOLD_MS = 1400;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const canvas = $<HTMLCanvasElement>('#scene');
const menu = $('#menu');
const playBtn = $<HTMLButtonElement>('#play');
const exitFsBtn = $<HTMLButtonElement>('#exit-fs');
const holdBtn = $<HTMLButtonElement>('#hold');
const toastEl = $('#toast');
const installBtn = $<HTMLButtonElement>('#install');
const installHint = $('#install-hint');

const settings = loadSettings();
setLang(settings.lang);
registerServiceWorker();
$('#version').textContent = `Meowtrix v${__APP_VERSION__}`;

let toastTimer = 0;
function toast(message: string, ms = 4500): void {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms);
}

function createWorld(): World | null {
  try {
    return new World(canvas);
  } catch {
    playBtn.disabled = true;
    $('#fatal').hidden = false;
    return null;
  }
}

const world = createWorld();
if (world) start(world);

function start(world: World): void {
  world.setViewSize(settings.size);

  const voice = new Voice();
  const game = new Game(world, voice);
  game.speedFactor = SPEED_FACTOR[settings.speed];
  const applyTheme = () => {
    world.setGround(settings.ground[settings.theme]);
    game.setTheme(settings.theme, settings.covers[settings.theme], settings.animals, settings.colors);
  };
  applyTheme();

  const input = new PointerInput(canvas, world, game);
  const wakeLock = new ScreenWakeLock();
  const micSupported = !!navigator.mediaDevices?.getUserMedia;
  let mic: Mic | null = null;
  let playing = false;
  let played = false;

  // --- Menu -------------------------------------------------------------------

  const options = new Menu(
    { root: menu, themes: $('#themes'), tabs: $('#tabs'), panel: $('#tab-panel'), lang: $('#lang') },
    settings,
    { change, micSupported, previewVolume: () => voice.preview() },
  );

  const refreshMenu = () => {
    options.render();
    playBtn.textContent = t(played ? 'resume' : 'play');
    exitFsBtn.hidden = !isFullscreen();
  };

  /** `rerender` is false while a slider is dragged: rebuilding the menu would drop the slider. */
  function change<K extends keyof Settings>(key: K, value: Settings[K], rerender = true): void {
    settings[key] = value;
    saveSettings(settings);
    if (key === 'volume') voice.setVolume(settings.volume);
    if (!rerender) return;
    if (key === 'lang') setLang(settings.lang);
    if (key === 'theme') applyTheme();
    if (key === 'animals' || key === 'colors') game.setPopulation(settings.animals, settings.colors);
    if (key === 'speed') game.speedFactor = SPEED_FACTOR[settings.speed];
    if (key === 'covers') game.setCovers(settings.covers[settings.theme]);
    if (key === 'size') {
      world.setViewSize(settings.size);
      game.relayout(true);
    }
    if (key === 'ground') world.setGround(settings.ground[settings.theme]);
    refreshMenu();
  }

  function openMenu(): void {
    if (!playing) return;
    playing = false;
    input.enabled = false;
    voice.setMuted(true);
    menu.classList.remove('hidden');
    holdBtn.hidden = true;
    refreshMenu();
    playBtn.focus();
  }

  async function play(): Promise<void> {
    // Fullscreen and audio must start synchronously inside the click.
    enterFullscreen();
    const ctx = voice.init();
    voice.setVolume(settings.volume);
    voice.setMuted(false);
    wakeLock.request();

    menu.classList.add('hidden');
    holdBtn.hidden = false;
    playing = true;
    input.enabled = true;
    if (!played) toast(t(matchMedia('(pointer: fine)').matches ? 'holdHintMouse' : 'holdHint'));
    played = true;

    if (settings.mic && !mic && ctx) {
      const m = new Mic();
      const result = await m.start(ctx);
      if (result === 'ok') mic = m;
      else toast(t(result === 'denied' ? 'micDenied' : 'micUnavailable'));
    } else if (!settings.mic && mic) {
      mic.stop();
      mic = null;
    }
  }

  playBtn.addEventListener('click', () => void play());
  exitFsBtn.addEventListener('click', () => exitFullscreen());

  // Long press so a paw can't open the menu by accident.
  let holdTimer = 0;
  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdBtn.classList.remove('holding');
  };
  holdBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    holdBtn.classList.add('holding');
    holdTimer = window.setTimeout(() => {
      cancelHold();
      openMenu();
    }, HOLD_MS);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) holdBtn.addEventListener(ev, cancelHold);

  document.addEventListener('keydown', (e) => {
    if (['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(e.key) && playing) {
      e.preventDefault();
      openMenu();
    }
  });

  // Double-click with a mouse leaves fullscreen. Ignored for touch: a cat taps twice all the time.
  canvas.addEventListener('dblclick', () => {
    if (!playing || input.lastType !== 'mouse') return;
    if (isFullscreen()) exitFullscreen();
    else openMenu();
  });

  let wasFullscreen = false;
  document.addEventListener('fullscreenchange', () => {
    exitFsBtn.hidden = !isFullscreen();
    if (isFullscreen()) wasFullscreen = true;
    else if (wasFullscreen) {
      wasFullscreen = false;
      openMenu();
    }
  });

  // Install: Android/desktop get a button; iOS gets instructions.
  let installPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e as typeof installPrompt;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', () => {
    void installPrompt?.prompt();
    installPrompt = null;
    installBtn.hidden = true;
  });
  if (isIOS() && !isStandalone()) installHint.hidden = false;

  // Pinch-zoom and double-tap zoom would break the game on touch screens.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  refreshMenu();

  // --- Loop -------------------------------------------------------------------

  let last = 0;
  let perfTime = 0;
  let perfFrames = 0;
  let perfDone = false;

  const frame = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;

    game.update(dt);
    world.update(dt);
    if (playing && mic) {
      // Our own sounds and footsteps must not startle the lizards.
      const gated = performance.now() < voice.loudUntil || game.noisy;
      const level = mic.update(dt, gated);
      if (level) game.noise(level);
    }
    world.render();

    // After a short warm-up, measure the frame rate once and lighten the load if needed.
    if (!perfDone && now > 2000) {
      perfTime += dt;
      if (++perfFrames === 90) {
        perfDone = true;
        if (perfTime / perfFrames > 1 / 40) world.setLowQuality();
      }
    }
  };

  if (import.meta.env.DEV) Object.assign(window, { meowtrix: { world, game } });

  world.renderer.setAnimationLoop(frame);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    world.resize();
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => game.relayout(false), 400);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      world.renderer.setAnimationLoop(null);
      voice.suspend();
    } else {
      last = 0;
      world.renderer.setAnimationLoop(frame);
      voice.resume();
    }
  });
}
