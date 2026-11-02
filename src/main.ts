import './style.css';
import { Mic } from './audio/mic';
import { Voice } from './audio/voice';
import {
  enterFullscreen, exitFullscreen, isFullscreen, isIOS, isStandalone, registerServiceWorker, ScreenWakeLock,
} from './device';
import { COVERS, GROUNDS, resolveFete, SPECIES, THEMES, type Fete } from './catalog';
import { Game } from './game/game';
import { PointerInput } from './game/input';
import { World, type Quality } from './game/world';
import { currentLang, plural, setLang, t, tf } from './i18n';
import { langHome } from './langs';
import { Menu } from './menu';
import { applyPreset, presetQuery } from './preset';
import { Session } from './session';
import { loadSettings, resetSettings, saveSettings, SPEED_FACTOR, type Settings } from './settings';
import { shareCard } from './share-card';

const HOLD_MS = 1400;
const REPO = 'https://github.com/ImMaxence/meowtrix';
const SITE = 'meowtrix.mbonnici.fr';

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
const hudEl = $('#hud');
const restEl = $('#rest');
const restText = $('#rest-text');

const settings = loadSettings();
// A landing page (/eau/, /noel/…) or a shared link sets up its scene; the link is then cleaned
// up so that a reload keeps what was changed in the menu since.
const fromPage = applyPreset(settings, document.documentElement.dataset.preset ?? '');
const fromLink = applyPreset(settings, location.search);
if (fromPage || fromLink) saveSettings(settings);
if (fromLink) history.replaceState(null, '', location.pathname + location.hash);
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

/** Lets the browser paint (and answer a tap) between two heavy steps. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

const pickOne = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** "1 h 05" or "12 min". */
function timeLeft(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

// The menu is drawn once its language is loaded, so it never flashes in another one. The 3D scene
// is built at the first touch, step by step (see boot): building it takes seconds on a phone, the
// menu must not wait for it, and a page nobody touches yet should cost nothing.
void setLang(settings.lang).then(start);

function start(): void {
  const voice = new Voice();
  // Null until boot() is done; the menu works before that and the scene catches up at the end.
  let world: World | null = null;
  let game: Game | null = null;
  let input: PointerInput | null = null;
  /** Set when a setting changed while the scene was being built. */
  let changedWhileLoading = false;
  /** The scene is built at the first touch or key (see startBoot); Play pressed before that waits for it. */
  let bootStarted = false;
  let playWhenReady = false;
  /** The animation loop runs only while the cat plays; behind the menu, frames are drawn on demand. */
  let looping = false;
  let renderQueued = false;

  const startLoop = () => {
    if (!world || looping) return;
    looping = true;
    last = 0;
    world.renderer.setAnimationLoop(frame);
  };
  const stopLoop = () => {
    if (!world || !looping) return;
    looping = false;
    world.renderer.setAnimationLoop(null);
  };
  /** One frame, soon, unless the loop is running anyway. */
  const requestRender = () => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (looping || !world) return;
      world.render();
      showScene();
    });
  };

  let fete: Fete = resolveFete(settings.fete);
  const applyTheme = () => {
    if (!world || !game) return;
    world.setGround(settings.ground[settings.theme]);
    game.setTheme(settings.theme, settings.covers[settings.theme], settings.animals, settings.colors);
  };
  /** Also called when the menu opens or play starts: with 'auto', the season may have turned. */
  const applyFete = () => {
    const next = resolveFete(settings.fete);
    if (next === fete && game) return;
    fete = next;
    game?.setFete(fete);
  };
  const applySpeed = () => {
    if (!game) return;
    game.autoSpeed = settings.speed === 'auto';
    game.speed = SPEED_FACTOR[settings.speed];
  };
  /** The whole scene from the settings: after a reset, a surprise, or if they changed during loading. */
  const applyAll = () => {
    if (!world || !game) return;
    world.setViewSize(settings.size);
    world.setStyle(settings.style);
    applySpeed();
    applyTheme();
    applyFete();
  };

  const session = new Session();
  /** The last timed session is over: the next Play starts a new one. */
  let sessionOver = false;
  let summary: { catches: number; minutes: number } | null = null;
  const vibrationSupported = typeof navigator.vibrate === 'function';
  const wakeLock = new ScreenWakeLock();
  const micSupported = !!navigator.mediaDevices?.getUserMedia;
  let mic: Mic | null = null;
  let playing = false;
  let played = false;
  /** Tablet on its stand: the screen rests between two automatic sessions. */
  let resting = false;
  let restUntil = 0;
  let restTimer = 0;

  // --- Menu -------------------------------------------------------------------

  const options = new Menu(
    { root: menu, themes: $('#themes'), tabs: $('#tabs'), panel: $('#tab-panel'), about: $('#about'), lang: $('#lang') },
    settings,
    {
      change, micSupported, vibrationSupported, previewVolume: () => voice.preview(), reset, surprise,
      activeFete: () => fete, stats: () => session.stats,
    },
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

  /** The small counter in a corner while the cat plays: catches, and minutes left in a timed session. */
  function renderHud(): void {
    hudEl.hidden = !playing || !settings.hud;
    if (hudEl.hidden) return;
    const time = session.timed ? ` · ${session.minutesLeft} min` : '';
    hudEl.textContent = `🐾 ${session.catches}${time}`;
  }

  const refreshMenu = () => {
    options.render();
    renderStats();
    renderSummary();
    playBtn.textContent = t(!game ? (bootStarted ? 'loading' : 'play') : played && !sessionOver ? 'resume' : 'play');
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
    if (key === 'lang') {
      void setLang(settings.lang).then(refreshMenu);
      return;
    }
    if (!world || !game) {
      // Still loading: the scene is built from the settings as they are once it is ready.
      changedWhileLoading = true;
      refreshMenu();
      return;
    }
    if (key === 'theme') applyTheme();
    if (key === 'animals' || key === 'colors') game.setPopulation(settings.animals, settings.colors);
    if (key === 'speed') applySpeed();
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
    requestRender();
  }

  /** Back to a single green lizard on stone, in the land theme, with the fête in season. */
  function reset(): void {
    resetSettings(settings);
    saveSettings(settings);
    changedWhileLoading = true;
    applyAll();
    refreshMenu();
    requestRender();
  }

  /** A random theme with two or three of its species, their colours, a ground and some hiding spots. */
  function surprise(): void {
    const theme = pickOne(THEMES);
    settings.theme = theme;
    const list = SPECIES[theme];
    for (const sp of list) settings.animals[sp.key] = 0;
    const picks = [...list].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
    let budget = 6;
    for (const sp of picks) {
      const n = Math.max(1, Math.min(sp.max, 1 + Math.floor(Math.random() * 2), budget));
      settings.animals[sp.key] = n;
      budget -= n;
      settings.colors[sp.key] = pickOne(sp.variants).id;
    }
    settings.ground[theme] = pickOne(GROUNDS[theme]);
    settings.covers[theme] = COVERS[theme].map((c) => c.kind).filter(() => Math.random() < 0.5);
    saveSettings(settings);
    changedWhileLoading = true;
    applyAll();
    refreshMenu();
    requestRender();
  }

  /** The text and the link (to this scene) for the share sheet, with a picture where the browser allows. */
  async function share(): Promise<void> {
    const cat = catName() || t('myCat');
    const text = session.catches
      ? tf('shareSession', { cat, catches: catches(session.catches) })
      : session.stats.total
        ? tf('shareTotal', { cat, catches: catches(session.stats.total) })
        : t('shareIntro');
    const url = `${location.origin}${langHome(currentLang())}?${presetQuery(settings)}`;
    const animals = SPECIES[settings.theme].filter((sp) => settings.animals[sp.key] > 0).map((sp) => ({ icon: sp.icon, n: settings.animals[sp.key] }));
    const picture = await shareCard({
      // The sentence without its trailing paw, which would wrap alone onto a line of its own.
      theme: settings.theme, cat, catches: session.catches || session.stats.total, line: text.replace(/\s*🐾$/u, ''), animals, site: SITE,
      rtl: document.documentElement.dir === 'rtl',
    });
    const file = picture ? new File([picture], 'meowtrix.png', { type: 'image/png' }) : null;
    if (navigator.share) {
      try {
        if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Meowtrix', text, url, files: [file] });
        else await navigator.share({ title: 'Meowtrix', text, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    // No share sheet (desktop): the text and link go to the clipboard, the picture to the downloads.
    if (file) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
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
    if (resting) stopRest();
    else if (!playing) return;
    playing = false;
    if (input) input.enabled = false;
    if (game) game.active = false;
    voice.setMuted(true);
    stopLoop();
    applyFete();
    requestRender();
    menu.classList.remove('hidden');
    holdBtn.hidden = true;
    renderHud();
    refreshMenu();
    playBtn.focus();
  }

  /** Time is up and the cat made its last catch (or gave up): show how it went, or rest until the next one. */
  function endSession(): void {
    summary = { catches: session.catches, minutes: Math.max(1, Math.round(session.elapsed / 60)) };
    sessionOver = true;
    if (game) game.tired = 0;
    if (settings.rest && settings.session) startRest();
    else openMenu();
  }

  /** The screen goes dark and quiet; a new session starts on its own when the time comes. A long press still opens the menu. */
  function startRest(): void {
    playing = false;
    resting = true;
    if (input) input.enabled = false;
    if (game) game.active = false;
    voice.setMuted(true);
    restUntil = Date.now() + settings.rest * 3_600_000;
    restEl.hidden = false;
    renderHud();
    stopLoop();
    updateRest();
    restTimer = window.setInterval(updateRest, 20_000);
  }

  function updateRest(): void {
    const left = restUntil - Date.now();
    if (left > 0) {
      restText.textContent = tf('nextSession', { time: timeLeft(left) });
      return;
    }
    stopRest();
    void play();
  }

  function stopRest(): void {
    clearInterval(restTimer);
    resting = false;
    restEl.hidden = true;
  }

  async function play(): Promise<void> {
    // Fullscreen and audio must start synchronously inside the click, even if the scene is still to come.
    enterFullscreen();
    const ctx = voice.init();
    if (!game || !input) {
      // Not built yet: Play shows the progress and the game starts as soon as it is ready.
      playWhenReady = true;
      playBtn.disabled = true;
      startBoot();
      return;
    }
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
    game.active = true;
    startLoop();
    renderHud();
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
    if (['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(e.key) && (playing || resting)) {
      e.preventDefault();
      openMenu();
    }
  });

  // Double-click with a mouse leaves fullscreen. Ignored for touch: a cat taps twice all the time.
  canvas.addEventListener('dblclick', () => {
    if (!playing || input?.lastType !== 'mouse') return;
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

  // The menu is usable from here on. The scene is built at the first touch or key, anywhere.
  refreshMenu();
  menu.classList.add('ready');
  function startBoot(): void {
    if (bootStarted) return;
    bootStarted = true;
    playBtn.classList.add('is-loading');
    refreshMenu();
    void boot();
  }
  document.addEventListener('pointerdown', startBoot, { once: true, passive: true });
  document.addEventListener('keydown', startBoot, { once: true });

  // --- Loop -------------------------------------------------------------------

  let last = 0;
  let perfTime = 0;
  let perfFrames = 0;
  /** Quality is adjusted at most this many times, then left alone. */
  let perfChecks = 0;
  let sceneShown = false;
  let hudSecond = -1;

  /** The first picture is there: fade the scene in behind the menu. */
  const showScene = () => {
    if (sceneShown) return;
    sceneShown = true;
    document.body.classList.add('scene-ready');
  };

  const frame = (now: number) => {
    if (!world || !game) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;

    if (playing) {
      if (session.update(dt)) endSession();
      else game.tired = session.tired;
      const second = Math.floor(session.elapsed);
      if (second !== hudSecond) {
        hudSecond = second;
        renderHud();
      }
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
    showScene();

    // While the cat plays, measure the frame rate a few times: a slow device gets a lighter
    // picture, a fast one that started modestly gets the full one.
    if (playing && perfChecks < 3 && now > 2000) {
      perfTime += dt;
      if (++perfFrames === 120) {
        const avg = perfTime / perfFrames;
        perfTime = perfFrames = 0;
        perfChecks++;
        const q = world.quality;
        if (avg > 1 / 40 && q > 0) world.setQuality((q - 1) as Quality);
        else if (avg < 1 / 57 && q < 2) world.setQuality((q + 1) as Quality);
        else perfChecks = 3;
      }
    }
  };

  /**
   * Builds the scene one piece per frame, so the menu stays responsive and the Play button shows
   * the progress: renderer, light, ground, hiding spots, each animal, the fête, then the shaders.
   * Every piece is a task of its own, short enough not to be felt as a freeze.
   */
  async function boot(): Promise<void> {
    const w = createWorld();
    if (!w) return;
    const counts = SPECIES[settings.theme].flatMap((sp) => Array<typeof sp.key>(settings.animals[sp.key]).fill(sp.key));
    const total = 7 + counts.length;
    let done = 0;
    const step = async () => {
      playBtn.style.setProperty('--progress', `${Math.round((++done / total) * 100)}%`);
      await nextFrame();
    };
    // Phones and tablets start a notch lower; the frame rate check raises it if they can take it.
    w.setQuality(matchMedia('(pointer: coarse)').matches ? 1 : 2);
    w.onNeedRender = requestRender;
    await step();
    w.buildEnvironment();
    await step();
    w.setViewSize(settings.size);
    w.setStyle(settings.style);
    w.setGround(settings.ground[settings.theme]);
    await step();
    const g = new Game(w, voice);
    g.autoSpeed = settings.speed === 'auto';
    g.speed = SPEED_FACTOR[settings.speed];
    const none = Object.fromEntries(Object.keys(settings.animals).map((k) => [k, 0])) as typeof settings.animals;
    g.setTheme(settings.theme, settings.covers[settings.theme], none, settings.colors);
    await step();
    // One animal per frame: a lizard or a koi is the heaviest thing to build.
    const partial = { ...none };
    for (const key of counts) {
      partial[key]++;
      g.setPopulation(partial, settings.colors);
      await step();
    }
    w.setFete(fete);
    await step();
    g.setFete(fete);
    await step();
    g.onCatch = (key) => {
      if (!playing) return;
      session.caught(key);
      renderHud();
      // A short buzz when a paw lands right on an animal.
      if (settings.vibration && vibrationSupported) navigator.vibrate(40);
    };
    // Shaders compile before the first picture, in the background where the GPU allows; a driver
    // that never answers must not hold the game, so the first picture compiles them then.
    try {
      await Promise.race([w.compile(), new Promise((resolve) => setTimeout(resolve, 4000))]);
    } catch {
      // Not supported here: the first picture compiles them instead.
    }
    await step();

    world = w;
    game = g;
    input = new PointerInput(canvas, w, g);
    if (changedWhileLoading) applyAll();
    session.setLength(settings.session);
    if (import.meta.env.DEV) Object.assign(window, { meowtrix: { world, game, session } });
    requestRender();

    playBtn.disabled = false;
    playBtn.classList.remove('is-loading');
    refreshMenu();
    if (playWhenReady) {
      playWhenReady = false;
      void play();
    }
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    world?.resize();
    requestRender();
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => game?.relayout(false), 400);
  });
  document.addEventListener('visibilitychange', () => {
    if (!world) return;
    if (document.hidden) {
      stopLoop();
      voice.suspend();
    } else {
      if (playing) startLoop();
      voice.resume();
    }
  });
}
