import type { SeoText } from '../text.ts';

export default {
  tagline: 'A hunting ground for your cat',
  genre: 'Game for cats',
  howTitle: 'How to play',
  how: [
    'Lay the tablet or phone flat, or open the page on the TV.',
    'Pick the animals, how many, their colours and the scenery, then tap “Play”.',
    'To get back to the menu, hold the button in the top right corner: a paw can’t open it by accident.',
  ],
  faqTitle: 'Frequently asked questions',
  faq: [
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
  ],
  otherPages: 'Other pages',
  languages: 'In other languages',
  note: 'Meowtrix is a personal project',
  source: 'source code on GitHub',
  pages: {
    home: {
      name: 'Home',
      title: 'Meowtrix – Free game for cats on tablet, phone and TV',
      description: 'Lizards, mice, fish, butterflies, a laser dot: a 3D game your cat hunts on the screen. Free, no ads, no app to install, on tablet, phone or TV.',
      imageAlt: 'Lizards, a frog and insects in 3D around a leaf, a stone and an old boot',
      body: `<h2>A free game for cats, on tablet, phone or TV</h2>
<p>Meowtrix turns the screen into a hunting ground: 3D animals wander about, hide, and dash off when a paw touches them. It is free, with no ads, no account and no app to install: the page opens in the browser and goes fullscreen.</p>
<h3>Three worlds to hunt in</h3>
<ul>
<li><strong>Land</strong>: lizards, frogs, flies, ladybirds, beetles, grasshoppers, cockroaches, mice, squirrels and birds, hiding under leaves, stones or in an old boot.</li>
<li><strong><a href="{water}">Water</a></strong>: goldfish, koi carp, a school of sardines, trout, salmon and baby sharks; every swipe of a paw makes ripples.</li>
<li><strong><a href="{sky}">Sky</a></strong>: butterflies, fireflies, feathers in the wind and a laser dot, by day, at dusk or by moonlight.</li>
</ul>
<p>For the holidays everything dresses up on its own at the right time: <a href="{christmas}">Christmas</a> (Santa hats and snow), <a href="{halloween}">Halloween</a> (witch hats and pumpkins) and <a href="{easter}">Easter</a> (bunny ears and giant eggs). The Pixel style gives it a retro video game look.</p>
<h3>Made with the cat’s wellbeing in mind</h3>
<p>A timer offers 5, 10 or 15 minute sessions; at the end the animals tire so the cat finishes on a catch. A counter keeps its catches, to share with friends. Sounds are made live and, if you allow it, the microphone makes the animals startle at noises in the room.</p>
<h3>A game that adapts to your cat</h3>
<p>Auto speed slows the animals down when your cat paws without catching, and speeds them up when it catches everything. Now and then a passing animal crosses the screen, or a shadow sends everyone running. Caterpillars, slow and easy to catch, suit kittens and old cats. Statistics keep the catches per day and the favourite prey; the “tablet on a stand” mode starts a new session on its own one, two or four hours later, for the days you are out.</p>`,
    },
    water: {
      name: 'Water',
      title: 'Fish game for cats on tablet – Meowtrix',
      description: 'Goldfish, koi carp, a school of sardines and baby sharks swim under the water: a free fishing game for your cat, on tablet, phone or TV.',
      imageAlt: 'Koi carp, goldfish, trout and a school of sardines among water lilies, a rock and seaweed',
      body: `<h2>Fish for your cat to catch</h2>
<p>In the Water theme, 3D fish swim under a rippling, shimmering surface. Curious goldfish blow bubbles; koi glide slowly and come up to gulp at the surface; sardines swim in a tight school and scatter all at once; trout and salmon dart under the rocks; baby sharks patrol with their fin up.</p>
<p>Every swipe of a paw makes ripples and a little splash. The fish swim around the rocks, dive under them to hide, and come out again once it is calm.</p>
<h3>The scenery</h3>
<p>A pond, a lagoon or a river, with water lilies, rocks and seaweed to hide in. Each fish comes in several colours: kohaku, showa or ogon koi, rainbow or brown trout, zebra or whale shark…</p>`,
    },
    sky: {
      name: 'Sky',
      title: 'Butterflies, feathers and a laser dot for cats – Meowtrix',
      description: 'Fluttering butterflies, blinking fireflies, feathers in the wind and a laser dot: a free game for cats, on tablet, phone or TV.',
      imageAlt: 'Butterflies, a feather and a laser dot on a flowery meadow',
      body: `<h2>Butterflies, fireflies, feathers and a laser dot</h2>
<p>The Sky theme brings together things that fly, float and dart. Butterflies (monarch, blue morpho, cabbage white, peacock, brimstone) flutter in zigzags, land and spread their wings in the sun. Fireflies drift about, blinking, beautiful by moonlight. Feathers float down swaying, then the wind makes them slide and lift.</p>
<h3>A laser dot that can be caught</h3>
<p>The laser dot moves like a real hand: it darts, stops dead with a slight tremor, runs in circles, creeps closer, slips off the screen and comes back. It flees when a paw comes near, but unlike a real laser your cat can catch it: the dot stays under the paw for a moment and the catch counts. Red, green or blue.</p>
<h3>The scenery</h3>
<p>A flowery meadow in broad daylight, the golden light of dusk, or moonlight to make the fireflies and the laser shine. Tulips, tufts of grass and stones complete the scene.</p>`,
    },
    christmas: {
      name: 'Christmas',
      title: 'Christmas game for cats: snow and Santa hats – Meowtrix',
      description: 'Falling snow, Santa hats and a stocking to hide in: the Christmas version of Meowtrix, the free game for cats on tablet, phone and TV.',
      imageAlt: 'Snow, a Christmas stocking and animals wearing Santa hats',
      body: `<h2>Christmas for your cat</h2>
<p>Snow falls and settles on the ground, every animal wears a Santa hat, and a big red stocking becomes a hiding spot. Lizards, mice, fish or butterflies: every theme gets the Christmas look.</p>
<p>From December 1 to January 6, Meowtrix dresses up for Christmas on its own with the Auto setting. This page turns it on all year round.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Halloween game for cats: pumpkins and bats – Meowtrix',
      description: 'Glowing pumpkins, bats, embers and witch hats: the Halloween version of Meowtrix, the free game for cats on tablet, phone and TV.',
      imageAlt: 'Carved pumpkins, bats and animals wearing witch hats',
      body: `<h2>Halloween for your cat</h2>
<p>The light turns orange, embers drift up, bats circle over the scene and every animal wears a witch hat. A glowing carved pumpkin becomes a hiding spot.</p>
<p>From mid-October to November 2, Meowtrix switches to Halloween on its own with the Auto setting. This page turns it on all year round.</p>`,
    },
    easter: {
      name: 'Easter',
      title: 'Easter game for cats: eggs and bunny ears – Meowtrix',
      description: 'Bunny ears, giant eggs resting on chocolate eggs and a shower of petals: the Easter version of Meowtrix, the free game for cats.',
      imageAlt: 'Giant Easter eggs, tulips and animals with bunny ears',
      body: `<h2>Easter for your cat</h2>
<p>Petals drift down, every animal wears bunny ears, and big decorated eggs resting on chocolate eggs become hiding spots.</p>
<p>Around Easter, Meowtrix dresses up on its own with the Auto setting. This page turns it on all year round.</p>`,
    },
  },
} satisfies SeoText;
