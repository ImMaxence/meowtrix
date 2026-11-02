import type { SeoText } from '../text.ts';

export default {
  tagline: 'Medību lauks tavam kaķim',
  genre: 'Spēle kaķiem',
  howTitle: 'Kā spēlēt',
  how: [
    'Noliec planšeti vai tālruni horizontāli vai atver lapu televizorā.',
    'Izvēlies dzīvniekus, to skaitu, krāsas un ainavu, tad pieskaries “Spēlēt”.',
    'Lai atgrieztos izvēlnē, turi nospiestu pogu augšējā labajā stūrī: ķepa to nevar atvērt nejauši.',
  ],
  faqTitle: 'Biežāk uzdotie jautājumi',
  faq: [
    ['Kāda planšetes spēle der manam kaķim?',
      'Tāda, kurā kaut kas mazs kustas raustīgi, apstājas un paslēpjas: tieši tas pamodina medību instinktu. Meowtrix ir ķirzakas, peles, kukaiņi, putni, zivis, tauriņi, spalvas un lāzera punkts, kas uzvedas tieši tā, ar skaņām. Izmēģini vairākus: katram kaķim ir savi favorīti.'],
    ['Vai ekrāna spēles ir labas kaķiem?',
      'Tās labi nodarbina mājas kaķi, ja vien paliek viena no daudzām rotaļām. Mijā tās ar īstām rotaļlietām, ko kaķis var noķert un sakost, esi tuvumā un pārtrauc, ja ekrāns šķiet viņu kaitinām.'],
    ['Cik ilgi jāilgst spēlei?',
      'Labāk vairākas īsas spēles pa 5–15 minūtēm nekā viena gara. Iestatījumos izvēlies ilgumu: pēdējā minūtē dzīvnieki nogurst, lai kaķis beigtu ar lomu, un tad Meowtrix parāda rezultātu. Gardums uzreiz pēc tam ir lielisks medību noslēgums.'],
    ['Kā pasargāt ekrānu no nagiem?',
      'Parasti pietiek ar rūdītu stiklu vai aizsargplēvi, un regulāri apgriezti nagi arī palīdz. Noliec ierīci horizontāli uz stabilas virsmas.'],
    ['Vai tas darbojas televizorā?',
      'Jā: atver meowtrix.mbonnici.fr televizora pārlūkā vai pārraidi cilni no datora. Televizorā kaķis vēro un seko dzīvniekiem, bet nevar tiem pieskarties.'],
    ['Kāpēc zaļš vai zils lāzera punkts?',
      'Kaķi zilo un zaļo redz labāk nekā sarkano; arī sarkanais der, jo galvenais ir kustība. Atšķirībā no īsta lāzera šo punktu var noķert: tas uz brīdi paliek zem ķepas, un loms tiek ieskaitīts.'],
    ['Mans kaķis nereaģē. Ko darīt?',
      'Nedaudz palielini skaņu, izvēlies lielākus dzīvniekus (cilne Ainava) vai lēnāku ātrumu un aptumšo gaismu. Daži kaķi dod priekšroku pelēm, citi – zivīm vai lāzera punktam.'],
    ['Vai tiešām bez maksas? Un mani dati?',
      'Jā: bez maksas, bez reklāmām, bez konta un bez izsekošanas. Iestatījumi paliek tavā ierīcē. Mikrofons nav obligāts un tikai liek dzīvniekiem sabīties no trokšņa; nekas netiek ierakstīts vai nosūtīts.'],
  ],
  otherPages: 'Citas lapas',
  languages: 'Citās valodās',
  note: 'Meowtrix ir personīgs projekts',
  source: 'pirmkods GitHub',
  pages: {
    home: {
      name: 'Sākums',
      title: 'Meowtrix – Bezmaksas spēle kaķiem planšetē, tālrunī un TV',
      description: 'Ķirzakas, peles, zivis, tauriņi, lāzera punkts: 3D spēle, kurā tavs kaķis medī uz ekrāna. Bez maksas, bez reklāmām un lietotnes, planšetē vai televizorā.',
      imageAlt: 'Ķirzakas, varde un kukaiņi 3D formātā ap lapu, akmeni un vecu zābaku',
      body: `<h2>Bezmaksas spēle kaķiem planšetē, tālrunī vai televizorā</h2>
<p>Meowtrix pārvērš ekrānu medību laukā: 3D dzīvnieki staigā apkārt, slēpjas un aizbēg, kad ķepa tiem pieskaras. Tas ir bez maksas, bez reklāmām, bez konta un bez instalējamas lietotnes: lapa atveras pārlūkā un pārslēdzas pilnekrāna režīmā.</p>
<h3>Trīs pasaules medībām</h3>
<ul>
<li><strong>Zeme</strong>: ķirzakas, vardes, mušas, mārītes, vaboles, sienāži, prusaki, peles, vāveres un putni, kas slēpjas zem lapām, akmeņiem vai vecā zābakā.</li>
<li><strong><a href="{water}">Ūdens</a></strong>: zelta zivtiņas, koi karpas, sardīņu bars, foreles, laši un haizivju mazuļi; katrs ķepas sitiens rada apļus ūdenī.</li>
<li><strong><a href="{sky}">Debesis</a></strong>: tauriņi, jāņtārpiņi, vēja nestas spalvas un lāzera punkts, dienā, krēslā vai mēnesnīcā.</li>
</ul>
<p>Svētkos viss pats pārģērbjas īstajā laikā: <a href="{christmas}">Ziemassvētki</a> (cepures un sniegs), <a href="{halloween}">Helovīns</a> (raganu cepures un ķirbji) un <a href="{easter}">Lieldienas</a> (zaķa ausis un milzu olas). Pikseļu stils piešķir retro videospēles izskatu.</p>
<h3>Domāts par kaķa labsajūtu</h3>
<p>Taimeris piedāvā 5, 10 vai 15 minūšu spēles; beigās dzīvnieki nogurst, lai kaķis beigtu ar lomu. Skaitītājs saglabā lomus, ar kuriem dalīties ar draugiem. Skaņas tiek radītas tiešraidē, un, ja atļausi, mikrofons liks dzīvniekiem sabīties no trokšņiem istabā.</p>
<h3>Spēle, kas pielāgojas jūsu kaķim</h3>
<p>Automātiskais ātrums palēnina dzīvniekus, kad kaķis pieskaras, bet nenoķer, un paātrina tos, kad noķer visu. Ik pa laikam pār ekrānu pāriet garāmgājējs dzīvnieks vai ēna visus aizbiedē. Kāpuri, lēni un viegli noķerami, piemēroti kaķēniem un veciem kaķiem. Statistika glabā ķērienus pa dienām un mīļāko medījumu; režīms „planšete statīvā“ pats sāk jaunu sesiju pēc vienas, divām vai četrām stundām, dienām, kad jūs neesat mājās.</p>`,
    },
    water: {
      name: 'Ūdens',
      title: 'Zivju spēle kaķiem planšetē – Meowtrix',
      description: 'Zelta zivtiņas, koi karpas, sardīņu bars un haizivju mazuļi peld zem ūdens: bezmaksas makšķerēšanas spēle tavam kaķim planšetē, tālrunī vai TV.',
      imageAlt: 'Koi karpas, zelta zivtiņa, forele un sardīņu bars starp ūdensrozēm, klinti un aļģēm',
      body: `<h2>Zivis, ko tavs kaķis var noķert</h2>
<p>Tēmā Ūdens 3D zivis peld zem viļņotas, mirdzošas virsmas. Ziņkārīgās zelta zivtiņas pūš burbuļus; koi lēni slīd un paceļas pie virsmas; sardīnes peld ciešā barā un pēkšņi izklīst; foreles un laši šaujas zem klintīm; haizivju mazuļi patrulē ar paceltu spuru.</p>
<p>Katrs ķepas sitiens rada apļus ūdenī un nelielu šļakatu. Zivis apiet klintis, ienirst zem tām, lai paslēptos, un iznāk ārā, kad atkal ir miers.</p>
<h3>Ainavas</h3>
<p>Dīķis, lagūna vai upe ar ūdensrozēm, klintīm un aļģēm, kur paslēpties. Katrai zivij ir vairākas krāsas: kohaku, showa vai ogon koi, varavīksnes vai strauta forele, zebrhaizivs vai vaļhaizivs…</p>`,
    },
    sky: {
      name: 'Debesis',
      title: 'Tauriņi, spalvas un lāzera punkts kaķiem – Meowtrix',
      description: 'Plivinoši tauriņi, mirgojoši jāņtārpiņi, spalvas vējā un lāzera punkts: bezmaksas spēle kaķiem planšetē, tālrunī vai televizorā.',
      imageAlt: 'Tauriņi, spalva un lāzera punkts ziedošā pļavā',
      body: `<h2>Tauriņi, jāņtārpiņi, spalvas un lāzera punkts</h2>
<p>Tēma Debesis apvieno visu, kas lido, lidinās un joņo. Tauriņi (monarhs, zilais morfo, kāpostu baltenis, dienas pāvacs, citronsārtenis) plivinās zigzagā, nosēžas un izpleš spārnus saulē. Jāņtārpiņi lidinās mirgodami, brīnišķīgi mēnesnīcā. Spalvas šūpodamās krīt lejup, tad vējš liek tām slīdēt un pacelties.</p>
<h3>Lāzera punkts, ko var noķert</h3>
<p>Lāzera punkts kustas kā īsta roka: tas joņo, strauji apstājas, nedaudz trīcot, griežas pa apli, lēnām pielavās, izslīd no ekrāna un atgriežas. Tas bēg, kad ķepa tuvojas, bet atšķirībā no īsta lāzera tavs kaķis to var noķert: punkts uz brīdi paliek zem ķepas, un loms tiek ieskaitīts. Sarkans, zaļš vai zils.</p>
<h3>Ainavas</h3>
<p>Ziedoša pļava dienas vidū, krēslas zeltainā gaisma vai mēnesnīca, kurā mirdz jāņtārpiņi un lāzers. Tulpes, zāles ceri un akmeņi papildina ainu.</p>`,
    },
    christmas: {
      name: 'Ziemassvētki',
      title: 'Ziemassvētku spēle kaķiem: sniegs un cepures – Meowtrix',
      description: 'Krītošs sniegs, Ziemassvētku vecīša cepures un zeķe, kur paslēpties: Meowtrix Ziemassvētku versija, bezmaksas spēle kaķiem planšetē, tālrunī un TV.',
      imageAlt: 'Sniegs, Ziemassvētku zeķe un dzīvnieki ar Ziemassvētku vecīša cepurēm',
      body: `<h2>Ziemassvētki tavam kaķim</h2>
<p>Sniegs krīt un pārklāj zemi, katrs dzīvnieks nēsā Ziemassvētku vecīša cepuri, un liela sarkana zeķe kalpo par slēptuvi. Ķirzakas, peles, zivis vai tauriņi: visas tēmas iegūst Ziemassvētku noskaņu.</p>
<p>No 1. decembra līdz 6. janvārim Meowtrix ar iestatījumu Auto pats ietērpjas Ziemassvētku rotā. Šī lapa to ieslēdz visu gadu.</p>`,
    },
    halloween: {
      name: 'Helovīns',
      title: 'Helovīna spēle kaķiem: ķirbji un sikspārņi – Meowtrix',
      description: 'Spīdoši ķirbji, sikspārņi, ogles un raganu cepures: Meowtrix Helovīna versija, bezmaksas spēle kaķiem planšetē un televizorā.',
      imageAlt: 'Izgrebti ķirbji, sikspārņi un dzīvnieki ar raganu cepurēm',
      body: `<h2>Helovīns tavam kaķim</h2>
<p>Gaisma kļūst oranža, gaisā paceļas dzirksteles, sikspārņi riņķo virs ainas, un katrs dzīvnieks nēsā raganas cepuri. Spīdošs izgrebts ķirbis kalpo par slēptuvi.</p>
<p>No oktobra vidus līdz 2. novembrim Meowtrix ar iestatījumu Auto pats pārslēdzas uz Helovīnu. Šī lapa to ieslēdz visu gadu.</p>`,
    },
    easter: {
      name: 'Lieldienas',
      title: 'Lieldienu spēle kaķiem: olas un zaķa ausis – Meowtrix',
      description: 'Zaķa ausis, milzu olas uz šokolādes olām un ziedlapiņu lietus: Meowtrix Lieldienu versija, bezmaksas spēle kaķiem.',
      imageAlt: 'Milzīgas Lieldienu olas, tulpes un dzīvnieki ar zaķa ausīm',
      body: `<h2>Lieldienas tavam kaķim</h2>
<p>Ziedlapiņas lēnām krīt, katram dzīvniekam ir zaķa ausis, un lielas rotātas olas, kas balstās uz šokolādes olām, kalpo par slēptuvēm.</p>
<p>Ap Lieldienām Meowtrix ar iestatījumu Auto pats saposies. Šī lapa to ieslēdz visu gadu.</p>`,
    },
  },
} satisfies SeoText;
