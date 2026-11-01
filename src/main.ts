import './style.css';
import { Mic } from './audio/mic';
import { Voice } from './audio/voice';
import {
  enterFullscreen, exitFullscreen, isFullscreen, isIOS, isStandalone, registerServiceWorker, ScreenWakeLock,
} from './device';
import { resolveFete, type Fete } from './catalog';
import { Game } from './game/game';
import { PointerInput } from './game/input';
import { World } from './game/world';
import { currentLang, plural, setLang, t, tf } from './i18n';
import { Menu } from './menu';
import { applyPreset, presetQuery } from './preset';
import { Session } from './session';
import { loadSettings, resetSettings, saveSettings, SPEED_FACTOR, type Settings } from './settings';

const HOLD_MS = 1400;
const REPO = 'https://github.com/ImMaxence/meowtrix';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const canvas = $<HTMLCanvasElement>('#scene');
const menu = $('#menu');
const playBtn = $<HTMLButtonElement>('#play');
const exitFsBtn = $<HTMLButtonElement>('#exit-fs');
const holdBtn = $<HTMLButtonElement>('#hold');
const toastEl = $('#toast');
const installBtn = $<HTMLButtonElement>('#install');
const installHint = $('#install-hint');
const statsEl = $('#stats');
const shareBtn = $<HTMLButtonElement>('#share');
const summaryEl = $('#summary');

const settings = loadSettings();
// A landing page (/eau/, /noel/…) or a shared link sets up its scene; the link is then cleaned
// up so that a reload keeps what was changed in the menu since.
const fromPage = applyPreset(settings, document.documentElement.dataset.preset ?? '');
const fromLink = applyPreset(settings, location.search);
if (fromPage || fromLink) saveSettings(settings);
if (fromLink) history.replaceState(null, '', location.pathname + location.hash);
setLang(settings.lang);
registerServiceWorker();
$('#version').textContent = `Meowtrix v${__APP_VERSION__}`;
$<HTMLAnchorElement>('#github').href = REPO;
// A new GitHub issue, with what helps reproduce the problem already filled in.
$<HTMLAnchorElement>('#report').href = `${REPO}/issues/new?body=${encodeURIComponent(
  `\n\n---\nVersion : ${__APP_VERSION__}\nNavigateur : ${navigator.userAgent}\nÉcran : ${window.innerWidth}×${window.innerHeight}`,
)}`;

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
  world.setStyle(settings.style);

  const voice = new Voice();
  const game = new Game(world, voice);
  game.speed = SPEED_FACTOR[settings.speed];
  const applyTheme = () => {
    world.setGround(settings.ground[settings.theme]);
    game.setTheme(settings.theme, settings.covers[settings.theme], settings.animals, settings.colors);
  };
  applyTheme();
  let fete: Fete = resolveFete(settings.fete);
  game.setFete(fete);
  /** Also called when the menu opens or play starts: with 'auto', the season may have turned. */
  const applyFete = () => {
    const next = resolveFete(settings.fete);
    if (next === fete) return;
    fete = next;
    game.setFete(fete);
  };

  const session = new Session();
  /** The last timed session is over: the next Play starts a new one. */
  let sessionOver = false;
  let summary: { catches: number; minutes: number } | null = null;
  const vibrationSupported = typeof navigator.vibrate === 'function';
  game.onCatch = () => {
    if (!playing) return;
    session.caught();
    // A short buzz when a paw lands right on an animal.
    if (settings.vibration && vibrationSupported) navigator.vibrate(40);
  };

  const input = new PointerInput(canvas, world, game);
  const wakeLock = new ScreenWakeLock();
  const micSupported = !!navigator.mediaDevices?.getUserMedia;
  let mic: Mic | null = null;
  let playing = false;
  let played = false;

  // --- Menu -------------------------------------------------------------------

  const options = new Menu(
    {
      root: menu, themes: $('#themes'), fetes: $('#fetes'), tabs: $('#tabs'), panel: $('#tab-panel'),
      about: $('#about'), lang: $('#lang'),
    },
    settings,
    { change, micSupported, vibrationSupported, previewVolume: () => voice.preview(), reset, activeFete: () => fete },
  );

  const catName = () => settings.catName.trim();
  const catches = (n: number) => plural(n, 'catch_one', 'catch_many');

  /** This session's and all-time catches, and the time left in a timed session. */
  function renderStats(): void {
    const parts: string[] = [];
    if (session.catches || session.stats.total) {
      parts.push(tf('thisSession', { catches: catches(session.catches) }), tf('inTotal', { n: session.stats.total }));
    }
    if (played && !sessionOver && session.timed) parts.push(plural(session.minutesLeft, 'minLeft_one', 'minLeft_many'));
    statsEl.hidden = !parts.length;
    statsEl.textContent = `🐾 ${catName() ? `${catName()} · ` : ''}${parts.join(' · ')}`;
  }

  function renderSummary(): void {
    summaryEl.hidden = !summary;
    if (!summary) return;
    const cat = catName() || t('myCat');
    const line = (text: string) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    };
    const title = document.createElement('strong');
    title.textContent = t('summaryTitle');
    summaryEl.replaceChildren(
      title,
      line(summary.catches ? tf('summaryCaught', { cat, catches: catches(summary.catches), minutes: summary.minutes }) : t('summaryNone')),
      ...(summary.catches ? [line(t('summaryTreat'))] : []),
    );
  }

  const refreshMenu = () => {
    options.render();
    renderStats();
    renderSummary();
    playBtn.textContent = t(played && !sessionOver ? 'resume' : 'play');
    exitFsBtn.hidden = !isFullscreen();
  };

  /** `rerender` is false while a slider is dragged or a name typed: rebuilding the menu would drop them. */
  function change<K extends keyof Settings>(key: K, value: Settings[K], rerender = true): void {
    settings[key] = value;
    saveSettings(settings);
    if (key === 'volume') voice.setVolume(settings.volume);
    if (key === 'catName') {
      renderStats();
      renderSummary();
    }
    if (!rerender) return;
    if (key === 'lang') setLang(settings.lang);
    if (key === 'theme') applyTheme();
    if (key === 'animals' || key === 'colors') game.setPopulation(settings.animals, settings.colors);
    if (key === 'speed') game.speed = SPEED_FACTOR[settings.speed];
    if (key === 'covers') game.setCovers(settings.covers[settings.theme]);
    if (key === 'size') {
      world.setViewSize(settings.size);
      game.relayout(true);
    }
    if (key === 'ground') world.setGround(settings.ground[settings.theme]);
    if (key === 'style') world.setStyle(settings.style);
    if (key === 'fete') applyFete();
    if (key === 'session') session.setLength(settings.session);
    refreshMenu();
  }

  /** Back to a single green lizard on stone, in the land theme, with the fête in season. */
  function reset(): void {
    resetSettings(settings);
    saveSettings(settings);
    world.setViewSize(settings.size);
    world.setStyle(settings.style);
    game.speed = SPEED_FACTOR[settings.speed];
    applyTheme();
    applyFete();
    refreshMenu();
  }

  /** The text and the link (to this scene) for the share sheet, or the clipboard. */
  async function share(): Promise<void> {
    const cat = catName() || t('myCat');
    const text = session.catches
      ? tf('shareSession', { cat, catches: catches(session.catches) })
      : session.stats.total
        ? tf('shareTotal', { cat, catches: catches(session.stats.total) })
        : t('shareIntro');
    const url = `${location.origin}${currentLang() === 'en' ? '/en/' : '/'}?${presetQuery(settings)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Meowtrix', text, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast(t('linkCopied'));
    } catch {
      toast(tf('copyThis', { url }), 10000);
    }
  }
  shareBtn.addEventListener('click', () => void share());

  function openMenu(): void {
    if (!playing) return;
    playing = false;
    input.enabled = false;
    voice.setMuted(true);
    applyFete();
    menu.classList.remove('hidden');
    holdBtn.hidden = true;
    refreshMenu();
    playBtn.focus();
  }

  /** Time is up and the cat made its last catch (or gave up): show how it went. */
  function endSession(): void {
    summary = { catches: session.catches, minutes: Math.max(1, Math.round(session.elapsed / 60)) };
    sessionOver = true;
    game.tired = 0;
    openMenu();
  }

  async function play(): Promise<void> {
    // Fullscreen and audio must start synchronously inside the click.
    enterFullscreen();
    const ctx = voice.init();
    voice.setVolume(settings.volume);
    voice.setMuted(false);
    wakeLock.request();

    if (!played || sessionOver) {
      session.start(settings.session);
      sessionOver = false;
      summary = null;
    }
    applyFete();
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

    if (playing) {
      if (session.update(dt)) endSession();
      else game.tired = session.tired;
    }
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

  if (import.meta.env.DEV) Object.assign(window, { meowtrix: { world, game, session } });

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
