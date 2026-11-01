// The site's pages for search engines and AI assistants: one per theme and fête, in French and
// English. Each is the same app with its own title, description, picture, text and preset
// (see seo/plugin.ts, which writes them at build time).

export const SITE = 'https://meowtrix.mbonnici.fr';
export const REPO = 'https://github.com/ImMaxence/meowtrix';

export type PageLang = 'fr' | 'en';

export interface Page {
  path: string;
  lang: PageLang;
  /** The same page in the other language. */
  alt: string;
  /** Short name for links between pages. */
  name: string;
  /** Settings the page applies (see src/preset.ts). */
  preset: string;
  title: string;
  description: string;
  /** Picture for link previews, 1200×630. */
  image: string;
  imageAlt: string;
  tagline: string;
  /** The article shown in the menu's About tab (HTML). */
  body: string;
  faq?: readonly (readonly [string, string])[];
}

const FAQ_FR = [
  ['Quel jeu sur tablette pour mon chat ?',
    'Un jeu où quelque chose de petit bouge par à-coups, s’arrête et se cache : c’est ce qui réveille l’instinct de chasse. Meowtrix propose des lézards, des souris, des insectes, des oiseaux, des poissons, des papillons, des plumes et un point laser qui se comportent ainsi, avec des sons. Essayez-en plusieurs : chaque chat a ses préférés.'],
  ['Les jeux sur écran sont-ils bons pour les chats ?',
    'Ils occupent bien un chat d’intérieur, à condition de rester un jeu parmi d’autres. Alternez avec de vrais jouets qu’il peut attraper et mordre, restez près de lui et arrêtez si l’écran semble le frustrer.'],
  ['Combien de temps doit durer une séance ?',
    'Mieux vaut plusieurs séances courtes, de 5 à 15 minutes, qu’une longue partie. Dans les réglages, choisissez une durée : pendant la dernière minute, les animaux fatiguent pour que votre chat termine sur une prise, puis Meowtrix affiche son score. Une friandise juste après conclut bien la chasse.'],
  ['Comment protéger l’écran des griffes ?',
    'Un verre trempé ou un film de protection suffit en général, et des griffes coupées régulièrement aident aussi. Posez l’appareil bien à plat, sur une surface stable.'],
  ['Est-ce que ça marche sur la télé ?',
    'Oui : ouvrez meowtrix.mbonnici.fr dans le navigateur de la télé, ou diffusez l’onglet depuis un ordinateur. Sur une télé, le chat regarde et suit les animaux, mais ne peut pas les toucher.'],
  ['Pourquoi un point laser vert ou bleu ?',
    'Les chats voient mieux le bleu et le vert que le rouge ; le rouge marche aussi, car c’est surtout le mouvement qui compte. Contrairement à un vrai laser, ce point peut être attrapé : il reste un instant sous la patte, et la prise est comptée.'],
  ['Mon chat ne réagit pas, que faire ?',
    'Montez un peu le son, choisissez des animaux plus grands (onglet Décor) ou une vitesse plus lente, et tamisez la lumière. Certains chats préfèrent les souris, d’autres les poissons ou le point laser.'],
  ['C’est vraiment gratuit ? Et mes données ?',
    'Oui, gratuit et sans publicité, sans compte ni traceur : les réglages restent sur votre appareil. Le micro est facultatif et sert seulement à faire sursauter les animaux quand il y a du bruit ; rien n’est enregistré ni envoyé.'],
] as const;

const FAQ_EN = [
  ['What is a good tablet game for my cat?',
    'One where something small moves in bursts, stops and hides: that is what wakes up the hunting instinct. Meowtrix has lizards, mice, insects, birds, fish, butterflies, feathers and a laser dot that all behave this way, with sounds. Try a few: every cat has its favourites.'],
  ['Are screen games good for cats?',
    'They keep an indoor cat busy, as long as they stay one game among others. Alternate with real toys it can catch and bite, stay close by, and stop if the screen seems to frustrate it.'],
  ['How long should a play session last?',
    'Several short sessions of 5 to 15 minutes are better than one long one. Pick a length in the settings: in the last minute the animals tire so your cat ends on a catch, then Meowtrix shows its score. A treat right after is a good way to end the hunt.'],
  ['How do I protect the screen from claws?',
    'A tempered glass or a screen protector is usually enough, and trimmed claws help too. Lay the device flat on a steady surface.'],
  ['Does it work on a TV?',
    'Yes: open meowtrix.mbonnici.fr in the TV’s browser, or cast the tab from a computer. On a TV the cat watches and follows the animals, but cannot touch them.'],
  ['Why a green or blue laser dot?',
    'Cats see blue and green better than red; red works too, because movement is what matters most. Unlike a real laser, this dot can be caught: it stays under the paw for a moment and the catch is counted.'],
  ['My cat doesn’t react. What can I do?',
    'Turn the sound up a little, pick bigger animals (Scenery tab) or a slower speed, and dim the lights. Some cats prefer mice, others fish or the laser dot.'],
  ['Is it really free? What about my data?',
    'Yes: free, no ads, no account, no tracking. Your settings stay on your device. The microphone is optional and only makes the animals startle at loud noises; nothing is recorded or sent.'],
] as const;

const HOW_FR = `<h3>Comment jouer</h3>
<ol>
<li>Posez la tablette ou le téléphone à plat, ou ouvrez la page sur la télé.</li>
<li>Choisissez les animaux, leur nombre, leur robe et le décor, puis touchez « Jouer ».</li>
<li>Pour revenir au menu, maintenez le bouton en haut à droite : une patte ne peut pas l’ouvrir par accident.</li>
</ol>`;

const HOW_EN = `<h3>How to play</h3>
<ol>
<li>Lay the tablet or phone flat, or open the page on the TV.</li>
<li>Pick the animals, how many, their colours and the scenery, then tap “Play”.</li>
<li>To get back to the menu, hold the button in the top right corner: a paw can’t open it by accident.</li>
</ol>`;

const fr = (p: Omit<Page, 'lang' | 'tagline'>): Page => ({ ...p, lang: 'fr', tagline: 'Un terrain de chasse pour votre chat' });
const en = (p: Omit<Page, 'lang' | 'tagline'>): Page => ({ ...p, lang: 'en', tagline: 'A hunting ground for your cat' });

export const PAGES: readonly Page[] = [
  fr({
    path: '/', alt: '/en/', name: 'Accueil', preset: '',
    title: 'Meowtrix – Jeu gratuit pour chat sur tablette, téléphone et TV',
    description: 'Lézards, souris, poissons, papillons, point laser : un jeu en 3D que votre chat chasse sur l’écran. Gratuit, sans pub ni appli, sur tablette ou télé.',
    image: '/og/home.jpg', imageAlt: 'Lézards, grenouille et insectes en 3D entre une feuille, une pierre et une vieille botte',
    body: `<h2>Un jeu gratuit pour chat, sur tablette, téléphone ou télé</h2>
<p>Meowtrix transforme l’écran en terrain de chasse : des animaux en 3D se promènent, se cachent et détalent quand une patte les touche. C’est gratuit, sans publicité, sans compte et sans application à installer : la page s’ouvre dans le navigateur et passe en plein écran.</p>
<h3>Trois mondes à chasser</h3>
<ul>
<li><strong>Terre</strong> : lézards, grenouilles, mouches, coccinelles, scarabées, sauterelles, cafards, souris, écureuils et oiseaux, qui se cachent sous les feuilles, les pierres ou dans une vieille botte.</li>
<li><strong><a href="/eau/">Eau</a></strong> : poissons rouges, carpes koï, sardines en banc, truites, saumons et bébés requins ; chaque coup de patte fait des ronds dans l’eau.</li>
<li><strong><a href="/ciel/">Ciel</a></strong> : papillons, lucioles, plumes portées par le vent et un point laser, en plein jour, au crépuscule ou au clair de lune.</li>
</ul>
<p>Pour les fêtes, tout s’habille tout seul à la bonne période : <a href="/noel/">Noël</a> (bonnets et neige), <a href="/halloween/">Halloween</a> (chapeaux de sorcière et citrouilles) et <a href="/paques/">Pâques</a> (oreilles de lapin et œufs géants). Le style Pixel donne un air de jeu vidéo rétro.</p>
<h3>Pensé pour le bien-être du chat</h3>
<p>Un minuteur propose des séances de 5, 10 ou 15 minutes ; à la fin, les animaux fatiguent pour que le chat termine sur une prise. Un compteur garde ses prises, à partager avec ses amis. Les sons sont créés en direct et, si vous l’autorisez, le micro fait sursauter les animaux aux bruits de la pièce.</p>
${HOW_FR}`,
    faq: FAQ_FR,
  }),
  fr({
    path: '/eau/', alt: '/en/water/', name: 'Eau', preset: 'theme=water',
    title: 'Jeu de poissons pour chat sur tablette – Meowtrix',
    description: 'Poissons rouges, carpes koï, sardines en banc et bébés requins nagent sous l’eau : un jeu de pêche gratuit pour votre chat, sur tablette, téléphone ou télé.',
    image: '/og/water.jpg', imageAlt: 'Carpes koï, poisson rouge, truite et banc de sardines entre nénuphars, rocher et algues',
    body: `<h2>Des poissons à pêcher pour votre chat</h2>
<p>Dans le thème Eau, des poissons en 3D nagent sous une surface qui ondule et scintille. Les poissons rouges, curieux, font des bulles ; les carpes koï glissent lentement et viennent gober en surface ; les sardines nagent en banc serré et s’éparpillent d’un coup ; truites et saumons filent se cacher sous les rochers ; les bébés requins patrouillent, aileron dressé.</p>
<p>Chaque coup de patte fait des ronds dans l’eau et un petit plouf. Les poissons contournent les rochers, plongent dessous pour s’y cacher et ressortent quand le calme revient.</p>
<h3>Les décors</h3>
<p>Un étang, un lagon ou une rivière, avec des nénuphars, des rochers et des algues où se cacher. Chaque poisson a plusieurs robes : kohaku, showa ou ogon pour les koï, arc-en-ciel ou fario pour les truites, requin zèbre ou requin-baleine…</p>
${HOW_FR}`,
  }),
  fr({
    path: '/ciel/', alt: '/en/sky/', name: 'Ciel', preset: 'theme=sky',
    title: 'Papillons, plumes et point laser pour chat – Meowtrix',
    description: 'Des papillons qui volettent, des lucioles qui clignotent, des plumes dans le vent et un point laser : un jeu gratuit pour chat, sur tablette, téléphone ou télé.',
    image: '/og/sky.jpg', imageAlt: 'Papillons, plume et point laser sur une prairie fleurie',
    body: `<h2>Papillons, lucioles, plumes et point laser</h2>
<p>Le thème Ciel réunit ce qui vole, flotte et file. Les papillons (monarque, morpho bleu, piéride du chou, paon du jour, citron) volettent en zigzag, se posent et ouvrent leurs ailes au soleil. Les lucioles flottent en clignotant, superbes au clair de lune. Les plumes tombent en se balançant, puis le vent les fait glisser et s’envoler.</p>
<h3>Un point laser qui se laisse attraper</h3>
<p>Le point laser bouge comme une vraie main : il file, s’arrête net en tremblant un peu, tourne en rond, s’approche lentement, sort de l’écran et revient. Il s’enfuit quand une patte approche, mais contrairement à un vrai laser, votre chat peut l’attraper : le point reste un instant sous la patte, et la prise compte. Rouge, vert ou bleu, au choix.</p>
<h3>Les décors</h3>
<p>Une prairie fleurie en plein jour, la lumière dorée du crépuscule, ou le clair de lune pour voir briller les lucioles et le laser. Des tulipes, des touffes d’herbe et des pierres complètent le décor.</p>
${HOW_FR}`,
  }),
  fr({
    path: '/noel/', alt: '/en/christmas/', name: 'Noël', preset: 'fete=christmas',
    title: 'Jeu de Noël pour chat : neige et bonnets – Meowtrix',
    description: 'Neige qui tombe, bonnets de Père Noël et chaussette où se cacher : la version de Noël de Meowtrix, le jeu gratuit pour chat sur tablette, téléphone et télé.',
    image: '/og/christmas.jpg', imageAlt: 'Neige, chaussette de Noël et animaux coiffés d’un bonnet de Père Noël',
    body: `<h2>Un Noël pour votre chat</h2>
<p>La neige tombe et recouvre le sol, chaque animal porte un bonnet de Père Noël, et une grande chaussette rouge sert de cachette. Lézards, souris, poissons ou papillons : tous les thèmes passent en mode Noël.</p>
<p>Du 1er décembre au 6 janvier, Meowtrix s’habille pour Noël tout seul, avec le réglage Auto. Cette page l’active toute l’année.</p>
${HOW_FR}`,
  }),
  fr({
    path: '/halloween/', alt: '/en/halloween/', name: 'Halloween', preset: 'fete=halloween',
    title: 'Jeu d’Halloween pour chat : citrouilles et chauves-souris – Meowtrix',
    description: 'Citrouilles lumineuses, chauves-souris, braises et chapeaux de sorcière : la version Halloween de Meowtrix, le jeu gratuit pour chat sur tablette et télé.',
    image: '/og/halloween.jpg', imageAlt: 'Citrouilles sculptées, chauves-souris et animaux en chapeau de sorcière',
    body: `<h2>Un Halloween pour votre chat</h2>
<p>La lumière tourne à l’orange, des braises montent dans l’air, des chauves-souris tournent au-dessus de la scène et chaque animal porte un chapeau de sorcière. Une citrouille sculptée et lumineuse sert de cachette.</p>
<p>De mi-octobre au 2 novembre, Meowtrix passe en mode Halloween tout seul, avec le réglage Auto. Cette page l’active toute l’année.</p>
${HOW_FR}`,
  }),
  fr({
    path: '/paques/', alt: '/en/easter/', name: 'Pâques', preset: 'fete=easter',
    title: 'Jeu de Pâques pour chat : œufs et oreilles de lapin – Meowtrix',
    description: 'Oreilles de lapin, œufs géants posés sur des œufs en chocolat et pluie de pétales : la version de Pâques de Meowtrix, le jeu gratuit pour chat.',
    image: '/og/easter.jpg', imageAlt: 'Œufs de Pâques géants, tulipes et animaux avec des oreilles de lapin',
    body: `<h2>Des Pâques pour votre chat</h2>
<p>Des pétales tombent doucement, chaque animal porte des oreilles de lapin, et de grands œufs décorés, posés sur des œufs en chocolat, servent de cachettes.</p>
<p>Autour de Pâques, Meowtrix s’habille tout seul avec le réglage Auto. Cette page l’active toute l’année.</p>
${HOW_FR}`,
  }),

  en({
    path: '/en/', alt: '/', name: 'Home', preset: 'lang=en',
    title: 'Meowtrix – Free game for cats on tablet, phone and TV',
    description: 'Lizards, mice, fish, butterflies, a laser dot: a 3D game your cat hunts on the screen. Free, no ads, no app to install, on tablet, phone or TV.',
    image: '/og/home.jpg', imageAlt: 'Lizards, a frog and insects in 3D around a leaf, a stone and an old boot',
    body: `<h2>A free game for cats, on tablet, phone or TV</h2>
<p>Meowtrix turns the screen into a hunting ground: 3D animals wander about, hide, and dash off when a paw touches them. It is free, with no ads, no account and no app to install: the page opens in the browser and goes fullscreen.</p>
<h3>Three worlds to hunt in</h3>
<ul>
<li><strong>Land</strong>: lizards, frogs, flies, ladybirds, beetles, grasshoppers, cockroaches, mice, squirrels and birds, hiding under leaves, stones or in an old boot.</li>
<li><strong><a href="/en/water/">Water</a></strong>: goldfish, koi carp, a school of sardines, trout, salmon and baby sharks; every swipe of a paw makes ripples.</li>
<li><strong><a href="/en/sky/">Sky</a></strong>: butterflies, fireflies, feathers in the wind and a laser dot, by day, at dusk or by moonlight.</li>
</ul>
<p>For the holidays everything dresses up on its own at the right time: <a href="/en/christmas/">Christmas</a> (Santa hats and snow), <a href="/en/halloween/">Halloween</a> (witch hats and pumpkins) and <a href="/en/easter/">Easter</a> (bunny ears and giant eggs). The Pixel style gives it a retro video game look.</p>
<h3>Made with the cat’s wellbeing in mind</h3>
<p>A timer offers 5, 10 or 15 minute sessions; at the end the animals tire so the cat finishes on a catch. A counter keeps its catches, to share with friends. Sounds are made live and, if you allow it, the microphone makes the animals startle at noises in the room.</p>
${HOW_EN}`,
    faq: FAQ_EN,
  }),
  en({
    path: '/en/water/', alt: '/eau/', name: 'Water', preset: 'lang=en&theme=water',
    title: 'Fish game for cats on tablet – Meowtrix',
    description: 'Goldfish, koi carp, a school of sardines and baby sharks swim under the water: a free fishing game for your cat, on tablet, phone or TV.',
    image: '/og/water.jpg', imageAlt: 'Koi carp, goldfish, trout and a school of sardines among water lilies, a rock and seaweed',
    body: `<h2>Fish for your cat to catch</h2>
<p>In the Water theme, 3D fish swim under a rippling, shimmering surface. Curious goldfish blow bubbles; koi glide slowly and come up to gulp at the surface; sardines swim in a tight school and scatter all at once; trout and salmon dart under the rocks; baby sharks patrol with their fin up.</p>
<p>Every swipe of a paw makes ripples and a little splash. The fish swim around the rocks, dive under them to hide, and come out again once it is calm.</p>
<h3>The scenery</h3>
<p>A pond, a lagoon or a river, with water lilies, rocks and seaweed to hide in. Each fish comes in several colours: kohaku, showa or ogon koi, rainbow or brown trout, zebra or whale shark…</p>
${HOW_EN}`,
  }),
  en({
    path: '/en/sky/', alt: '/ciel/', name: 'Sky', preset: 'lang=en&theme=sky',
    title: 'Butterflies, feathers and a laser dot for cats – Meowtrix',
    description: 'Fluttering butterflies, blinking fireflies, feathers in the wind and a laser dot: a free game for cats, on tablet, phone or TV.',
    image: '/og/sky.jpg', imageAlt: 'Butterflies, a feather and a laser dot on a flowery meadow',
    body: `<h2>Butterflies, fireflies, feathers and a laser dot</h2>
<p>The Sky theme brings together things that fly, float and dart. Butterflies (monarch, blue morpho, cabbage white, peacock, brimstone) flutter in zigzags, land and spread their wings in the sun. Fireflies drift about, blinking, beautiful by moonlight. Feathers float down swaying, then the wind makes them slide and lift.</p>
<h3>A laser dot that can be caught</h3>
<p>The laser dot moves like a real hand: it darts, stops dead with a slight tremor, runs in circles, creeps closer, slips off the screen and comes back. It flees when a paw comes near, but unlike a real laser your cat can catch it: the dot stays under the paw for a moment and the catch counts. Red, green or blue.</p>
<h3>The scenery</h3>
<p>A flowery meadow in broad daylight, the golden light of dusk, or moonlight to make the fireflies and the laser shine. Tulips, tufts of grass and stones complete the scene.</p>
${HOW_EN}`,
  }),
  en({
    path: '/en/christmas/', alt: '/noel/', name: 'Christmas', preset: 'lang=en&fete=christmas',
    title: 'Christmas game for cats: snow and Santa hats – Meowtrix',
    description: 'Falling snow, Santa hats and a stocking to hide in: the Christmas version of Meowtrix, the free game for cats on tablet, phone and TV.',
    image: '/og/christmas.jpg', imageAlt: 'Snow, a Christmas stocking and animals wearing Santa hats',
    body: `<h2>Christmas for your cat</h2>
<p>Snow falls and settles on the ground, every animal wears a Santa hat, and a big red stocking becomes a hiding spot. Lizards, mice, fish or butterflies: every theme gets the Christmas look.</p>
<p>From December 1 to January 6, Meowtrix dresses up for Christmas on its own with the Auto setting. This page turns it on all year round.</p>
${HOW_EN}`,
  }),
  en({
    path: '/en/halloween/', alt: '/halloween/', name: 'Halloween', preset: 'lang=en&fete=halloween',
    title: 'Halloween game for cats: pumpkins and bats – Meowtrix',
    description: 'Glowing pumpkins, bats, embers and witch hats: the Halloween version of Meowtrix, the free game for cats on tablet, phone and TV.',
    image: '/og/halloween.jpg', imageAlt: 'Carved pumpkins, bats and animals wearing witch hats',
    body: `<h2>Halloween for your cat</h2>
<p>The light turns orange, embers drift up, bats circle over the scene and every animal wears a witch hat. A glowing carved pumpkin becomes a hiding spot.</p>
<p>From mid-October to November 2, Meowtrix switches to Halloween on its own with the Auto setting. This page turns it on all year round.</p>
${HOW_EN}`,
  }),
  en({
    path: '/en/easter/', alt: '/paques/', name: 'Easter', preset: 'lang=en&fete=easter',
    title: 'Easter game for cats: eggs and bunny ears – Meowtrix',
    description: 'Bunny ears, giant eggs resting on chocolate eggs and a shower of petals: the Easter version of Meowtrix, the free game for cats.',
    image: '/og/easter.jpg', imageAlt: 'Giant Easter eggs, tulips and animals with bunny ears',
    body: `<h2>Easter for your cat</h2>
<p>Petals drift down, every animal wears bunny ears, and big decorated eggs resting on chocolate eggs become hiding spots.</p>
<p>Around Easter, Meowtrix dresses up on its own with the Auto setting. This page turns it on all year round.</p>
${HOW_EN}`,
  }),
];

/** For assistants and AI search engines (llms.txt): what the site is, in plain text, with its pages. */
export function llmsText(version: string): string {
  const list = (lang: PageLang) =>
    PAGES.filter((p) => p.lang === lang).map((p) => `- [${p.title}](${SITE}${p.path}): ${p.description}`).join('\n');
  return `# Meowtrix

> Jeu gratuit pour chat, en 3D, dans le navigateur (tablette, téléphone, télé) : des animaux et des jouets que le chat chasse sur l’écran. / A free 3D browser game for cats (tablet, phone, TV): animals and toys for the cat to hunt on the screen.

Meowtrix est une page web plein écran : aucune installation, aucun compte, aucune publicité, aucun traceur. Elle s’installe aussi comme une application (PWA) et fonctionne hors ligne une fois chargée. Version ${version}.

## Ce qu’il y a dedans

- Terre : lézards, grenouilles, mouches, coccinelles, scarabées, sauterelles, cafards, souris, écureuils, oiseaux ; cachettes (feuilles, pierres, herbe, tulipes, vieille botte).
- Eau : poissons rouges, carpes koï, sardines en banc, truites, saumons, bébés requins ; étang, lagon ou rivière.
- Ciel : papillons, lucioles, plumes portées par le vent, point laser (rouge, vert ou bleu) qui peut être attrapé ; prairie, crépuscule ou clair de lune.
- Fêtes : Noël, Halloween et Pâques, automatiques selon la date ou au choix. Style Pixel (rétro).
- Bien-être : séances de 5, 10 ou 15 minutes ; dans la dernière minute les animaux fatiguent pour que le chat finisse sur une prise. Compteur de prises, partage.
- Sons synthétisés en direct ; micro facultatif (les animaux sursautent aux bruits, rien n’est enregistré).
- Langues : français et anglais.

## Pages (français)

${list('fr')}

## Pages (English)

${list('en')}

## Liens

- Code source : ${REPO}
- Signaler un problème : ${REPO}/issues
`;
}
