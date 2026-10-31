export type Lang = 'fr' | 'en';

const fr = {
  tagline: 'Un terrain de chasse pour votre chat',
  play: 'Jouer',
  resume: 'Reprendre',
  language: 'Langue',
  tab_animals: 'Animaux',
  tab_scene: 'Décor',
  tab_game: 'Réglages',
  lizards: 'Lézards',
  lizards_desc: 'Se faufile, hoche la tête, se cache',
  mice: 'Souris',
  mice_desc: 'Trottine le long des bords, se dresse',
  flies: 'Mouches',
  flies_desc: 'Vole en zigzag et se pose partout',
  less: 'Moins',
  more: 'Plus',
  skin: 'Robe',
  skin_green: 'Anolis vert',
  skin_gecko: 'Gecko léopard',
  skin_skink: 'Scinque à queue bleue',
  skin_desert: 'Lézard des sables',
  ground: 'Sol',
  ground_stone: 'Roche',
  ground_sand: 'Sable',
  ground_night: 'Nuit',
  covers: 'Cachettes',
  covers_none: 'Aucune',
  covers_leaves: 'Feuilles',
  covers_stones: 'Pierres',
  covers_both: 'Les deux',
  size: 'Taille des animaux',
  size_small: 'Petits',
  size_medium: 'Moyens',
  size_large: 'Grands',
  speed: 'Vitesse',
  speed_slow: 'Lent',
  speed_normal: 'Normal',
  speed_fast: 'Rapide',
  sound: 'Sons',
  soundHelp: 'Pas, cris et bourdonnements',
  mic: 'Réagir aux bruits',
  micHelp: 'Avec le micro, les animaux sursautent quand ça fait du bruit. Rien n’est enregistré.',
  holdHint: 'Pour revenir au menu, maintenez le bouton en haut à droite.',
  holdHintMouse: 'Double-clic pour quitter le plein écran et revenir au menu.',
  holdLabel: 'Maintenir pour ouvrir le menu',
  exitFullscreen: 'Quitter le plein écran',
  micDenied: 'Micro refusé : les animaux ne réagiront pas aux bruits.',
  micUnavailable: 'Pas de micro disponible : les animaux ne réagiront pas aux bruits.',
  installIos: 'Pour un vrai plein écran sur iPhone et iPad : bouton Partager, puis « Sur l’écran d’accueil ».',
  install: 'Installer l’application',
  safety: 'Restez près de votre chat pendant qu’il joue et protégez l’écran de ses griffes.',
  noWebgl: 'Ce navigateur ne gère pas la 3D (WebGL). Essayez un navigateur plus récent.',
};

type Dict = Record<keyof typeof fr, string>;

const en: Dict = {
  tagline: 'A hunting ground for your cat',
  play: 'Play',
  resume: 'Resume',
  language: 'Language',
  tab_animals: 'Animals',
  tab_scene: 'Scenery',
  tab_game: 'Settings',
  lizards: 'Lizards',
  lizards_desc: 'Darts around, bobs its head, hides',
  mice: 'Mice',
  mice_desc: 'Scurries along the edges, rears up',
  flies: 'Flies',
  flies_desc: 'Zigzags around and lands anywhere',
  less: 'Fewer',
  more: 'More',
  skin: 'Colours',
  skin_green: 'Green anole',
  skin_gecko: 'Leopard gecko',
  skin_skink: 'Blue-tailed skink',
  skin_desert: 'Sand lizard',
  ground: 'Ground',
  ground_stone: 'Stone',
  ground_sand: 'Sand',
  ground_night: 'Night',
  covers: 'Hiding spots',
  covers_none: 'None',
  covers_leaves: 'Leaves',
  covers_stones: 'Stones',
  covers_both: 'Both',
  size: 'Animal size',
  size_small: 'Small',
  size_medium: 'Medium',
  size_large: 'Large',
  speed: 'Speed',
  speed_slow: 'Slow',
  speed_normal: 'Normal',
  speed_fast: 'Fast',
  sound: 'Sounds',
  soundHelp: 'Footsteps, calls and buzzing',
  mic: 'React to noises',
  micHelp: 'With the microphone, the animals startle at loud noises. Nothing is recorded.',
  holdHint: 'To get back to the menu, hold the button in the top right corner.',
  holdHintMouse: 'Double-click to leave fullscreen and get back to the menu.',
  holdLabel: 'Hold to open the menu',
  exitFullscreen: 'Exit fullscreen',
  micDenied: 'Microphone blocked: the animals won’t react to noises.',
  micUnavailable: 'No microphone available: the animals won’t react to noises.',
  installIos: 'For true fullscreen on iPhone and iPad: tap Share, then “Add to Home Screen”.',
  install: 'Install the app',
  safety: 'Stay close to your cat while it plays and protect the screen from its claws.',
  noWebgl: 'This browser does not support 3D (WebGL). Please try a more recent browser.',
};

export type Key = keyof Dict;

const DICTS: Record<Lang, Dict> = { fr, en };
let current: Lang = 'fr';

export const t = (key: Key): string => DICTS[current][key];

export const detectLang = (): Lang => (navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en');

/** Switches language and re-translates every [data-i18n] / [data-i18n-aria] element. */
export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as Key));
  });
}
