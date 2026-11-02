import type { SeoText } from '../text.ts';

export default {
  tagline: 'Vadászterület a macskádnak',
  genre: 'Játék macskáknak',
  howTitle: 'Hogyan kell játszani',
  how: [
    'Fektesd le a tabletet vagy a telefont, vagy nyisd meg az oldalt a tévén.',
    'Válaszd ki az állatokat, a számukat, a színüket és a tájat, majd koppints a „Játék” gombra.',
    'A menübe való visszatéréshez tartsd lenyomva a jobb felső gombot: egy mancs véletlenül nem tudja megnyitni.',
  ],
  faqTitle: 'Gyakori kérdések',
  faq: [
    ['Milyen tabletes játék jó a macskámnak?',
      'Olyan, amelyben valami apróság rángatózva mozog, megáll és elbújik: ez ébreszti fel a vadászösztönt. A Meowtrixben gyíkok, egerek, rovarok, madarak, halak, lepkék, tollak és egy lézerpötty viselkedik így, hangokkal. Próbálj ki többet: minden macskának megvannak a kedvencei.'],
    ['Jók a képernyős játékok a macskáknak?',
      'Jól lefoglalják a lakásban élő macskát, ha csak egy játék a sok közül. Váltogasd valódi játékokkal, amelyeket el tud kapni és meg tud harapni, maradj a közelben, és hagyd abba, ha a képernyő láthatóan frusztrálja.'],
    ['Mennyi ideig tartson egy játék?',
      'Jobb több rövid, 5–15 perces kör, mint egy hosszú. Válassz időtartamot a beállításokban: az utolsó percben az állatok elfáradnak, hogy a macska egy zsákmánnyal zárjon, aztán a Meowtrix megmutatja az eredményt. Egy jutalomfalat rögtön utána remek befejezése a vadászatnak.'],
    ['Hogyan védjem a képernyőt a karmoktól?',
      'Általában elég egy edzett üveg vagy kijelzővédő fólia, és a rendszeresen vágott karmok is segítenek. Fektesd az eszközt stabil felületre.'],
    ['Működik a tévén?',
      'Igen: nyisd meg a meowtrix.mbonnici.fr oldalt a tévé böngészőjében, vagy küldd át a lapot egy számítógépről. A tévén a macska nézi és követi az állatokat, de nem érheti el őket.'],
    ['Miért zöld vagy kék a lézerpötty?',
      'A macskák a kéket és a zöldet jobban látják, mint a pirosat; a piros is működik, mert leginkább a mozgás számít. Az igazi lézerrel ellentétben ezt a pöttyöt el lehet kapni: egy pillanatra a mancs alatt marad, és a zsákmány számít.'],
    ['A macskám nem reagál. Mit tegyek?',
      'Hangosíts egy kicsit, válassz nagyobb állatokat (Táj fül) vagy lassabb sebességet, és tompítsd a fényeket. Egyes macskák az egereket szeretik jobban, mások a halakat vagy a lézerpöttyöt.'],
    ['Tényleg ingyenes? És az adataim?',
      'Igen: ingyenes, reklámok, fiók és követés nélkül. A beállítások az eszközödön maradnak. A mikrofon nem kötelező, és csak arra szolgál, hogy az állatok összerezzenjenek a zajra; semmit nem rögzítünk és nem küldünk el.'],
  ],
  otherPages: 'További oldalak',
  languages: 'Más nyelveken',
  note: 'A Meowtrix egy személyes projekt',
  source: 'forráskód a GitHubon',
  pages: {
    home: {
      name: 'Kezdőlap',
      title: 'Meowtrix – Ingyenes macskajáték tabletre, telefonra és tévére',
      description: 'Gyíkok, egerek, halak, lepkék, lézerpötty: 3D-s játék, amelyben a macskád a képernyőn vadászik. Ingyenes, reklám és alkalmazás nélkül, tableten vagy tévén.',
      imageAlt: 'Gyíkok, egy béka és rovarok 3D-ben egy levél, egy kő és egy régi csizma körül',
      body: `<h2>Ingyenes macskajáték tabletre, telefonra vagy tévére</h2>
<p>A Meowtrix vadászterületté változtatja a képernyőt: 3D-s állatok sétálgatnak, elbújnak és elszaladnak, ha egy mancs hozzájuk ér. Ingyenes, reklám, fiók és telepítendő alkalmazás nélkül: az oldal a böngészőben nyílik meg, és teljes képernyőre vált.</p>
<h3>Három világ a vadászathoz</h3>
<ul>
<li><strong>Szárazföld</strong>: gyíkok, békák, legyek, katicák, bogarak, szöcskék, csótányok, egerek, mókusok és madarak, amelyek levelek, kövek alá vagy egy régi csizmába bújnak.</li>
<li><strong><a href="{water}">Víz</a></strong>: aranyhalak, koi pontyok, szardíniaraj, pisztrángok, lazacok és cápakölykök; minden mancscsapás gyűrűket rajzol a vízre.</li>
<li><strong><a href="{sky}">Ég</a></strong>: lepkék, szentjánosbogarak, szélben szálló tollak és egy lézerpötty, nappal, alkonyatkor vagy holdfényben.</li>
</ul>
<p>Ünnepekkor minden magától öltözik be a megfelelő időben: <a href="{christmas}">karácsony</a> (mikulássapkák és hó), <a href="{halloween}">Halloween</a> (boszorkánykalapok és tökök) és <a href="{easter}">húsvét</a> (nyuszifülek és óriás tojások). A Pixel stílus retró videojáték-hangulatot ad.</p>
<h3>A macska jóllétére gondolva</h3>
<p>Az időzítő 5, 10 vagy 15 perces köröket kínál; a végén az állatok elfáradnak, hogy a macska egy zsákmánnyal zárjon. Egy számláló megőrzi a zsákmányait, amelyeket megoszthatsz a barátaiddal. A hangok élőben készülnek, és ha engedélyezed, a mikrofon hatására az állatok összerezzennek a szoba zajaira.</p>
<h3>Egy játék, amely alkalmazkodik a macskádhoz</h3>
<p>Az automatikus sebesség lelassítja az állatokat, ha a macskád nyúl, de nem fog, és felgyorsítja őket, ha mindent elkap. Időnként egy átutazó állat halad át a képernyőn, vagy egy árnyék kerget el mindenkit. A hernyók, lassúak és könnyen elkaphatók, kiscicáknak és idős macskáknak valók. A statisztika megőrzi a napi fogásokat és a kedvenc zsákmányt; a „tablet állványon” mód egy, két vagy négy óra múlva magától új menetet indít, azokra a napokra, amikor nem vagy otthon.</p>`,
    },
    water: {
      name: 'Víz',
      title: 'Halas játék macskáknak tableten – Meowtrix',
      description: 'Aranyhalak, koi pontyok, szardíniaraj és cápakölykök úsznak a víz alatt: ingyenes horgászjáték a macskádnak, tableten, telefonon vagy tévén.',
      imageAlt: 'Koi pontyok, aranyhal, pisztráng és szardíniaraj tavirózsák, szikla és hínár között',
      body: `<h2>Halak, amelyeket a macskád kifoghat</h2>
<p>A Víz témában 3D-s halak úsznak egy hullámzó, csillogó felszín alatt. A kíváncsi aranyhalak buborékot fújnak; a koik lassan siklanak és a felszínen kapkodnak; a szardíniák szoros rajban úsznak, majd hirtelen szétrebbennek; a pisztrángok és a lazacok a sziklák alá cikáznak; a cápakölykök felmeredt uszonnyal járőröznek.</p>
<p>Minden mancscsapás gyűrűket rajzol a vízre és kis csobbanást ad. A halak kikerülik a sziklákat, alájuk buknak, hogy elbújjanak, és újra előjönnek, ha visszatér a nyugalom.</p>
<h3>A tájak</h3>
<p>Egy tavacska, egy lagúna vagy egy folyó, tavirózsákkal, sziklákkal és hínárral, ahol el lehet bújni. Minden halnak több színe van: kohaku, showa vagy ogon a koiknál, szivárványos vagy sebes pisztráng, zebracápa vagy cetcápa…</p>`,
    },
    sky: {
      name: 'Ég',
      title: 'Lepkék, tollak és lézerpötty macskáknak – Meowtrix',
      description: 'Röpködő lepkék, villogó szentjánosbogarak, tollak a szélben és egy lézerpötty: ingyenes játék macskáknak, tableten, telefonon vagy tévén.',
      imageAlt: 'Lepkék, egy toll és egy lézerpötty egy virágos réten',
      body: `<h2>Lepkék, szentjánosbogarak, tollak és lézerpötty</h2>
<p>Az Ég téma mindazt egyesíti, ami repül, lebeg és száguld. A lepkék (pompás királylepke, kék morfólepke, káposztalepke, nappali pávaszem, citromlepke) cikcakkban röpködnek, leszállnak és kiterítik szárnyukat a napon. A szentjánosbogarak villogva lebegnek, gyönyörűek holdfényben. A tollak ringatózva hullanak alá, aztán a szél sodorja és felkapja őket.</p>
<h3>Egy lézerpötty, amit el lehet kapni</h3>
<p>A lézerpötty úgy mozog, mint egy igazi kéz: száguld, hirtelen megáll kicsit remegve, körözik, lassan közelebb lopakodik, kicsúszik a képernyőről és visszatér. Elmenekül, ha közeledik egy mancs, de az igazi lézerrel ellentétben a macskád el tudja kapni: a pötty egy pillanatra a mancs alatt marad, és a zsákmány számít. Piros, zöld vagy kék.</p>
<h3>A tájak</h3>
<p>Virágos rét fényes nappal, az alkonyat aranyló fénye vagy holdfény, amelyben ragyognak a szentjánosbogarak és a lézer. Tulipánok, fűcsomók és kövek teszik teljessé a képet.</p>`,
    },
    christmas: {
      name: 'Karácsony',
      title: 'Karácsonyi játék macskáknak: hó és mikulássapkák – Meowtrix',
      description: 'Hulló hó, mikulássapkák és egy zokni, amibe el lehet bújni: a Meowtrix karácsonyi változata, ingyenes macskajáték tabletre, telefonra és tévére.',
      imageAlt: 'Hó, karácsonyi zokni és mikulássapkás állatok',
      body: `<h2>Karácsony a macskádnak</h2>
<p>Hull a hó és befedi a talajt, minden állat mikulássapkát visel, és egy nagy piros zokni búvóhellyé válik. Gyíkok, egerek, halak vagy lepkék: minden téma karácsonyi külsőt kap.</p>
<p>December 1-jétől január 6-ig a Meowtrix az Auto beállítással magától karácsonyi díszbe öltözik. Ez az oldal egész évben bekapcsolja.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Halloweeni játék macskáknak: tökök és denevérek – Meowtrix',
      description: 'Világító tökök, denevérek, parázs és boszorkánykalapok: a Meowtrix halloweeni változata, ingyenes macskajáték tabletre és tévére.',
      imageAlt: 'Faragott tökök, denevérek és boszorkánykalapos állatok',
      body: `<h2>Halloween a macskádnak</h2>
<p>A fény narancssárgára vált, parázs száll a levegőbe, denevérek köröznek a jelenet fölött, és minden állat boszorkánykalapot visel. Egy világító faragott tök búvóhellyé válik.</p>
<p>Október közepétől november 2-ig a Meowtrix az Auto beállítással magától halloweeni módba vált. Ez az oldal egész évben bekapcsolja.</p>`,
    },
    easter: {
      name: 'Húsvét',
      title: 'Húsvéti játék macskáknak: tojások és nyuszifülek – Meowtrix',
      description: 'Nyuszifülek, csokitojásokon nyugvó óriás tojások és szirom-eső: a Meowtrix húsvéti változata, ingyenes játék macskáknak.',
      imageAlt: 'Óriás húsvéti tojások, tulipánok és nyuszifülű állatok',
      body: `<h2>Húsvét a macskádnak</h2>
<p>Szirmok szállingóznak lassan, minden állatnak nyuszifüle van, és a csokitojásokon nyugvó nagy, díszes tojások búvóhelyekké válnak.</p>
<p>Húsvét táján a Meowtrix az Auto beállítással magától ünneplőbe öltözik. Ez az oldal egész évben bekapcsolja.</p>`,
    },
  },
} satisfies SeoText;
