import type { SeoText } from '../text.ts';

export default {
  tagline: 'Jahimaa sinu kassile',
  genre: 'Mäng kassidele',
  howTitle: 'Kuidas mängida',
  how: [
    'Pane tahvelarvuti või telefon lauale pikali või ava leht teleris.',
    'Vali loomad, nende arv, värvid ja maastik ning puuduta siis „Mängi”.',
    'Menüüsse naasmiseks hoia paremas ülanurgas olevat nuppu all: käpp ei saa seda kogemata avada.',
  ],
  faqTitle: 'Korduma kippuvad küsimused',
  faq: [
    ['Milline tahvelarvutimäng sobib mu kassile?',
      'Selline, kus midagi väikest liigub tõmblevalt, peatub ja peitub: see äratab jahiinstinkti. Meowtrixis on sisalikud, hiired, putukad, linnud, kalad, liblikad, suled ja laserpunkt, mis käituvad just nii, koos helidega. Proovi mitut: igal kassil on oma lemmikud.'],
    ['Kas ekraanimängud on kassidele head?',
      'Need hoiavad toakassi hästi tegevuses, kui need jäävad üheks mänguks paljude seas. Vahelda päris mänguasjadega, mida ta saab püüda ja hammustada, ole lähedal ja lõpeta, kui ekraan tundub teda frustreerivat.'],
    ['Kui kaua peaks mängukord kestma?',
      'Parem mitu lühikest, 5–15-minutilist korda kui üks pikk. Vali seadetes pikkus: viimasel minutil loomad väsivad, et kass lõpetaks saagiga, ja siis näitab Meowtrix tulemust. Maius kohe pärast on jahile hea lõpp.'],
    ['Kuidas kaitsta ekraani küünte eest?',
      'Tavaliselt piisab karastatud klaasist või kaitsekilest, ja regulaarselt lõigatud küünised aitavad samuti. Pane seade pikali stabiilsele pinnale.'],
    ['Kas see töötab teleris?',
      'Jah: ava meowtrix.mbonnici.fr teleri brauseris või edasta vahekaart arvutist. Teleris kass vaatab ja jälgib loomi, kuid ei saa neid puudutada.'],
    ['Miks roheline või sinine laserpunkt?',
      'Kassid näevad sinist ja rohelist paremini kui punast; punane toimib samuti, sest kõige olulisem on liikumine. Erinevalt päris laserist saab seda punkti püüda: see jääb hetkeks käpa alla ja saak loetakse.'],
    ['Mu kass ei reageeri. Mida teha?',
      'Keera heli veidi valjemaks, vali suuremad loomad (vahekaart Maastik) või aeglasem kiirus ja hämarda valgust. Mõned kassid eelistavad hiiri, teised kalu või laserpunkti.'],
    ['Kas see on tõesti tasuta? Ja minu andmed?',
      'Jah: tasuta, ilma reklaamide, kontota ja jälgimiseta. Seaded jäävad sinu seadmesse. Mikrofon on valikuline ja paneb loomad ainult müra peale ehmuma; midagi ei salvestata ega saadeta.'],
  ],
  otherPages: 'Teised lehed',
  languages: 'Teistes keeltes',
  note: 'Meowtrix on isiklik projekt',
  source: 'lähtekood GitHubis',
  pages: {
    home: {
      name: 'Avaleht',
      title: 'Meowtrix – Tasuta kassimäng tahvelarvutile, telefonile ja telerile',
      description: 'Sisalikud, hiired, kalad, liblikad, laserpunkt: 3D-mäng, kus su kass ekraanil jahti peab. Tasuta, ilma reklaamide ja rakenduseta, tahvelarvutis või teleris.',
      imageAlt: 'Sisalikud, konn ja putukad 3D-s lehe, kivi ja vana saapa ümber',
      body: `<h2>Tasuta mäng kassidele tahvelarvutis, telefonis või teleris</h2>
<p>Meowtrix muudab ekraani jahimaaks: 3D-loomad jalutavad ringi, peituvad ja pistavad jooksu, kui käpp neid puudutab. See on tasuta, ilma reklaamide, kontota ja ilma paigaldatava rakenduseta: leht avaneb brauseris ja läheb täisekraanile.</p>
<h3>Kolm maailma jahtimiseks</h3>
<ul>
<li><strong>Maa</strong>: sisalikud, konnad, kärbsed, lepatriinud, mardikad, rohutirtsud, prussakad, hiired, oravad ja linnud, kes peituvad lehtede ja kivide alla või vanasse saapasse.</li>
<li><strong><a href="{water}">Vesi</a></strong>: kuldkalad, koikarpkalad, sardiiniparv, forellid, lõhed ja haipojad; iga käpalöök teeb vette ringe.</li>
<li><strong><a href="{sky}">Taevas</a></strong>: liblikad, jaanimardikad, tuules hõljuvad suled ja laserpunkt, päeval, hämarikus või kuuvalgel.</li>
</ul>
<p>Pühade ajal riietub kõik ise õigel ajal: <a href="{christmas}">jõulud</a> (päkapikumütsid ja lumi), <a href="{halloween}">halloween</a> (nõiakübarad ja kõrvitsad) ja <a href="{easter}">lihavõtted</a> (jänesekõrvad ja hiiglaslikud munad). Pikselstiil annab retromängu ilme.</p>
<h3>Mõeldud kassi heaolu silmas pidades</h3>
<p>Taimer pakub 5-, 10- või 15-minutilisi mängukordi; lõpus loomad väsivad, et kass lõpetaks saagiga. Loendur hoiab tema saagid alles, et neid sõpradega jagada. Helid luuakse reaalajas ja kui lubad, paneb mikrofon loomad toas olevate helide peale ehmuma.</p>
<h3>Mäng, mis kohaneb sinu kassiga</h3>
<p>Automaatkiirus aeglustab loomi, kui kass puudutab, aga ei püüa, ja kiirendab neid, kui ta püüab kõik. Aeg-ajalt ületab ekraani mööduv loom või ajab vari kõik laiali. Röövikud, aeglased ja kergesti püütavad, sobivad kassipoegadele ja vanadele kassidele. Statistika hoiab saaki päevade kaupa ja lemmiksaaki; režiim „tahvel alusel“ alustab uue sessiooni ise ühe, kahe või nelja tunni pärast, päevadeks, mil sind kodus pole.</p>`,
    },
    water: {
      name: 'Vesi',
      title: 'Kalamäng kassidele tahvelarvutis – Meowtrix',
      description: 'Kuldkalad, koikarpkalad, sardiiniparv ja haipojad ujuvad vee all: tasuta kalapüügimäng su kassile, tahvelarvutis, telefonis või teleris.',
      imageAlt: 'Koikarpkalad, kuldkala, forell ja sardiiniparv vesiroosi, kalju ja vetikate vahel',
      body: `<h2>Kalad, mida su kass saab püüda</h2>
<p>Teemas Vesi ujuvad 3D-kalad laineliselt virvendava pinna all. Uudishimulikud kuldkalad teevad mulle; koid libisevad aeglaselt ja tõusevad pinnale ahmima; sardiinid ujuvad tihedas parves ja hajuvad äkki laiali; forellid ja lõhed sööstavad kaljude alla; haipojad patrullivad, uim püsti.</p>
<p>Iga käpalöök teeb vette ringe ja väikese pläraki. Kalad ujuvad kaljudest mööda, sukelduvad nende alla peitu ja tulevad välja, kui rahu on tagasi.</p>
<h3>Maastikud</h3>
<p>Tiik, laguun või jõgi, kus vesiroosid, kaljud ja vetikad pakuvad peidupaiku. Igal kalal on mitu värvi: kohaku, showa või ogon koidele, vikerforell või jõeforell, sebrahai või vaalhai…</p>`,
    },
    sky: {
      name: 'Taevas',
      title: 'Liblikad, suled ja laserpunkt kassidele – Meowtrix',
      description: 'Lendlevad liblikad, vilkuvad jaanimardikad, suled tuules ja laserpunkt: tasuta mäng kassidele, tahvelarvutis, telefonis või teleris.',
      imageAlt: 'Liblikad, sulg ja laserpunkt lilleaasal',
      body: `<h2>Liblikad, jaanimardikad, suled ja laserpunkt</h2>
<p>Teema Taevas toob kokku kõik, mis lendab, hõljub ja sööstab. Liblikad (monarhliblikas, sinine morfo, kapsaliblikas, päevapaabusilm, lapsuliblikas) lendlevad siksakis, maanduvad ja sirutavad tiivad päikesele. Jaanimardikad hõljuvad vilkudes, kaunid kuuvalgel. Suled kõiguvad alla, siis paneb tuul need libisema ja tõusma.</p>
<h3>Laserpunkt, mida saab püüda</h3>
<p>Laserpunkt liigub nagu päris käsi: see sööstab, peatub järsku kergelt värisedes, tiirleb, hiilib lähemale, libiseb ekraanilt välja ja tuleb tagasi. See põgeneb, kui käpp läheneb, kuid erinevalt päris laserist saab su kass selle kinni püüda: punkt jääb hetkeks käpa alla ja saak loeb. Punane, roheline või sinine.</p>
<h3>Maastikud</h3>
<p>Lilleaas keset päeva, hämariku kuldne valgus või kuuvalgus, milles jaanimardikad ja laser säravad. Tulbid, rohututid ja kivid täiendavad pilti.</p>`,
    },
    christmas: {
      name: 'Jõulud',
      title: 'Jõulumäng kassidele: lumi ja päkapikumütsid – Meowtrix',
      description: 'Langev lumi, päkapikumütsid ja sokk peitumiseks: Meowtrixi jõuluversioon, tasuta kassimäng tahvelarvutile, telefonile ja telerile.',
      imageAlt: 'Lumi, jõulusokk ja loomad päkapikumütsidega',
      body: `<h2>Jõulud sinu kassile</h2>
<p>Lumi sajab ja katab maa, igal loomal on päkapikumüts ja suur punane sokk on peidukohaks. Sisalikud, hiired, kalad või liblikad: kõik teemad saavad jõuluilme.</p>
<p>1. detsembrist 6. jaanuarini riietub Meowtrix seadega Auto ise jõuluehtesse. See leht lülitab selle sisse aasta läbi.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Halloweeni mäng kassidele: kõrvitsad ja nahkhiired – Meowtrix',
      description: 'Helendavad kõrvitsad, nahkhiired, söed ja nõiakübarad: Meowtrixi halloweeni versioon, tasuta kassimäng tahvelarvutile ja telerile.',
      imageAlt: 'Nikerdatud kõrvitsad, nahkhiired ja loomad nõiakübaratega',
      body: `<h2>Halloween sinu kassile</h2>
<p>Valgus muutub oranžiks, sädemed tõusevad õhku, nahkhiired tiirlevad stseeni kohal ja igal loomal on nõiakübar. Helendav nikerdatud kõrvits on peidukohaks.</p>
<p>Oktoobri keskpaigast 2. novembrini läheb Meowtrix seadega Auto ise halloweeni režiimi. See leht lülitab selle sisse aasta läbi.</p>`,
    },
    easter: {
      name: 'Lihavõtted',
      title: 'Lihavõttemäng kassidele: munad ja jänesekõrvad – Meowtrix',
      description: 'Jänesekõrvad, šokolaadimunadel lebavad hiiglaslikud munad ja kroonlehtede vihm: Meowtrixi lihavõtteversioon, tasuta mäng kassidele.',
      imageAlt: 'Hiiglaslikud lihavõttemunad, tulbid ja loomad jänesekõrvadega',
      body: `<h2>Lihavõtted sinu kassile</h2>
<p>Kroonlehed langevad vaikselt, igal loomal on jänesekõrvad ning suured kaunistatud munad, mis lebavad šokolaadimunadel, on peidukohtadeks.</p>
<p>Lihavõtete paiku ehib Meowtrix end seadega Auto ise. See leht lülitab selle sisse aasta läbi.</p>`,
    },
  },
} satisfies SeoText;
