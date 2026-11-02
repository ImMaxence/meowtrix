import type { SeoText } from '../text.ts';

export default {
  tagline: 'Metsästysmaa kissallesi',
  genre: 'Peli kissoille',
  howTitle: 'Näin pelaat',
  how: [
    'Aseta tabletti tai puhelin vaakatasoon, tai avaa sivu televisiossa.',
    'Valitse eläimet, niiden määrä, värit ja maisema, ja napauta sitten ”Pelaa”.',
    'Palaa valikkoon pitämällä oikean yläkulman painiketta painettuna: tassu ei voi avata sitä vahingossa.',
  ],
  faqTitle: 'Usein kysyttyä',
  faq: [
    ['Mikä on hyvä tablettipeli kissalleni?',
      'Sellainen, jossa jokin pieni liikkuu nykäyksittäin, pysähtyy ja piiloutuu: se herättää metsästysvaiston. Meowtrixissa on liskoja, hiiriä, hyönteisiä, lintuja, kaloja, perhosia, höyheniä ja laserpiste, jotka käyttäytyvät juuri niin, ääniä myöten. Kokeile useampaa: jokaisella kissalla on suosikkinsa.'],
    ['Ovatko näyttöpelit hyväksi kissoille?',
      'Ne pitävät sisäkissan hyvin puuhassa, kunhan ne ovat yksi leikki muiden joukossa. Vaihtele oikeiden lelujen kanssa, joita kissa voi napata ja purra, pysy lähellä ja lopeta, jos näyttö tuntuu turhauttavan sitä.'],
    ['Kuinka pitkä pelikerran pitäisi olla?',
      'Mieluummin useita lyhyitä, 5–15 minuutin kertoja kuin yksi pitkä. Valitse pituus asetuksista: viimeisellä minuutilla eläimet väsyvät, jotta kissa lopettaa saaliiseen, ja sitten Meowtrix näyttää tuloksen. Herkku heti perään on hyvä päätös metsästykselle.'],
    ['Miten suojaan näytön kynsiltä?',
      'Karkaistu lasi tai suojakalvo riittää yleensä, ja säännöllisesti leikatut kynnet auttavat myös. Aseta laite vaakatasoon tukevalle alustalle.'],
    ['Toimiiko se televisiossa?',
      'Kyllä: avaa meowtrix.mbonnici.fr television selaimessa tai suoratoista välilehti tietokoneelta. Televisiossa kissa katselee ja seuraa eläimiä, mutta ei voi koskea niihin.'],
    ['Miksi vihreä tai sininen laserpiste?',
      'Kissat näkevät sinisen ja vihreän paremmin kuin punaisen; punainenkin toimii, koska tärkeintä on liike. Toisin kuin oikean laserin, tämän pisteen voi napata: se jää hetkeksi tassun alle, ja saalis lasketaan.'],
    ['Kissani ei reagoi. Mitä teen?',
      'Lisää ääntä hieman, valitse isommat eläimet (Maisema-välilehti) tai hitaampi nopeus ja himmennä valoja. Jotkut kissat pitävät enemmän hiiristä, toiset kaloista tai laserpisteestä.'],
    ['Onko se oikeasti ilmainen? Entä tietoni?',
      'Kyllä: ilmainen, ei mainoksia, ei tiliä eikä seurantaa. Asetukset pysyvät laitteellasi. Mikrofoni on vapaaehtoinen ja saa eläimet vain säikähtämään melua; mitään ei tallenneta eikä lähetetä.'],
  ],
  otherPages: 'Muut sivut',
  languages: 'Muilla kielillä',
  note: 'Meowtrix on henkilökohtainen projekti',
  source: 'lähdekoodi GitHubissa',
  pages: {
    home: {
      name: 'Etusivu',
      title: 'Meowtrix – Ilmainen kissapeli tabletille, puhelimelle ja TV:lle',
      description: 'Liskoja, hiiriä, kaloja, perhosia, laserpiste: 3D-peli, jossa kissasi metsästää näytöllä. Ilmainen, ei mainoksia eikä sovellusta, tabletilla tai TV:ssä.',
      imageAlt: 'Liskoja, sammakko ja hyönteisiä 3D:nä lehden, kiven ja vanhan saappaan ympärillä',
      body: `<h2>Ilmainen peli kissoille, tabletilla, puhelimella tai televisiossa</h2>
<p>Meowtrix muuttaa näytön metsästysmaaksi: 3D-eläimet kuljeskelevat, piiloutuvat ja pinkaisevat pakoon, kun tassu koskee niihin. Se on ilmainen, ilman mainoksia, ilman tiliä ja ilman asennettavaa sovellusta: sivu aukeaa selaimessa ja siirtyy koko näytön tilaan.</p>
<h3>Kolme maailmaa metsästettäväksi</h3>
<ul>
<li><strong>Maa</strong>: liskoja, sammakoita, kärpäsiä, leppäkerttuja, kovakuoriaisia, heinäsirkkoja, torakoita, hiiriä, oravia ja lintuja, jotka piiloutuvat lehtien ja kivien alle tai vanhaan saappaaseen.</li>
<li><strong><a href="{water}">Vesi</a></strong>: kultakaloja, koikarppeja, sardiiniparvi, taimenia, lohia ja hainpoikasia; jokainen tassunisku piirtää renkaita veteen.</li>
<li><strong><a href="{sky}">Taivas</a></strong>: perhosia, tulikärpäsiä, tuulessa leijuvia höyheniä ja laserpiste, päivällä, hämärässä tai kuutamossa.</li>
</ul>
<p>Juhlapyhinä kaikki pukeutuu itsestään oikeaan aikaan: <a href="{christmas}">joulu</a> (tonttulakit ja lunta), <a href="{halloween}">halloween</a> (noitahatut ja kurpitsat) ja <a href="{easter}">pääsiäinen</a> (pupunkorvat ja jättimunat). Pikselityyli antaa retropelin tunnelman.</p>
<h3>Kissan hyvinvointi mielessä</h3>
<p>Ajastin tarjoaa 5, 10 tai 15 minuutin pelikertoja; lopussa eläimet väsyvät, jotta kissa lopettaa saaliiseen. Laskuri pitää kirjaa saaliista, joita voi jakaa ystäville. Äänet luodaan reaaliajassa, ja jos sallit, mikrofoni saa eläimet säikähtämään huoneen ääniä.</p>`,
    },
    water: {
      name: 'Vesi',
      title: 'Kalapeli kissoille tabletilla – Meowtrix',
      description: 'Kultakalat, koikarpit, sardiiniparvi ja hainpoikaset uivat veden alla: ilmainen kalastuspeli kissallesi, tabletilla, puhelimella tai TV:ssä.',
      imageAlt: 'Koikarppeja, kultakala, taimen ja sardiiniparvi lumpeiden, kallion ja levien keskellä',
      body: `<h2>Kaloja kissasi pyydettäväksi</h2>
<p>Vesi-teemassa 3D-kalat uivat aaltoilevan, kimaltelevan pinnan alla. Uteliaat kultakalat puhaltavat kuplia; koit liukuvat hitaasti ja nousevat haukkaamaan pinnalta; sardiinit uivat tiiviissä parvessa ja hajaantuvat kerralla; taimenet ja lohet syöksyvät kallioiden alle; hainpoikaset partioivat evä pystyssä.</p>
<p>Jokainen tassunisku piirtää renkaita veteen ja saa aikaan pienen loiskahduksen. Kalat kiertävät kallioita, sukeltavat niiden alle piiloon ja tulevat esiin, kun on taas rauhallista.</p>
<h3>Maisemat</h3>
<p>Lampi, laguuni tai joki, jossa lumpeet, kalliot ja levät tarjoavat piilopaikkoja. Jokaisella kalalla on useita värejä: kohaku, showa tai ogon koille, kirjolohi tai purotaimen, seeprahai tai valashai…</p>`,
    },
    sky: {
      name: 'Taivas',
      title: 'Perhosia, höyheniä ja laserpiste kissoille – Meowtrix',
      description: 'Lepattavia perhosia, välkkyviä tulikärpäsiä, höyheniä tuulessa ja laserpiste: ilmainen peli kissoille, tabletilla, puhelimella tai TV:ssä.',
      imageAlt: 'Perhosia, höyhen ja laserpiste kukkaniityllä',
      body: `<h2>Perhosia, tulikärpäsiä, höyheniä ja laserpiste</h2>
<p>Taivas-teema kokoaa yhteen kaiken, mikä lentää, leijuu ja kiitää. Perhoset (monarkki, sininen morfo, kaaliperhonen, neitoperhonen, sitruunaperhonen) lepattavat siksakkia, laskeutuvat ja levittävät siipensä aurinkoon. Tulikärpäset leijuvat välkkyen, upeita kuutamossa. Höyhenet keinuvat alas, ja sitten tuuli liu’uttaa ja nostaa niitä.</p>
<h3>Laserpiste, jonka voi napata</h3>
<p>Laserpiste liikkuu kuin oikea käsi: se kiitää, pysähtyy äkisti hieman väristen, kiertää ympyrää, hiipii lähemmäs, livahtaa pois näytöltä ja palaa. Se pakenee, kun tassu lähestyy, mutta toisin kuin oikean laserin, kissasi voi napata sen: piste jää hetkeksi tassun alle, ja saalis lasketaan. Punainen, vihreä tai sininen.</p>
<h3>Maisemat</h3>
<p>Kukkaniitty keskellä päivää, hämärän kultainen valo tai kuutamo, jossa tulikärpäset ja laser loistavat. Tulppaanit, ruohotuppaat ja kivet täydentävät näkymän.</p>`,
    },
    christmas: {
      name: 'Joulu',
      title: 'Joulupeli kissoille: lunta ja tonttulakit – Meowtrix',
      description: 'Satavaa lunta, tonttulakit ja sukka piiloutumiseen: Meowtrixin jouluversio, ilmainen kissapeli tabletille, puhelimelle ja TV:lle.',
      imageAlt: 'Lunta, joulusukka ja eläimiä tonttulakit päässä',
      body: `<h2>Joulu kissallesi</h2>
<p>Lunta sataa ja maa peittyy, jokaisella eläimellä on tonttulakki ja iso punainen sukka toimii piilopaikkana. Liskot, hiiret, kalat tai perhoset: kaikki teemat saavat jouluasun.</p>
<p>1. joulukuuta–6. tammikuuta Meowtrix pukeutuu jouluun itsestään Auto-asetuksella. Tämä sivu pitää sen päällä ympäri vuoden.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Halloween-peli kissoille: kurpitsoja ja lepakoita – Meowtrix',
      description: 'Hehkuvia kurpitsoja, lepakoita, hiillosta ja noitahattuja: Meowtrixin halloween-versio, ilmainen kissapeli tabletille ja TV:lle.',
      imageAlt: 'Kaiverrettuja kurpitsoja, lepakoita ja eläimiä noitahatut päässä',
      body: `<h2>Halloween kissallesi</h2>
<p>Valo muuttuu oranssiksi, kipinät nousevat ilmaan, lepakot kaartelevat näkymän yllä ja jokaisella eläimellä on noitahattu. Hehkuva kaiverrettu kurpitsa toimii piilopaikkana.</p>
<p>Lokakuun puolivälistä 2. marraskuuta Meowtrix siirtyy halloweeniin itsestään Auto-asetuksella. Tämä sivu pitää sen päällä ympäri vuoden.</p>`,
    },
    easter: {
      name: 'Pääsiäinen',
      title: 'Pääsiäispeli kissoille: munia ja pupunkorvat – Meowtrix',
      description: 'Pupunkorvat, suklaamunien päällä lepäävät jättimunat ja terälehtisade: Meowtrixin pääsiäisversio, ilmainen peli kissoille.',
      imageAlt: 'Jättimäisiä pääsiäismunia, tulppaaneja ja eläimiä pupunkorvilla',
      body: `<h2>Pääsiäinen kissallesi</h2>
<p>Terälehtiä leijailee hiljalleen alas, jokaisella eläimellä on pupunkorvat, ja suklaamunien päällä lepäävät isot koristellut munat toimivat piilopaikkoina.</p>
<p>Pääsiäisen aikaan Meowtrix pukeutuu itsestään Auto-asetuksella. Tämä sivu pitää sen päällä ympäri vuoden.</p>`,
    },
  },
} satisfies SeoText;
