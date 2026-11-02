# Journal des versions

Les changements de Meowtrix, du plus récent au plus ancien. Le numéro de version est celui de
`package.json`, affiché en bas du menu.

Sur le site, la page [/changelog/](https://meowtrix.mbonnici.fr/changelog/) raconte la même chose en
anglais, pour les joueurs ; elle est écrite à partir de `seo/changelog.ts`. À chaque nouvelle version,
on complète les deux : le build refuse un numéro de version sans entrée dans `seo/changelog.ts`.

## 0.9.0 — 2 novembre 2026

Le jeu s'adapte au chat, le surprend, et la tablette peut jouer toute seule.

### Ajouté

- **Chenilles** (groupe « Petites bêtes ») : lentes même quand elles ont peur (`CATERPILLAR` dans
  `species.ts`, fuite à 0,45), pour les chatons et les vieux chats. Corps segmenté lofé sur une
  colonne très souple (`src/game/bug/caterpillar.ts`), onde de contraction qui parcourt le corps,
  petites pattes de chaque côté, avant qui se dresse. Trois robes : verte, rayée (monarque), laineuse.
- **Événements pendant le jeu** (`Game.updateEvents`, toutes les 50 à 130 s, menu fermé et hors
  fatigue) : un **visiteur** d'une espèce du thème absente de la liste entre par le bord, reste 25 à
  50 s et repart (`Brain.arrive` / `leave` / `gone`) ; ou l'**ombre** de quelque chose qui vole
  passe sur le sol (`src/game/shadow.ts`) et fait fuir tout le monde quand elle est au-dessus.
- **Éclat de prise** : une gerbe d'étincelles là où la patte attrape un animal
  (`src/game/burst.ts`, points additifs). La prise connaît maintenant son espèce et sa position
  (`Game.caught(key, x, y, z)`, `onCatch(key)`).
- **Vitesse Auto** (par défaut pour les nouveaux venus) : toutes les 30 s de jeu, beaucoup de
  touchers sans prise → les animaux ralentissent (jusqu'à 0,6), la plupart des touchers une prise →
  ils accélèrent (jusqu'à 1,45) (`Game.weighAuto`). Lent / normal / rapide restent.
- **Aléatoire** en haut de l'onglet Animaux : thème, deux ou trois espèces, robes, sol et
  cachettes au hasard (`surprise` dans `main.ts`).
- **Compteur à l'écran** pendant le jeu (`#hud`, en haut à gauche, discret) : prises et minutes
  restantes ; interrupteur dans Réglages (`hud`).
- **Tablette posée** (`rest`, 1 h / 2 h / 4 h, visible avec une durée de séance) : à la fin de la
  séance, écran noir avec l'heure de la prochaine (`#rest`), rendu arrêté, puis nouvelle séance
  toute seule. L'appui long ouvre toujours le menu.
- **Statistiques** en haut de Réglages dès la première prise : total, meilleure séance, proie
  préférée, barres des 7 derniers jours. `Session.stats` garde maintenant les prises par jour
  (14 jours) et par espèce.
- **Partage en image** : une carte carrée 1080 px (`src/share-card.ts`, canvas 2D) avec le nom du
  chat, le score, les animaux et l'adresse du site, envoyée avec le texte quand le navigateur
  accepte les fichiers (`navigator.canShare`) ; sinon le texte va dans le presse-papiers et l'image
  dans les téléchargements.
- **Tests** (Vitest, `npm test`, `tests/`) : dates des fêtes, migration des réglages sauvegardés,
  aller-retour des liens de partage. `fromSaved` est exporté pour cela.

### Modifié

- **Onglet Animaux** : les espèces présentes d'abord, en cartes ; les autres dans une grille
  d'icônes « Ajouter un animal » (un tap en met une). Plus de titres de groupe.
- **Nom du chat** et **Tablette posée** n'apparaissent qu'avec une durée de séance.
- **Qualité adaptative dans les deux sens** (`World.setQuality`, 3 niveaux : ratio de pixels 1 /
  1,5 / 2, ombres 1024 / 1536 / 2048) : les écrans tactiles démarrent au niveau moyen ; pendant le
  jeu, la cadence est mesurée jusqu'à trois fois et le niveau monte ou descend d'un cran.
- **Menu ouvert : une vingtaine d'images par seconde** au lieu de 60 (`IDLE_FRAME_MS`), la scène
  n'étant qu'un fond flouté.
- **Textures des sols en cache** (`makeGroundTexture`) : peintes une fois, plus jamais libérées.
- **Service worker** : `public/sw.js` devient `seo/sw.js`, écrit dans `dist/` par `seo/plugin.ts`
  avec la liste des fichiers construits et la version comme nom de cache. Tout est mis en cache à
  l'installation : deuxième visite instantanée et hors ligne.

### Nouvelles chaînes (44 langues)

`speed_auto`, `speed_autoHelp`, `addAnimal`, `surprise`, `rest`, `restHelp`, `rest_off`,
`nextSession`, `hud`, `hudHelp`, `stats`, `bestSession`, `favoritePrey`, `last7days`,
`caterpillars`, `caterpillars_desc`, `caterpillars_green`, `caterpillars_striped`,
`caterpillars_woolly`.

## 0.8.0 — 2 novembre 2026

Un menu plus simple et fait pour le téléphone, qui s'ouvre tout de suite.

### Ajouté

- **Bouton « Rien »** pour les fêtes : aucune décoration, même en saison. Le réglage se fait entre
  Auto, Rien et une fête ; Auto ne se désactivait plus qu'en le touchant une seconde fois, ce qu'il
  fallait deviner. Traduit dans les 44 langues (`fete_none`, `fete_noneHelp`).

### Modifié

- **Le menu s'affiche avant la scène 3D.** Jusqu'ici tout se construisait d'un bloc avant le
  premier dessin du menu : moteur de rendu, texture du sol, animaux, tenues de la fête, soit
  2,5 secondes mesurées dans Chrome sans accélération, pendant lesquelles on voyait un panneau vide
  et un bouton vert sans texte. Maintenant le menu est dessiné dès que sa langue est chargée, puis la
  scène se construit en quatre étapes (`boot` dans `main.ts`), avec une image entre chaque pour
  que le menu réponde ; le bouton Jouer indique « Chargement… » (clé `loading`, 44 langues) et se
  remplit à chaque étape. Un réglage changé pendant ce temps est appliqué à la fin
  (`changedWhileLoading`). La scène apparaît en fondu derrière le menu à sa première image.
- **Avant même le script**, les rangées du menu et le contenu de l'onglet se montrent en
  emplacements qui respirent, et le bouton Jouer porte une patte, le temps que le code arrive.
- **La rangée des fêtes quitte le haut du menu** : Auto, Rien, Noël, Halloween et Pâques sont
  maintenant une rubrique « Fête » de l'onglet Décor, entre les cachettes et la taille. Le haut du
  menu passe de douze boutons à sept (trois thèmes, quatre onglets).
- **Menu sur téléphone** (moins de 560 px de large, ou de haut) : sur un écran de 360 × 640, la
  liste n'avait plus qu'une soixantaine de pixels entre l'en-tête, les rangées de boutons et le pied
  du menu. Maintenant tout le panneau défile d'un bloc : les onglets restent collés en haut, le
  bouton Jouer en bas (`.play-bar`, nouveau dans `index.html`). Le pied du menu passe en
  `display: contents` pour que ses éléments se placent un par un : le compteur de prises remonte
  sous l'en-tête (ou, sans prise, Partager descend avec le reste), le conseil de sécurité, GitHub,
  la version et « Signaler un problème » viennent après le contenu de l'onglet.
- En portrait, le panneau prend tout l'écran (sans bord ni coins arrondis, avec les marges des
  encoches), et les cartes des animaux sont plus serrées ; les robes prennent toute la largeur.
- Changer d'onglet ou de thème remonte au début de l'onglet, sans faire réapparaître l'en-tête
  (`Menu.toTop`).

### Pour les développeurs

- three.js est dans son propre fichier (`three-*.js`, `manualChunks` dans `vite.config.ts`) :
  il reste en cache d'une version de Meowtrix à l'autre, et seul le code du jeu est retéléchargé.

## 0.7.0 — 2 novembre 2026

Référencement pour les assistants IA. Rien ne change pour les joueurs.

### Ajouté

- **Une version Markdown de chaque page** (`/index.md`, `/en/index.md`, `/de/water/index.md`…,
  264 pages plus `/changelog/index.md`), avec titre, description, texte, « comment jouer », questions
  fréquentes et liens. Chaque page HTML la signale (`<link rel="alternate" type="text/markdown">`),
  et nginx la sert à la place du HTML quand la requête demande `Accept: text/markdown`, comme le
  fait la fonction « Markdown for Agents » de Cloudflare (réservée à l'offre Pro).
- **`llms-full.txt`** : tout le texte du site en un fichier (pages en anglais, puis en français,
  puis les nouveautés). `llms.txt` signale ce fichier et les versions Markdown.

### Modifié

- **Le texte de chaque page est lisible sans JavaScript.** L'onglet Infos (présentation, comment
  jouer, questions fréquentes) était caché dans le HTML par l'attribut `hidden`, que beaucoup
  d'outils de lecture des assistants ignorent : un extracteur de type « mode lecture » ne gardait
  que 66 caractères de la page anglaise, contre 3 869 maintenant. Avec JavaScript, le texte reste
  dans son onglet comme avant (classe `js` posée dans le `<head>`, classe `open` sur l'onglet).
- nginx envoie `charset=utf-8` pour tous les textes (`llms.txt` partait sans), et `Vary: Accept`
  sur les pages, qui répondent en HTML ou en Markdown selon la demande.

## 0.6.1 — 2 novembre 2026

### Corrigé

- **Page des nouveautés** : les ronds de la frise sont exactement sur la ligne, quelle que soit la
  mise à l'échelle de l'écran (ils étaient décalés de 1 à 2 pixels à 125 %), et la ligne va du
  premier au dernier rond sans dépasser. Chaque rond est aussi aligné sur le titre de sa version.

### Pour les développeurs

- `seo/changelog.ts` accepte une rubrique « Fixed » (`fixed`) en plus de « New » et « Improved ».

## 0.6.0 — 2 novembre 2026

Meowtrix parle maintenant 44 langues.

### Ajouté

- **44 langues** pour le jeu comme pour les pages : français, anglais, espagnol, portugais (Brésil
  et Portugal), allemand, italien, néerlandais, suédois, danois, norvégien, finnois, estonien,
  letton, lituanien, polonais, tchèque, slovaque, hongrois, roumain, bulgare, grec, croate, serbe,
  slovène, ukrainien, russe, turc, arabe, hébreu, persan, japonais, coréen, chinois simplifié et
  traditionnel, hindi, bengali, ourdou, indonésien, malais, thaï, vietnamien, filipino et swahili.
  À la première visite, le menu s'ouvre dans la langue du navigateur.
- **Pages de référencement dans chaque langue** : 264 pages au total (accueil, Eau, Ciel, Noël,
  Halloween, Pâques), à `/de/`, `/ja/water/`, `/pt-br/christmas/`… Le français reste à la racine
  (`/`, `/eau/`…). Chaque page a son titre, sa description, ses questions fréquentes et des liens
  vers ses 43 traductions, pour les moteurs de recherche (`hreflang`) comme pour les visiteurs
  (onglet Infos).
- **Nouveau menu des langues** : un bouton avec un globe, qui ouvre la liste de toutes les langues
  avec une recherche. Chaque langue est écrite dans sa propre langue, avec son nom dans la langue
  du menu à côté (« Deutsch — Allemand »). La recherche trouve une langue par son nom, son nom
  dans la langue du menu ou en anglais, ou son code, sans tenir compte des accents (« allem »,
  « german », « deutsch », « de »). Il se manie à la souris, au doigt, au clavier ou à la
  télécommande.
- **Page des nouveautés** en anglais, [/changelog/](https://meowtrix.mbonnici.fr/changelog/), avec
  chaque version et sa date. Le numéro de version en bas du menu y mène.
- **Écriture de droite à gauche** pour l'arabe, l'hébreu, le persan et l'ourdou : tout le menu
  est inversé.

### Modifié

- Une recherche dans une langue que le site n'a pas mène désormais à la version anglaise
  (`x-default`), et non plus à la française.
- Les boutons du menu (thèmes, fêtes, onglets) se resserrent quand leurs mots sont trop longs dans
  une langue : icône au-dessus du texte, puis texte plus petit. En chinois, en japonais et en
  coréen, un mot n'est plus coupé au milieu.
- Le lien partagé par le bouton Partager mène à l'accueil dans la langue du menu.
- Le `sitemap.xml`, plus volumineux, est désormais compressé par le serveur.

### Pour les développeurs

- Les langues sont déclarées dans `src/langs.ts`. Les textes de l'interface sont dans
  `src/locales/<langue>.ts`, chargés seulement quand la langue est choisie (environ 3,5 Ko
  chacun) ; le français et l'anglais restent dans `src/i18n.ts`. Les textes des pages sont dans
  `seo/locales/<langue>.ts`. Le build échoue si une langue est incomplète.

## 0.5.0 — 1er novembre 2026

- **Thème Ciel** : papillons, lucioles, plumes portées par le vent et un point laser qui peut être
  attrapé, sur une prairie, au crépuscule ou au clair de lune.
- **Style Pixel**, façon jeu vidéo rétro.
- **Séances minutées** de 5, 10 ou 15 minutes : dans la dernière minute, les animaux fatiguent
  pour que le chat termine sur une prise. Compteur de prises, nom du chat et résumé de fin de
  séance.
- **Fête automatique** selon la date (réglage Auto, par défaut).
- **Liens de partage** qui recréent la scène (`?theme=sky&animals=…`).
- **Référencement** : une page par thème et par fête en français et en anglais, avec image
  d'aperçu, `sitemap.xml`, `robots.txt` ouvert aux assistants IA, `llms.txt` et une vraie page 404.

## 0.4.0 — 1er novembre 2026

- **Fêtes** : Noël (neige, bonnets, chaussette), Halloween (citrouilles, chauves-souris, chapeaux
  de sorcière) et Pâques (oreilles de lapin, œufs géants), sur tous les thèmes.

## 0.3.0 — 1er novembre 2026

- **Thème Eau** : poissons rouges, carpes koï, sardines en banc, truites, saumons et bébés requins,
  sur un étang, un lagon ou une rivière.
- **De nouveaux animaux sur terre** : grenouilles, sauterelles, coccinelles, scarabées, cafards,
  écureuils et oiseaux, chacun avec plusieurs robes.
- **De nouvelles cachettes** : vieille botte, herbe, tulipes, nénuphars, rochers et algues.

## Premières versions — 31 octobre 2026

- Des lézards en 3D qui se promènent, se cachent sous les feuilles et les pierres et détalent
  sous la patte, puis des mouches et des souris. Sons créés en direct, réaction aux bruits du
  micro, plein écran, installation comme application, menu en français et en anglais.
