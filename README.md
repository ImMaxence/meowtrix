# Meowtrix

Un site plein écran pour faire jouer les chats : des animaux en 3D (Three.js) qui se promènent,
se cachent, et détalent quand une patte les touche. Trois thèmes : **Terre** (lézards, grenouilles,
insectes, souris, écureuils, oiseaux), **Eau** (poissons rouges, carpes koï, sardines en banc,
truites, saumons, bébés requins) et **Ciel** (papillons, lucioles, plumes, point laser), à habiller
pour **Noël**, **Halloween** ou **Pâques** (automatiquement à la bonne période), en 3D ou en style
**Pixel**. Des séances minutées finissent sur une prise, un compteur garde le score. Les sons sont
synthétisés en direct (Web Audio API) et, si on l'autorise, le micro fait sursauter les animaux aux
bruits de la pièce.

**👉 Jouer : [meowtrix.mbonnici.fr](https://meowtrix.mbonnici.fr/)**

![Lézards, grenouille, insectes autour d'une feuille, d'une pierre, d'une touffe d'herbe et d'une vieille botte](docs/screenshots/terre.png)

![Thème Eau : carpes koï, poisson rouge, truite et banc de sardines entre nénuphars, rocher et algues](docs/screenshots/eau.png)

![Thème Ciel : papillons monarque, morpho, piéride et paon du jour, plume de geai et point laser sur une prairie fleurie](docs/screenshots/ciel.png)

![Style Pixel : lézards, grenouille, souris et coccinelles en gros pixels sur le sable](docs/screenshots/pixel.png)

| Noël | Halloween | Pâques |
| --- | --- | --- |
| ![Neige, chaussette de Noël et animaux en bonnet de Père Noël](docs/screenshots/noel.png) | ![Citrouilles sculptées, chauves-souris et animaux en chapeau de sorcière](docs/screenshots/halloween.png) | ![Œufs de Pâques géants, tulipes et animaux avec des oreilles de lapin](docs/screenshots/paques.png) |

| Menu — Animaux | Menu — Ciel | Menu — Réglages |
| --- | --- | --- |
| ![Onglet Animaux : nombre et robe de chaque espèce](docs/screenshots/menu-animaux.png) | ![Les papillons et lucioles du thème Ciel](docs/screenshots/menu-ciel.png) | ![Onglet Réglages : durée de la séance et nom du chat](docs/screenshots/menu-reglages.png) |

## Ce qu'il y a dedans

- **Terre** : lézards, lézards à longue queue, grenouilles, mouches, coccinelles, scarabées,
  sauterelles, cafards, souris, écureuils, oiseaux. Chaque espèce a plusieurs robes au choix.
- **Eau** : poissons rouges, carpes koï, sardines (en banc), truites, saumons, bébés requins.
  Un toucher fait des ronds dans l'eau ; les koï viennent gober en surface ; les poissons
  contournent les rochers ou plongent dessous pour s'y cacher.
- **Ciel** : papillons (monarque, morpho, piéride, paon du jour, citron) qui volettent et ouvrent
  leurs ailes au soleil, lucioles qui clignotent, plumes que le vent fait glisser et s'envoler, et un
  point laser rouge, vert ou bleu qui bouge comme une main : il file, s'arrête net, tourne en rond,
  sort de l'écran… et reste un instant sous la patte qui l'attrape.
- **Sols** : roche, sable, nuit, béton, parquet, pelouse ; sous l'eau étang, lagon, rivière ; et
  dans le ciel prairie, crépuscule, clair de lune (la lumière suit).
- **Cachettes** (à combiner) : feuilles, pierres, herbe, tulipes, vieille botte (assez grande pour
  qu'un lézard ou une souris y disparaisse) ; nénuphars, rochers, algues.
- **Fêtes** (sur les trois thèmes) : Noël (bonnets, neige, chaussette où se cacher), Halloween
  (chapeaux de sorcière, citrouilles lumineuses, chauves-souris, braises), Pâques (oreilles de lapin,
  œufs géants posés sur des œufs en chocolat, pétales). Avec **Auto** (par défaut), la fête du
  moment s'active toute seule : Halloween du 18 octobre au 2 novembre, Noël du 1er décembre au
  6 janvier, Pâques dix jours avant et une semaine après.
- **Style** : 3D classique, ou **Pixel** (image en gros pixels, peu de couleurs, tramage).
- **Séance** : libre, ou 5, 10, 15 minutes. Dans la dernière minute les animaux fatiguent (plus
  lents, ne se cachent plus, plus faciles à toucher) et la séance se termine juste après une prise,
  avec un résumé. Un **compteur de prises** (séance et total, avec le nom du chat) s'affiche dans le
  menu.
- **Partager** : envoie le score et un lien qui recrée la scène (`?theme=sky&animals=laser.red:1…`,
  voir `src/preset.ts`).
- **Réglages** : vitesse, volume des sons (curseur), réaction aux bruits du micro, vibrations quand
  une patte attrape un animal, et un bouton pour tout remettre par défaut.
- En bas du menu : la version, le code sur GitHub et un bouton **Signaler un problème** qui ouvre
  un ticket GitHub pré-rempli.

## Référencement

Le jeu est une seule application, mais le build écrit une page par thème et par fête dans chacune
des 44 langues de `src/langs.ts` : le français à la racine (`/`, `/eau/`, `/ciel/`, `/noel/`,
`/halloween/`, `/paques/`), les autres sous leur code (`/en/water/`, `/de/sky/`, `/pt-br/christmas/`…).
Chaque page a son titre, sa description, son image d'aperçu (`public/og/`), son texte (onglet
**Infos**, lisible sans JavaScript par les moteurs et les assistants IA), les liens `hreflang` vers
ses 43 traductions et le réglage qu'elle applique. Les textes sont dans `seo/locales/<langue>.ts`,
les pages dans `seo/pages.ts` ; `seo/plugin.ts` génère aussi `sitemap.xml` et `llms.txt`.

L'interface du jeu est traduite dans les mêmes langues : le français et l'anglais sont dans
`src/i18n.ts`, les autres dans `src/locales/<langue>.ts`, chargées seulement quand on les choisit.
L'arabe, l'hébreu, le persan et l'ourdou s'affichent de droite à gauche. Pour ajouter une langue :
une ligne dans `src/langs.ts`, un fichier dans `src/locales/` et un dans `seo/locales/` (le build
refuse une langue incomplète).
`public/robots.txt` autorise les moteurs et les robots des assistants IA, et nginx renvoie une vraie
erreur 404 pour les adresses inconnues.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérifie les types et produit dist/
```

La version affichée en bas du menu vient de `package.json` ; elle mène à la page `/changelog/`, qui
présente aux joueurs, en anglais, ce que chaque version a apporté (écrite à partir de
`seo/changelog.ts`). Le détail en français, avec les changements techniques, est dans
[CHANGELOG.md](CHANGELOG.md). Le build échoue si la version de `package.json` n'a pas son entrée dans
`seo/changelog.ts`.

## Docker

```bash
# Test local sur http://localhost:8787
docker compose -f docker-compose.yml -f compose.local.yml up --build
```

Sur Coolify : ressource **Docker Compose** pointant sur ce dépôt (`docker-compose.yml`), domaine
`https://meowtrix.mbonnici.fr` sur le service `meowtrix` (port 80). Le HTTPS est nécessaire pour le micro.

## Structure

| Dossier | Rôle |
| --- | --- |
| `src/catalog.ts` | Thèmes, espèces (icône, nombre max, robes), sols et cachettes de chaque thème |
| `src/game/body/` | Briques communes : colonne vertébrale simulée, peau lofée, IK des pattes |
| `src/game/creature.ts` | Base des animaux pilotés par un cerveau (locomotion, collisions) |
| `src/game/brain.ts`, `species.ts` | Comportement : errance, alerte, fuite, cachettes ; réglages par espèce |
| `src/game/lizard/` | Lézards (et lézard à longue queue) : corps, pattes, langue, peau procédurale |
| `src/game/mammal/` | Souris et écureuil : un même corps paramétré, fourrures peintes |
| `src/game/bug/` | Cafard et scarabée : carapace, six pattes, antennes |
| `src/game/hopper/` | Grenouille et sauterelle : déplacement par bonds |
| `src/game/flyer/` | Mouche, coccinelle, oiseau : vol, atterrissage, marche, toilettage |
| `src/game/sky/` | Thème Ciel : papillons et lucioles (sur le moteur des volants), plume et point laser (jouets) |
| `src/game/fish/` | Poissons : nage ondulante, nageoires, banc de sardines |
| `src/game/covers/` | Cachettes : feuilles qui se soulèvent, pierres, botte, herbe, tulipes, nénuphars, algues, et celles des fêtes |
| `src/game/fete.ts` | Fêtes : tenues des animaux, neige, pétales, braises, chauves-souris, lumière |
| `src/game/ground.ts`, `water.ts` | Textures des sols ; surface, reflets et vaguelettes du thème Eau |
| `src/game/game.ts` | Population, entrées et sons de toute la scène |
| `src/game/world.ts`, `pixel.ts` | Scène, caméra, lumière, sol ; rendu en style Pixel |
| `src/audio/` | Sons synthétisés et écoute du micro |
| `src/menu.ts` | Menu : Terre / Eau / Ciel, fêtes, onglets Animaux, Décor, Réglages, Infos |
| `src/session.ts`, `preset.ts` | Séance minutée et compteur de prises ; réglages dans un lien |
| `seo/` | Pages par thème et par langue, sitemap, llms.txt (voir Référencement) |
| `public/` | Manifeste PWA, service worker, icônes (`npm run icons` pour les régénérer), images d'aperçu, robots.txt, page 404 |
