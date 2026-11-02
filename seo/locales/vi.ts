import type { SeoText } from '../text.ts';

export default {
  tagline: 'Bãi săn cho mèo của bạn',
  genre: 'Trò chơi cho mèo',
  howTitle: 'Cách chơi',
  how: [
    'Đặt máy tính bảng hoặc điện thoại nằm phẳng, hoặc mở trang trên TV.',
    'Chọn con vật, số lượng, màu sắc và khung cảnh, rồi chạm “Chơi”.',
    'Để quay lại menu, nhấn giữ nút ở góc trên bên phải: chân mèo không thể vô tình mở được.',
  ],
  faqTitle: 'Câu hỏi thường gặp',
  faq: [
    ['Trò chơi máy tính bảng nào hợp với mèo của tôi?',
      'Trò chơi có thứ gì đó nhỏ di chuyển giật cục, dừng lại rồi trốn: đó là điều đánh thức bản năng săn mồi. Meowtrix có thằn lằn, chuột, côn trùng, chim, cá, bướm, lông vũ và chấm laser chuyển động đúng như vậy, kèm âm thanh. Hãy thử vài loại: mỗi chú mèo có sở thích riêng.'],
    ['Trò chơi trên màn hình có tốt cho mèo không?',
      'Chúng giúp mèo nuôi trong nhà vận động, miễn là chỉ là một trong nhiều trò chơi. Hãy xen kẽ với đồ chơi thật mà mèo có thể vồ và cắn, ở gần bên và dừng lại nếu màn hình có vẻ khiến nó bực bội.'],
    ['Mỗi lượt chơi nên kéo dài bao lâu?',
      'Nhiều lượt ngắn 5 đến 15 phút tốt hơn một lượt dài. Chọn thời lượng trong cài đặt: ở phút cuối các con vật mệt dần để mèo kết thúc bằng một lần bắt được, sau đó Meowtrix hiện điểm số. Một chút đồ ăn vặt ngay sau đó là cái kết đẹp cho cuộc săn.'],
    ['Làm sao bảo vệ màn hình khỏi móng mèo?',
      'Thường thì kính cường lực hoặc miếng dán bảo vệ là đủ, cắt móng thường xuyên cũng giúp ích. Đặt thiết bị nằm phẳng trên bề mặt chắc chắn.'],
    ['Có chơi được trên TV không?',
      'Có: mở meowtrix.mbonnici.fr trong trình duyệt của TV, hoặc truyền tab từ máy tính. Trên TV, mèo nhìn và đuổi theo con vật nhưng không chạm được.'],
    ['Sao chấm laser lại màu xanh lá hoặc xanh dương?',
      'Mèo nhìn màu xanh dương và xanh lá rõ hơn màu đỏ; màu đỏ cũng được, vì quan trọng nhất là chuyển động. Khác với laser thật, chấm này có thể bắt được: nó dừng lại dưới chân một lát và được tính là một lần bắt.'],
    ['Mèo của tôi không phản ứng. Phải làm sao?',
      'Tăng âm lượng một chút, chọn con vật to hơn (thẻ Khung cảnh) hoặc tốc độ chậm hơn, và giảm bớt ánh sáng. Có mèo thích chuột, có mèo thích cá hoặc chấm laser.'],
    ['Có thật sự miễn phí không? Còn dữ liệu của tôi?',
      'Có: miễn phí, không quảng cáo, không cần tài khoản và không theo dõi. Cài đặt chỉ lưu trên thiết bị của bạn. Micrô là tùy chọn và chỉ dùng để con vật giật mình khi có tiếng ồn; không ghi âm hay gửi đi bất cứ thứ gì.'],
  ],
  otherPages: 'Các trang khác',
  languages: 'Bằng ngôn ngữ khác',
  note: 'Meowtrix là dự án cá nhân',
  source: 'mã nguồn trên GitHub',
  pages: {
    home: {
      name: 'Trang chủ',
      title: 'Meowtrix – Trò chơi miễn phí cho mèo trên máy tính bảng, điện thoại và TV',
      description: 'Thằn lằn, chuột, cá, bướm, chấm laser: trò chơi 3D để mèo săn trên màn hình. Miễn phí, không quảng cáo, không cần cài ứng dụng, chơi trên máy tính bảng hoặc TV.',
      imageAlt: 'Thằn lằn, ếch và côn trùng 3D quanh chiếc lá, hòn đá và chiếc ủng cũ',
      body: `<h2>Trò chơi miễn phí cho mèo trên máy tính bảng, điện thoại hoặc TV</h2>
<p>Meowtrix biến màn hình thành bãi săn: các con vật 3D đi lại, trốn và chạy vụt đi khi bị chân mèo chạm vào. Hoàn toàn miễn phí, không quảng cáo, không cần tài khoản và không phải cài ứng dụng: trang mở trong trình duyệt và chuyển sang toàn màn hình.</p>
<h3>Ba thế giới để săn</h3>
<ul>
<li><strong>Mặt đất</strong>: thằn lằn, ếch, ruồi, bọ rùa, bọ cánh cứng, châu chấu, gián, chuột, sóc và chim, trốn dưới lá, đá hoặc trong chiếc ủng cũ.</li>
<li><strong><a href="{water}">Dưới nước</a></strong>: cá vàng, cá koi, đàn cá mòi, cá hồi suối, cá hồi và cá mập con; mỗi cú vồ đều tạo gợn sóng trên mặt nước.</li>
<li><strong><a href="{sky}">Bầu trời</a></strong>: bướm, đom đóm, lông vũ bay theo gió và chấm laser, ban ngày, lúc hoàng hôn hay dưới ánh trăng.</li>
</ul>
<p>Vào dịp lễ, mọi thứ tự thay trang phục đúng lúc: <a href="{christmas}">Giáng sinh</a> (mũ ông già Noel và tuyết), <a href="{halloween}">Halloween</a> (mũ phù thủy và bí ngô) và <a href="{easter}">Phục sinh</a> (tai thỏ và trứng khổng lồ). Phong cách Pixel mang lại vẻ trò chơi điện tử cổ điển.</p>
<h3>Thiết kế vì sức khỏe của mèo</h3>
<p>Bộ hẹn giờ có các lượt 5, 10 hoặc 15 phút; cuối lượt, các con vật mệt dần để mèo kết thúc bằng một lần bắt được. Bộ đếm lưu lại số lần bắt để chia sẻ với bạn bè. Âm thanh được tạo trực tiếp và, nếu bạn cho phép, micrô sẽ làm con vật giật mình trước tiếng động trong phòng.</p>`,
    },
    water: {
      name: 'Dưới nước',
      title: 'Trò chơi bắt cá cho mèo trên máy tính bảng – Meowtrix',
      description: 'Cá vàng, cá koi, đàn cá mòi và cá mập con bơi dưới nước: trò chơi câu cá miễn phí cho mèo, trên máy tính bảng, điện thoại hoặc TV.',
      imageAlt: 'Cá koi, cá vàng, cá hồi suối và đàn cá mòi giữa hoa súng, tảng đá và rong',
      body: `<h2>Cá để mèo của bạn bắt</h2>
<p>Ở chủ đề Dưới nước, cá 3D bơi dưới mặt nước lăn tăn lấp lánh. Cá vàng tò mò thổi bong bóng; cá koi bơi chậm rãi và ngoi lên đớp; cá mòi bơi thành đàn dày rồi bỗng tản ra; cá hồi suối và cá hồi lao vào nấp dưới đá; cá mập con tuần tra với vây dựng đứng.</p>
<p>Mỗi cú vồ tạo gợn sóng và một tiếng tõm nhỏ. Cá bơi vòng quanh đá, lặn xuống dưới để trốn và bơi ra lại khi mọi thứ yên tĩnh.</p>
<h3>Khung cảnh</h3>
<p>Ao, đầm phá hoặc sông, có hoa súng, tảng đá và rong để trốn. Mỗi loài cá có nhiều màu: kohaku, showa hay ogon cho cá koi, cá hồi cầu vồng hay hồi nâu, cá nhám nhu mì hay cá mập voi…</p>`,
    },
    sky: {
      name: 'Bầu trời',
      title: 'Bướm, lông vũ và chấm laser cho mèo – Meowtrix',
      description: 'Bướm bay chập chờn, đom đóm nhấp nháy, lông vũ trong gió và chấm laser: trò chơi miễn phí cho mèo, trên máy tính bảng, điện thoại hoặc TV.',
      imageAlt: 'Bướm, lông vũ và chấm laser trên đồng cỏ đầy hoa',
      body: `<h2>Bướm, đom đóm, lông vũ và chấm laser</h2>
<p>Chủ đề Bầu trời tập hợp những gì biết bay, lơ lửng và lao vút. Bướm (bướm vua, morpho xanh, bướm cải, bướm mắt công, bướm chanh) bay chập chờn, đậu xuống và xòe cánh dưới nắng. Đom đóm lơ lửng nhấp nháy, đẹp dưới ánh trăng. Lông vũ rơi đung đưa, rồi gió làm chúng lướt đi và bay lên.</p>
<h3>Chấm laser có thể bắt được</h3>
<p>Chấm laser di chuyển như bàn tay thật: lao đi, dừng phắt kèm chút run rẩy, chạy vòng tròn, rón rén lại gần, trượt ra khỏi màn hình rồi quay lại. Nó chạy trốn khi chân mèo tới gần, nhưng khác với laser thật, mèo của bạn có thể bắt được: chấm dừng lại dưới chân một lát và được tính là một lần bắt. Đỏ, xanh lá hoặc xanh dương.</p>
<h3>Khung cảnh</h3>
<p>Đồng cỏ đầy hoa giữa ban ngày, ánh vàng của hoàng hôn hay ánh trăng làm đom đóm và laser rực sáng. Hoa tulip, khóm cỏ và đá hoàn thiện khung cảnh.</p>`,
    },
    christmas: {
      name: 'Giáng sinh',
      title: 'Trò chơi Giáng sinh cho mèo: tuyết và mũ Noel – Meowtrix',
      description: 'Tuyết rơi, mũ ông già Noel và chiếc tất để trốn: phiên bản Giáng sinh của Meowtrix, trò chơi miễn phí cho mèo trên máy tính bảng, điện thoại và TV.',
      imageAlt: 'Tuyết, tất Giáng sinh và các con vật đội mũ ông già Noel',
      body: `<h2>Giáng sinh cho mèo của bạn</h2>
<p>Tuyết rơi phủ trắng mặt đất, con vật nào cũng đội mũ ông già Noel, và chiếc tất đỏ to trở thành chỗ trốn. Thằn lằn, chuột, cá hay bướm: chủ đề nào cũng khoác lên không khí Giáng sinh.</p>
<p>Từ 1 tháng 12 đến 6 tháng 1, Meowtrix tự trang hoàng Giáng sinh với cài đặt Tự động. Trang này bật chế độ đó quanh năm.</p>`,
    },
    halloween: {
      name: 'Halloween',
      title: 'Trò chơi Halloween cho mèo: bí ngô và dơi – Meowtrix',
      description: 'Bí ngô phát sáng, dơi, tàn lửa và mũ phù thủy: phiên bản Halloween của Meowtrix, trò chơi miễn phí cho mèo trên máy tính bảng và TV.',
      imageAlt: 'Bí ngô khắc, dơi và các con vật đội mũ phù thủy',
      body: `<h2>Halloween cho mèo của bạn</h2>
<p>Ánh sáng chuyển sang màu cam, tàn lửa bay lên, đàn dơi lượn vòng phía trên và con vật nào cũng đội mũ phù thủy. Một quả bí ngô khắc phát sáng trở thành chỗ trốn.</p>
<p>Từ giữa tháng 10 đến 2 tháng 11, Meowtrix tự chuyển sang Halloween với cài đặt Tự động. Trang này bật chế độ đó quanh năm.</p>`,
    },
    easter: {
      name: 'Phục sinh',
      title: 'Trò chơi Phục sinh cho mèo: trứng và tai thỏ – Meowtrix',
      description: 'Tai thỏ, trứng khổng lồ đặt trên trứng sô-cô-la và mưa cánh hoa: phiên bản Phục sinh của Meowtrix, trò chơi miễn phí cho mèo.',
      imageAlt: 'Trứng Phục sinh khổng lồ, hoa tulip và các con vật đeo tai thỏ',
      body: `<h2>Phục sinh cho mèo của bạn</h2>
<p>Cánh hoa nhẹ nhàng rơi, con vật nào cũng đeo tai thỏ, và những quả trứng trang trí to đặt trên trứng sô-cô-la trở thành chỗ trốn.</p>
<p>Vào dịp Phục sinh, Meowtrix tự trang hoàng với cài đặt Tự động. Trang này bật chế độ đó quanh năm.</p>`,
    },
  },
} satisfies SeoText;
