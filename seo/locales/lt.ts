import type { SeoText } from '../text.ts';

export default {
  tagline: 'Medžioklės plotas tavo katei',
  genre: 'Žaidimas katėms',
  howTitle: 'Kaip žaisti',
  how: [
    'Paguldyk planšetę ar telefoną arba atidaryk puslapį televizoriuje.',
    'Pasirink gyvūnus, jų kiekį, spalvas ir aplinką, tada paliesk „Žaisti“.',
    'Norėdamas grįžti į meniu, palaikyk nuspaudęs mygtuką viršutiniame dešiniajame kampe: letena jo netyčia neatidarys.',
  ],
  faqTitle: 'Dažnai užduodami klausimai',
  faq: [
    ['Koks planšetės žaidimas tinka mano katei?',
      'Toks, kuriame kažkas mažo juda trūkčiodamas, sustoja ir pasislepia: būtent tai pažadina medžioklės instinktą. Meowtrix turi driežų, pelių, vabzdžių, paukščių, žuvų, drugelių, plunksnų ir lazerio tašką, kurie elgiasi būtent taip, su garsais. Išbandyk kelis: kiekviena katė turi savo mėgstamiausius.'],
    ['Ar žaidimai ekrane naudingi katėms?',
      'Jie gerai užima namuose gyvenančią katę, jei lieka vienu žaidimu iš daugelio. Kaitaliok su tikrais žaislais, kuriuos ji gali pagauti ir kandžioti, būk šalia ir sustok, jei ekranas, atrodo, ją erzina.'],
    ['Kiek turėtų trukti žaidimas?',
      'Geriau keli trumpi, 5–15 minučių žaidimai nei vienas ilgas. Nustatymuose pasirink trukmę: paskutinę minutę gyvūnai pavargsta, kad katė baigtų su laimikiu, tada Meowtrix parodo rezultatą. Skanėstas iškart po to – puiki medžioklės pabaiga.'],
    ['Kaip apsaugoti ekraną nuo nagų?',
      'Paprastai užtenka grūdinto stiklo ar apsauginės plėvelės, o reguliariai kerpami nagai irgi padeda. Paguldyk įrenginį ant stabilaus paviršiaus.'],
    ['Ar veikia televizoriuje?',
      'Taip: atidaryk meowtrix.mbonnici.fr televizoriaus naršyklėje arba transliuok skirtuką iš kompiuterio. Televizoriuje katė stebi ir seka gyvūnus, bet negali jų paliesti.'],
    ['Kodėl žalias ar mėlynas lazerio taškas?',
      'Katės mėlyną ir žalią mato geriau nei raudoną; raudonas irgi tinka, nes svarbiausia – judesys. Skirtingai nuo tikro lazerio, šį tašką galima pagauti: jis akimirką lieka po letena, ir laimikis įskaitomas.'],
    ['Mano katė nereaguoja. Ką daryti?',
      'Šiek tiek pagarsink garsą, pasirink didesnius gyvūnus (skirtukas Aplinka) arba lėtesnį greitį ir pritemdyk šviesą. Vienos katės labiau mėgsta peles, kitos – žuvis ar lazerio tašką.'],
    ['Ar tikrai nemokama? O mano duomenys?',
      'Taip: nemokama, be reklamų, be paskyros ir be sekimo. Nustatymai lieka tavo įrenginyje. Mikrofonas neprivalomas ir tik priverčia gyvūnus krūptelėti nuo triukšmo; niekas neįrašoma ir nesiunčiama.'],
  ],
  otherPages: 'Kiti puslapiai',
  languages: 'Kitomis kalbomis',
  note: 'Meowtrix yra asmeninis projektas',
  source: 'pirminis kodas GitHub',
  pages: {
    home: {
      name: 'Pradžia',
      title: 'Meowtrix – Nemokamas žaidimas katėms planšetėje, telefone ir TV',
      description: 'Driežai, pelės, žuvys, drugeliai, lazerio taškas: 3D žaidimas, kuriame tavo katė medžioja ekrane. Nemokamas, be reklamų ir programėlių, planšetėje ar televizoriuje.',
      imageAlt: 'Driežai, varlė ir vabzdžiai 3D formatu prie lapo, akmens ir seno bato',
      body: `<h2>Nemokamas žaidimas katėms planšetėje, telefone ar televizoriuje</h2>
<p>Meowtrix paverčia ekraną medžioklės plotu: 3D gyvūnai vaikštinėja, slepiasi ir pabėga, kai letena juos paliečia. Tai nemokama, be reklamų, be paskyros ir be programėlės diegimo: puslapis atsidaro naršyklėje ir persijungia į viso ekrano režimą.</p>
<h3>Trys pasauliai medžioklei</h3>
<ul>
<li><strong>Žemė</strong>: driežai, varlės, musės, boružės, vabalai, žiogai, tarakonai, pelės, voverės ir paukščiai, kurie slepiasi po lapais, akmenimis ar sename bate.</li>
<li><strong><a href="{water}">Vanduo</a></strong>: auksinės žuvelės, koi karpiai, sardinių būrys, upėtakiai, lašišos ir ryklių jaunikliai; kiekvienas letenos smūgis sukelia ratilus vandenyje.</li>
<li><strong><a href="{sky}">Dangus</a></strong>: drugeliai, jonvabaliai, vėjo nešamos plunksnos ir lazerio taškas, dieną, sutemose ar mėnesienoje.</li>
</ul>
<p>Šventėms viskas pasipuošia savaime tinkamu metu: <a href="{christmas}">Kalėdos</a> (kepurės ir sniegas), <a href="{halloween}">Helovinas</a> (raganų skrybėlės ir moliūgai) ir <a href="{easter}">Velykos</a> (kiškio ausys ir milžiniški kiaušiniai). Pikselių stilius suteikia retro vaizdo žaidimo išvaizdą.</p>
<h3>Sukurta galvojant apie katės gerovę</h3>
<p>Laikmatis siūlo 5, 10 ar 15 minučių žaidimus; pabaigoje gyvūnai pavargsta, kad katė baigtų su laimikiu. Skaitiklis saugo jos laimikius, kuriais galima pasidalinti su draugais. Garsai kuriami tiesiogiai, o jei leisi, mikrofonas privers gyvūnus krūptelėti nuo kambario garsų.</p>`,
    },
    water: {
      name: 'Vanduo',
      title: 'Žuvų žaidimas katėms planšetėje – Meowtrix',
      description: 'Auksinės žuvelės, koi karpiai, sardinių būrys ir ryklių jaunikliai plaukioja po vandeniu: nemokamas žvejybos žaidimas tavo katei planšetėje, telefone ar TV.',
      imageAlt: 'Koi karpiai, auksinė žuvelė, upėtakis ir sardinių būrys tarp vandens lelijų, uolos ir dumblių',
      body: `<h2>Žuvys, kurias tavo katė gali pagauti</h2>
<p>Temoje Vanduo 3D žuvys plaukioja po banguojančiu, mirguliuojančiu paviršiumi. Smalsios auksinės žuvelės leidžia burbulus; koi lėtai slysta ir kyla prie paviršiaus; sardinės plaukia tankiu būriu ir staiga išsisklaido; upėtakiai ir lašišos nuneria po uolomis; ryklių jaunikliai patruliuoja iškėlę peleką.</p>
<p>Kiekvienas letenos smūgis sukelia ratilus vandenyje ir mažą pliūptelėjimą. Žuvys aplenkia uolas, panyra po jomis pasislėpti ir vėl išnyra, kai viskas nurimsta.</p>
<h3>Aplinkos</h3>
<p>Tvenkinys, lagūna ar upė su vandens lelijomis, uolomis ir dumbliais, kur galima pasislėpti. Kiekviena žuvis turi kelias spalvas: kohaku, showa ar ogon koi, vaivorykštinis ar paprastas upėtakis, zebrinis ar banginis ryklys…</p>`,
    },
    sky: {
      name: 'Dangus',
      title: 'Drugeliai, plunksnos ir lazerio taškas katėms – Meowtrix',
      description: 'Plazdantys drugeliai, mirksintys jonvabaliai, plunksnos vėjyje ir lazerio taškas: nemokamas žaidimas katėms planšetėje, telefone ar televizoriuje.',
      imageAlt: 'Drugeliai, plunksna ir lazerio taškas žydinčioje pievoje',
      body: `<h2>Drugeliai, jonvabaliai, plunksnos ir lazerio taškas</h2>
<p>Tema Dangus sujungia viską, kas skraido, sklando ir lekia. Drugeliai (monarchas, mėlynasis morfas, kopūstinis baltukas, dieninis povas, citrinukas) plazda zigzagu, nutupia ir išskleidžia sparnus saulėje. Jonvabaliai sklando mirksėdami, nuostabūs mėnesienoje. Plunksnos supdamosi leidžiasi, o tada vėjas jas nuneša ir pakelia.</p>
<h3>Lazerio taškas, kurį galima pagauti</h3>
<p>Lazerio taškas juda kaip tikra ranka: lekia, staiga sustoja šiek tiek drebėdamas, sukasi ratu, lėtai sėlina arčiau, išslysta iš ekrano ir sugrįžta. Jis bėga, kai artėja letena, bet skirtingai nuo tikro lazerio tavo katė gali jį pagauti: taškas akimirką lieka po letena, ir laimikis įskaitomas. Raudonas, žalias ar mėlynas.</p>
<h3>Aplinkos</h3>
<p>Žydinti pieva vidury dienos, auksinė sutemų šviesa ar mėnesiena, kurioje šviečia jonvabaliai ir lazeris. Tulpės, žolės kuokšteliai ir akmenys papildo vaizdą.</p>`,
    },
    christmas: {
      name: 'Kalėdos',
      title: 'Kalėdinis žaidimas katėms: sniegas ir kepurės – Meowtrix',
      description: 'Krintantis sniegas, Kalėdų Senelio kepurės ir kojinė pasislėpti: kalėdinė Meowtrix versija, nemokamas žaidimas katėms planšetėje, telefone ir TV.',
      imageAlt: 'Sniegas, kalėdinė kojinė ir gyvūnai su Kalėdų Senelio kepurėmis',
      body: `<h2>Kalėdos tavo katei</h2>
<p>Sniegas krenta ir dengia žemę, kiekvienas gyvūnas dėvi Kalėdų Senelio kepurę, o didelė raudona kojinė tampa slėptuve. Driežai, pelės, žuvys ar drugeliai: visos temos įgauna kalėdinę nuotaiką.</p>
<p>Nuo gruodžio 1 iki sausio 6 dienos Meowtrix su nustatymu Auto pats pasipuošia Kalėdoms. Šis puslapis tai įjungia visus metus.</p>`,
    },
    halloween: {
      name: 'Helovinas',
      title: 'Helovino žaidimas katėms: moliūgai ir šikšnosparniai – Meowtrix',
      description: 'Švytintys moliūgai, šikšnosparniai, žarijos ir raganų skrybėlės: Helovino Meowtrix versija, nemokamas žaidimas katėms planšetėje ir televizoriuje.',
      imageAlt: 'Išskaptuoti moliūgai, šikšnosparniai ir gyvūnai su raganų skrybėlėmis',
      body: `<h2>Helovinas tavo katei</h2>
<p>Šviesa tampa oranžinė, į orą kyla žarijos, šikšnosparniai sukasi virš scenos, o kiekvienas gyvūnas dėvi raganos skrybėlę. Švytintis išskaptuotas moliūgas tampa slėptuve.</p>
<p>Nuo spalio vidurio iki lapkričio 2 dienos Meowtrix su nustatymu Auto pats persijungia į Heloviną. Šis puslapis tai įjungia visus metus.</p>`,
    },
    easter: {
      name: 'Velykos',
      title: 'Velykinis žaidimas katėms: kiaušiniai ir kiškio ausys – Meowtrix',
      description: 'Kiškio ausys, milžiniški kiaušiniai ant šokoladinių kiaušinių ir žiedlapių lietus: velykinė Meowtrix versija, nemokamas žaidimas katėms.',
      imageAlt: 'Milžiniški Velykų kiaušiniai, tulpės ir gyvūnai su kiškio ausimis',
      body: `<h2>Velykos tavo katei</h2>
<p>Žiedlapiai lėtai krenta, kiekvienas gyvūnas turi kiškio ausis, o dideli marginti kiaušiniai, padėti ant šokoladinių kiaušinių, tampa slėptuvėmis.</p>
<p>Apie Velykas Meowtrix su nustatymu Auto pats pasipuošia. Šis puslapis tai įjungia visus metus.</p>`,
    },
  },
} satisfies SeoText;
