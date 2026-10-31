export type Lang = 'fr' | 'en';

const fr = {
  tagline: 'Un terrain de chasse pour votre chat',
  play: 'Jouer',
  resume: 'Reprendre',
  language: 'Langue',
  lizard: 'Lézard',
  count: 'Nombre de lézards',
  covers: 'Cachettes',
  covers_none: 'Aucune',
  covers_leaves: 'Feuilles',
  covers_stones: 'Pierres',
  covers_both: 'Les deux',
  size: 'Taille',
  ground: 'Décor',
  sound: 'Sons',
  mic: 'Réagir aux bruits (micro)',
  on: 'Oui',
  off: 'Non',
  skin_green: 'Anolis vert',
  skin_gecko: 'Gecko léopard',
  skin_skink: 'Scinque à queue bleue',
  skin_desert: 'Lézard des sables',
  size_small: 'Petit',
  size_medium: 'Moyen',
  size_large: 'Grand',
  ground_stone: 'Roche',
  ground_sand: 'Sable',
  ground_night: 'Nuit',
  micHelp: 'Le lézard sursaute quand ça fait du bruit. Rien n’est enregistré.',
  holdHint: 'Pour revenir au menu, maintenez le bouton en haut à droite.',
  holdHintMouse: 'Double-clic pour quitter le plein écran et revenir au menu.',
  exitFullscreen: 'Quitter le plein écran',
  holdLabel: 'Maintenir pour ouvrir le menu',
  micDenied: 'Micro refusé : le lézard ne réagira pas aux bruits.',
  micUnavailable: 'Pas de micro disponible : le lézard ne réagira pas aux bruits.',
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
  lizard: 'Lizard',
  count: 'Number of lizards',
  covers: 'Hiding spots',
  covers_none: 'None',
  covers_leaves: 'Leaves',
  covers_stones: 'Stones',
  covers_both: 'Both',
  size: 'Size',
  ground: 'Scenery',
  sound: 'Sounds',
  mic: 'React to noises (microphone)',
  on: 'On',
  off: 'Off',
  skin_green: 'Green anole',
  skin_gecko: 'Leopard gecko',
  skin_skink: 'Blue-tailed skink',
  skin_desert: 'Sand lizard',
  size_small: 'Small',
  size_medium: 'Medium',
  size_large: 'Large',
  ground_stone: 'Stone',
  ground_sand: 'Sand',
  ground_night: 'Night',
  micHelp: 'The lizard startles at loud noises. Nothing is recorded.',
  holdHint: 'To get back to the menu, hold the button in the top right corner.',
  holdHintMouse: 'Double-click to leave fullscreen and get back to the menu.',
  exitFullscreen: 'Exit fullscreen',
  holdLabel: 'Hold to open the menu',
  micDenied: 'Microphone blocked: the lizard won’t react to noises.',
  micUnavailable: 'No microphone available: the lizard won’t react to noises.',
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
