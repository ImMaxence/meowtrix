import type { SeoText } from '../text.ts';

export default {
  tagline: 'Kediniz için bir av sahası',
  genre: 'Kediler için oyun',
  howTitle: 'Nasıl oynanır',
  how: [
    'Tableti veya telefonu düz bir şekilde yere koyun ya da sayfayı televizyonda açın.',
    'Hayvanları, sayılarını, renklerini ve dekoru seçin, ardından “Oyna”ya dokunun.',
    'Menüye dönmek için sağ üstteki düğmeyi basılı tutun: bir pati onu yanlışlıkla açamaz.',
  ],
  faqTitle: 'Sık sorulan sorular',
  faq: [
    ['Kedim için hangi tablet oyunu iyi?',
      'Küçük bir şeyin kesik kesik hareket ettiği, durduğu ve saklandığı bir oyun: av içgüdüsünü uyandıran budur. Meowtrix’te tam böyle davranan kertenkeleler, fareler, böcekler, kuşlar, balıklar, kelebekler, tüyler ve bir lazer noktası var, sesleriyle birlikte. Birkaçını deneyin: her kedinin favorileri vardır.'],
    ['Ekran oyunları kediler için iyi mi?',
      'Başka oyunlardan biri olarak kaldıkları sürece ev kedisini iyi oyalarlar. Yakalayıp ısırabileceği gerçek oyuncaklarla dönüşümlü oynatın, yakınında durun ve ekran onu sinirlendiriyor gibiyse bırakın.'],
    ['Bir oyun ne kadar sürmeli?',
      'Uzun bir oyun yerine 5 ila 15 dakikalık birkaç kısa oyun daha iyidir. Ayarlardan bir süre seçin: son dakikada hayvanlar yorulur, böylece kedi bir avla bitirir, ardından Meowtrix skorunu gösterir. Hemen ardından bir ödül maması avı güzelce bitirir.'],
    ['Ekranı pençelerden nasıl korurum?',
      'Genellikle bir temperli cam ya da ekran koruyucu yeterlidir; düzenli kesilen tırnaklar da yardımcı olur. Cihazı sabit bir yüzeye düz yatırın.'],
    ['Televizyonda çalışır mı?',
      'Evet: meowtrix.mbonnici.fr adresini televizyonun tarayıcısında açın veya sekmeyi bir bilgisayardan yansıtın. Televizyonda kedi hayvanları izler ve takip eder ama onlara dokunamaz.'],
    ['Neden yeşil veya mavi lazer noktası?',
      'Kediler maviyi ve yeşili kırmızıdan daha iyi görür; kırmızı da işe yarar, çünkü asıl önemli olan harekettir. Gerçek bir lazerin aksine bu nokta yakalanabilir: bir an patinin altında kalır ve av sayılır.'],
    ['Kedim tepki vermiyor. Ne yapmalıyım?',
      'Sesi biraz açın, daha büyük hayvanlar (Dekor sekmesi) ya da daha yavaş bir hız seçin ve ışıkları kısın. Bazı kediler fareleri, bazıları balıkları ya da lazer noktasını tercih eder.'],
    ['Gerçekten ücretsiz mi? Peki verilerim?',
      'Evet: ücretsiz, reklamsız, hesapsız ve takipsiz. Ayarlar cihazınızda kalır. Mikrofon isteğe bağlıdır ve yalnızca hayvanların gürültüde irkilmesini sağlar; hiçbir şey kaydedilmez ya da gönderilmez.'],
  ],
  otherPages: 'Diğer sayfalar',
  languages: 'Diğer dillerde',
  note: 'Meowtrix kişisel bir projedir',
  source: 'GitHub’daki kaynak kodu',
  pages: {
    home: {
      name: 'Ana sayfa',
      title: 'Meowtrix – Tablet, telefon ve TV için ücretsiz kedi oyunu',
      description: 'Kertenkeleler, fareler, balıklar, kelebekler, lazer noktası: kedinizin ekranda avladığı 3D bir oyun. Ücretsiz, reklamsız ve uygulamasız, tablette veya TV’de.',
      imageAlt: 'Bir yaprak, bir taş ve eski bir çizmenin etrafında 3D kertenkeleler, kurbağa ve böcekler',
      body: `<h2>Tablet, telefon veya televizyon için ücretsiz kedi oyunu</h2>
<p>Meowtrix ekranı bir av sahasına dönüştürür: 3D hayvanlar dolaşır, saklanır ve bir pati dokunduğunda kaçar. Ücretsizdir; reklam, hesap ve yüklenecek uygulama yoktur: sayfa tarayıcıda açılır ve tam ekrana geçer.</p>
<h3>Avlanacak üç dünya</h3>
<ul>
<li><strong>Kara</strong>: yaprakların, taşların altına ya da eski bir çizmenin içine saklanan kertenkeleler, kurbağalar, sinekler, uğur böcekleri, kın kanatlılar, çekirgeler, hamamböcekleri, fareler, sincaplar ve kuşlar.</li>
<li><strong><a href="{water}">Su</a></strong>: Japon balıkları, koi sazanları, sardalya sürüsü, alabalıklar, somonlar ve yavru köpekbalıkları; her pati darbesi suda halkalar oluşturur.</li>
<li><strong><a href="{sky}">Gökyüzü</a></strong>: kelebekler, ateşböcekleri, rüzgârda uçuşan tüyler ve bir lazer noktası; gündüz, alacakaranlıkta ya da ay ışığında.</li>
</ul>
<p>Bayramlarda her şey doğru zamanda kendiliğinden giyinir: <a href="{christmas}">Noel</a> (Noel Baba şapkaları ve kar), <a href="{halloween}">Cadılar Bayramı</a> (cadı şapkaları ve balkabakları) ve <a href="{easter}">Paskalya</a> (tavşan kulakları ve dev yumurtalar). Piksel stili retro bir video oyunu görünümü verir.</p>
<h3>Kedinin iyiliği düşünülerek tasarlandı</h3>
<p>Bir zamanlayıcı 5, 10 veya 15 dakikalık oyunlar sunar; sonunda hayvanlar yorulur, böylece kedi bir avla bitirir. Bir sayaç avlarını saklar, arkadaşlarınızla paylaşmanız için. Sesler canlı üretilir ve izin verirseniz mikrofon hayvanların odadaki seslerle irkilmesini sağlar.</p>`,
    },
    water: {
      name: 'Su',
      title: 'Tablette kediler için balık oyunu – Meowtrix',
      description: 'Japon balıkları, koi sazanları, sardalya sürüsü ve yavru köpekbalıkları su altında yüzüyor: kediniz için ücretsiz bir balık tutma oyunu, tablette, telefonda veya TV’de.',
      imageAlt: 'Nilüferler, kaya ve yosunlar arasında koi sazanları, Japon balığı, alabalık ve sardalya sürüsü',
      body: `<h2>Kedinizin yakalayacağı balıklar</h2>
<p>Su temasında 3D balıklar dalgalanan, parıldayan bir yüzeyin altında yüzer. Meraklı Japon balıkları baloncuk yapar; koiler yavaşça süzülüp yüzeye gelir; sardalyalar sık bir sürü hâlinde yüzer ve birden dağılır; alabalıklar ve somonlar kayaların altına kaçar; yavru köpekbalıkları yüzgeçleri dik devriye gezer.</p>
<p>Her pati darbesi suda halkalar ve küçük bir şıpırtı oluşturur. Balıklar kayaların etrafından dolaşır, saklanmak için altlarına dalar ve ortalık sakinleşince yeniden çıkar.</p>
<h3>Dekorlar</h3>
<p>Nilüferler, kayalar ve saklanacak yosunlarla bir gölet, bir lagün ya da bir nehir. Her balığın birkaç rengi vardır: koiler için kohaku, showa veya ogon, gökkuşağı ya da dere alabalığı, zebra ya da balina köpekbalığı…</p>`,
    },
    sky: {
      name: 'Gökyüzü',
      title: 'Kediler için kelebekler, tüyler ve lazer noktası – Meowtrix',
      description: 'Uçuşan kelebekler, yanıp sönen ateşböcekleri, rüzgârda tüyler ve bir lazer noktası: kediler için ücretsiz oyun, tablette, telefonda veya televizyonda.',
      imageAlt: 'Çiçekli bir çayırda kelebekler, bir tüy ve bir lazer noktası',
      body: `<h2>Kelebekler, ateşböcekleri, tüyler ve lazer noktası</h2>
<p>Gökyüzü teması uçan, süzülen ve fırlayan her şeyi bir araya getirir. Kelebekler (kral kelebeği, mavi morfo, lahana kelebeği, tavus kelebeği, orakkanat) zikzak uçar, konar ve kanatlarını güneşe açar. Ateşböcekleri yanıp sönerek süzülür, ay ışığında harikadır. Tüyler salınarak düşer, sonra rüzgâr onları kaydırıp havalandırır.</p>
<h3>Yakalanabilen bir lazer noktası</h3>
<p>Lazer noktası gerçek bir el gibi hareket eder: fırlar, hafifçe titreyerek aniden durur, daireler çizer, yavaşça sokulur, ekrandan kayıp gider ve geri gelir. Bir pati yaklaşınca kaçar, ama gerçek bir lazerin aksine kediniz onu yakalayabilir: nokta bir an patinin altında kalır ve av sayılır. Kırmızı, yeşil ya da mavi.</p>
<h3>Dekorlar</h3>
<p>Güpegündüz çiçekli bir çayır, alacakaranlığın altın ışığı ya da ateşböceklerinin ve lazerin parladığı ay ışığı. Laleler, ot öbekleri ve taşlar tabloyu tamamlar.</p>`,
    },
    christmas: {
      name: 'Noel',
      title: 'Kediler için Noel oyunu: kar ve Noel Baba şapkaları – Meowtrix',
      description: 'Yağan kar, Noel Baba şapkaları ve saklanacak bir çorap: Meowtrix’in Noel sürümü, tablet, telefon ve TV için ücretsiz kedi oyunu.',
      imageAlt: 'Kar, bir Noel çorabı ve Noel Baba şapkalı hayvanlar',
      body: `<h2>Kediniz için Noel</h2>
<p>Kar yağar ve yeri örter, her hayvan bir Noel Baba şapkası takar ve büyük kırmızı bir çorap saklanma yeri olur. Kertenkeleler, fareler, balıklar ya da kelebekler: tüm temalar Noel görünümüne bürünür.</p>
<p>1 Aralık’tan 6 Ocak’a kadar Meowtrix, Otomatik ayarıyla kendiliğinden Noel’e hazırlanır. Bu sayfa onu bütün yıl açık tutar.</p>`,
    },
    halloween: {
      name: 'Cadılar Bayramı',
      title: 'Kediler için Cadılar Bayramı oyunu: balkabakları ve yarasalar – Meowtrix',
      description: 'Parlayan balkabakları, yarasalar, közler ve cadı şapkaları: Meowtrix’in Cadılar Bayramı sürümü, tablet ve TV için ücretsiz kedi oyunu.',
      imageAlt: 'Oyulmuş balkabakları, yarasalar ve cadı şapkalı hayvanlar',
      body: `<h2>Kediniz için Cadılar Bayramı</h2>
<p>Işık turuncuya döner, közler havaya yükselir, yarasalar sahnenin üzerinde döner ve her hayvan bir cadı şapkası takar. Parlayan oyulmuş bir balkabağı saklanma yeri olur.</p>
<p>Ekim ortasından 2 Kasım’a kadar Meowtrix, Otomatik ayarıyla kendiliğinden Cadılar Bayramı moduna geçer. Bu sayfa onu bütün yıl açık tutar.</p>`,
    },
    easter: {
      name: 'Paskalya',
      title: 'Kediler için Paskalya oyunu: yumurtalar ve tavşan kulakları – Meowtrix',
      description: 'Tavşan kulakları, çikolata yumurtalar üzerinde dev yumurtalar ve taç yaprağı yağmuru: Meowtrix’in Paskalya sürümü, ücretsiz kedi oyunu.',
      imageAlt: 'Dev Paskalya yumurtaları, laleler ve tavşan kulaklı hayvanlar',
      body: `<h2>Kediniz için Paskalya</h2>
<p>Taç yaprakları yavaşça düşer, her hayvanın tavşan kulakları vardır ve çikolata yumurtalara yaslanan büyük süslü yumurtalar saklanma yerleri olur.</p>
<p>Paskalya zamanı Meowtrix, Otomatik ayarıyla kendiliğinden süslenir. Bu sayfa onu bütün yıl açık tutar.</p>`,
    },
  },
} satisfies SeoText;
