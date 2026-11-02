import type { SeoText } from '../text.ts';

export default {
  tagline: 'Ein Jagdrevier für deine Katze',
  genre: 'Spiel für Katzen',
  howTitle: 'So wird gespielt',
  how: [
    'Leg das Tablet oder Handy flach hin, oder öffne die Seite auf dem Fernseher.',
    'Wähle die Tiere, ihre Anzahl, ihre Färbung und die Kulisse, dann tippe auf „Spielen“.',
    'Um zum Menü zurückzukehren, halte die Taste oben rechts gedrückt: Eine Pfote kann es nicht aus Versehen öffnen.',
  ],
  faqTitle: 'Häufige Fragen',
  faq: [
    ['Welches Tablet-Spiel ist gut für meine Katze?',
      'Eines, bei dem sich etwas Kleines ruckartig bewegt, anhält und versteckt: Das weckt den Jagdinstinkt. Meowtrix hat Eidechsen, Mäuse, Insekten, Vögel, Fische, Schmetterlinge, Federn und einen Laserpunkt, die sich genau so verhalten, mit Geräuschen. Probier mehrere aus: Jede Katze hat ihre Lieblinge.'],
    ['Sind Bildschirmspiele gut für Katzen?',
      'Sie beschäftigen Wohnungskatzen gut, solange sie ein Spiel unter vielen bleiben. Wechsle mit echtem Spielzeug ab, das sie fangen und beißen kann, bleib in der Nähe und hör auf, wenn der Bildschirm sie zu frustrieren scheint.'],
    ['Wie lange sollte eine Spielrunde dauern?',
      'Mehrere kurze Runden von 5 bis 15 Minuten sind besser als eine lange. Wähle in den Einstellungen eine Dauer: In der letzten Minute werden die Tiere müde, damit deine Katze mit einem Fang aufhört, dann zeigt Meowtrix ihr Ergebnis. Ein Leckerli direkt danach rundet die Jagd ab.'],
    ['Wie schütze ich den Bildschirm vor Krallen?',
      'Ein Panzerglas oder eine Schutzfolie reicht meist aus, und regelmäßig gekürzte Krallen helfen auch. Leg das Gerät flach auf eine stabile Unterlage.'],
    ['Funktioniert es auf dem Fernseher?',
      'Ja: Öffne meowtrix.mbonnici.fr im Browser des Fernsehers oder streame den Tab von einem Computer. Auf dem Fernseher schaut die Katze zu und verfolgt die Tiere, kann sie aber nicht berühren.'],
    ['Warum ein grüner oder blauer Laserpunkt?',
      'Katzen sehen Blau und Grün besser als Rot; Rot funktioniert aber auch, denn vor allem die Bewegung zählt. Anders als ein echter Laser lässt sich dieser Punkt fangen: Er bleibt einen Moment unter der Pfote, und der Fang wird gezählt.'],
    ['Meine Katze reagiert nicht. Was tun?',
      'Dreh den Ton etwas lauter, wähle größere Tiere (Reiter Kulisse) oder ein langsameres Tempo, und dimme das Licht. Manche Katzen mögen lieber Mäuse, andere Fische oder den Laserpunkt.'],
    ['Ist es wirklich kostenlos? Und meine Daten?',
      'Ja: kostenlos, ohne Werbung, ohne Konto und ohne Tracking. Die Einstellungen bleiben auf deinem Gerät. Das Mikrofon ist optional und lässt die Tiere nur bei Lärm aufschrecken; nichts wird aufgenommen oder gesendet.'],
  ],
  otherPages: 'Weitere Seiten',
  languages: 'In anderen Sprachen',
  note: 'Meowtrix ist ein privates Projekt',
  source: 'Quellcode auf GitHub',
  pages: {
    home: {
      name: 'Start',
      title: 'Meowtrix – Kostenloses Katzenspiel für Tablet, Handy und TV',
      description: 'Eidechsen, Mäuse, Fische, Schmetterlinge, ein Laserpunkt: ein 3D-Spiel, bei dem deine Katze auf dem Bildschirm jagt. Kostenlos, ohne Werbung und ohne App.',
      imageAlt: 'Eidechsen, ein Frosch und Insekten in 3D zwischen einem Blatt, einem Stein und einem alten Stiefel',
      body: `<h2>Ein kostenloses Katzenspiel für Tablet, Handy oder Fernseher</h2>
<p>Meowtrix verwandelt den Bildschirm in ein Jagdrevier: 3D-Tiere laufen umher, verstecken sich und flitzen davon, wenn eine Pfote sie berührt. Es ist kostenlos, ohne Werbung, ohne Konto und ohne App-Installation: Die Seite öffnet sich im Browser und wechselt in den Vollbildmodus.</p>
<h3>Drei Welten zum Jagen</h3>
<ul>
<li><strong>Land</strong>: Eidechsen, Frösche, Fliegen, Marienkäfer, Käfer, Heuschrecken, Kakerlaken, Mäuse, Eichhörnchen und Vögel, die sich unter Blättern, Steinen oder in einem alten Stiefel verstecken.</li>
<li><strong><a href="{water}">Wasser</a></strong>: Goldfische, Koi-Karpfen, ein Sardinenschwarm, Forellen, Lachse und Babyhaie; jeder Pfotenhieb zieht Kreise im Wasser.</li>
<li><strong><a href="{sky}">Himmel</a></strong>: Schmetterlinge, Glühwürmchen, Federn im Wind und ein Laserpunkt, bei Tag, in der Dämmerung oder im Mondschein.</li>
</ul>
<p>Zu den Feiertagen verkleidet sich alles von selbst zur richtigen Zeit: <a href="{christmas}">Weihnachten</a> (Mützen und Schnee), <a href="{halloween}">Halloween</a> (Hexenhüte und Kürbisse) und <a href="{easter}">Ostern</a> (Hasenohren und Rieseneier). Der Pixel-Stil sorgt für Retro-Videospiel-Optik.</p>
<h3>Mit Blick auf das Wohl der Katze</h3>
<p>Ein Timer bietet Runden von 5, 10 oder 15 Minuten; am Ende werden die Tiere müde, damit die Katze mit einem Fang aufhört. Ein Zähler speichert ihre Fänge, zum Teilen mit Freunden. Die Geräusche entstehen live, und wenn du es erlaubst, lässt das Mikrofon die Tiere bei Geräuschen im Raum aufschrecken.</p>
<h3>Ein Spiel, das sich deiner Katze anpasst</h3>
<p>Die Auto-Geschwindigkeit bremst die Tiere, wenn deine Katze tatzt, ohne zu fangen, und beschleunigt sie, wenn sie alles fängt. Ab und zu läuft ein Besucher über den Bildschirm, oder ein Schatten jagt alle davon. Raupen, langsam und leicht zu fangen, passen zu Kätzchen und alten Katzen. Die Statistik merkt sich die Fänge pro Tag und die Lieblingsbeute; der Modus „Tablet im Ständer“ startet ein, zwei oder vier Stunden später von selbst eine neue Runde, für die Tage, an denen du unterwegs bist.</p>`,
    },
    water: {
      name: 'Wasser',
      title: 'Fischspiel für Katzen auf dem Tablet – Meowtrix',
      description: 'Goldfische, Koi-Karpfen, ein Sardinenschwarm und Babyhaie schwimmen unter Wasser: ein kostenloses Angelspiel für deine Katze, auf Tablet, Handy oder TV.',
      imageAlt: 'Koi-Karpfen, Goldfisch, Forelle und Sardinenschwarm zwischen Seerosen, Felsen und Algen',
      body: `<h2>Fische für deine Katze zum Fangen</h2>
<p>Im Thema Wasser schwimmen 3D-Fische unter einer welligen, glitzernden Oberfläche. Neugierige Goldfische machen Blasen; Koi gleiten langsam und schnappen an der Oberfläche; Sardinen schwimmen im dichten Schwarm und stieben plötzlich auseinander; Forellen und Lachse flitzen unter die Felsen; Babyhaie patrouillieren mit aufgestellter Flosse.</p>
<p>Jeder Pfotenhieb zieht Kreise im Wasser und macht ein kleines Platschen. Die Fische umschwimmen die Felsen, tauchen darunter, um sich zu verstecken, und kommen wieder hervor, wenn Ruhe einkehrt.</p>
<h3>Die Kulissen</h3>
<p>Ein Teich, eine Lagune oder ein Fluss, mit Seerosen, Felsen und Algen als Verstecke. Jeder Fisch hat mehrere Färbungen: Kohaku, Showa oder Ogon bei den Koi, Regenbogen- oder Bachforelle, Zebrahai oder Walhai…</p>`,
    },
    sky: {
      name: 'Himmel',
      title: 'Schmetterlinge, Federn und Laserpunkt für Katzen – Meowtrix',
      description: 'Flatternde Schmetterlinge, blinkende Glühwürmchen, Federn im Wind und ein Laserpunkt: ein kostenloses Spiel für Katzen, auf Tablet, Handy oder TV.',
      imageAlt: 'Schmetterlinge, eine Feder und ein Laserpunkt auf einer Blumenwiese',
      body: `<h2>Schmetterlinge, Glühwürmchen, Federn und ein Laserpunkt</h2>
<p>Das Thema Himmel vereint alles, was fliegt, schwebt und flitzt. Die Schmetterlinge (Monarchfalter, Blauer Morphofalter, Kohlweißling, Tagpfauenauge, Zitronenfalter) flattern im Zickzack, landen und öffnen ihre Flügel in der Sonne. Glühwürmchen schweben blinkend umher, wunderschön im Mondschein. Federn schaukeln herab, dann lässt der Wind sie gleiten und aufsteigen.</p>
<h3>Ein Laserpunkt, der sich fangen lässt</h3>
<p>Der Laserpunkt bewegt sich wie eine echte Hand: Er flitzt, stoppt abrupt mit leichtem Zittern, dreht Kreise, schleicht sich heran, verschwindet vom Bildschirm und kommt zurück. Er flieht, wenn eine Pfote naht, aber anders als ein echter Laser kann deine Katze ihn fangen: Der Punkt bleibt einen Moment unter der Pfote, und der Fang zählt. Rot, Grün oder Blau, ganz nach Wahl.</p>
<h3>Die Kulissen</h3>
<p>Eine Blumenwiese am hellen Tag, das goldene Licht der Abenddämmerung oder Mondschein, in dem Glühwürmchen und Laser leuchten. Tulpen, Grasbüschel und Steine vervollständigen die Szene.</p>`,
    },
    christmas: {
      name: 'Weihnachten',
      title: 'Weihnachtsspiel für Katzen: Schnee und Weihnachtsmützen – Meowtrix',
      description: 'Fallender Schnee, Weihnachtsmützen und ein Strumpf zum Verstecken: die Weihnachtsversion von Meowtrix, dem kostenlosen Katzenspiel für Tablet, Handy und TV.',
      imageAlt: 'Schnee, ein Weihnachtsstrumpf und Tiere mit Weihnachtsmützen',
      body: `<h2>Weihnachten für deine Katze</h2>
<p>Schnee fällt und bedeckt den Boden, jedes Tier trägt eine Weihnachtsmütze, und ein großer roter Strumpf dient als Versteck. Eidechsen, Mäuse, Fische oder Schmetterlinge: Jedes Thema bekommt den Weihnachtslook.</p>
<p>Vom 1. Dezember bis 6. Januar macht sich Meowtrix mit der Einstellung Auto ganz von selbst weihnachtlich. Diese Seite aktiviert es das ganze Jahr über.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Halloween-Spiel für Katzen: Kürbisse und Fledermäuse – Meowtrix',
      description: 'Leuchtende Kürbisse, Fledermäuse, Glut und Hexenhüte: die Halloween-Version von Meowtrix, dem kostenlosen Katzenspiel für Tablet, Handy und TV.',
      imageAlt: 'Geschnitzte Kürbisse, Fledermäuse und Tiere mit Hexenhüten',
      body: `<h2>Halloween für deine Katze</h2>
<p>Das Licht wird orange, Glut steigt in die Luft, Fledermäuse kreisen über der Szene, und jedes Tier trägt einen Hexenhut. Ein leuchtender geschnitzter Kürbis dient als Versteck.</p>
<p>Von Mitte Oktober bis zum 2. November wechselt Meowtrix mit der Einstellung Auto ganz von selbst zu Halloween. Diese Seite aktiviert es das ganze Jahr über.</p>`,
    },
    easter: {
      name: 'Ostern',
      title: 'Osterspiel für Katzen: Eier und Hasenohren – Meowtrix',
      description: 'Hasenohren, Rieseneier auf Schokoladeneiern und ein Blütenregen: die Osterversion von Meowtrix, dem kostenlosen Spiel für Katzen.',
      imageAlt: 'Riesige Ostereier, Tulpen und Tiere mit Hasenohren',
      body: `<h2>Ostern für deine Katze</h2>
<p>Blütenblätter rieseln herab, jedes Tier trägt Hasenohren, und große bemalte Eier auf Schokoladeneiern dienen als Verstecke.</p>
<p>Rund um Ostern macht sich Meowtrix mit der Einstellung Auto ganz von selbst österlich. Diese Seite aktiviert es das ganze Jahr über.</p>`,
    },
  },
} satisfies SeoText;
