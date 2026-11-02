# Journal des versions

Les changements de Meowtrix, du plus récent au plus ancien. Le numéro de version est celui de
`package.json`, affiché en bas du menu.

Sur le site, la page [/changelog/](https://meowtrix.mbonnici.fr/changelog/) raconte la même chose en
anglais, pour les joueurs ; elle est écrite à partir de `seo/changelog.ts`. À chaque nouvelle version,
on complète les deux : le build refuse un numéro de version sans entrée dans `seo/changelog.ts`.

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
