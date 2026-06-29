import type { TranslationStrings } from '../types';

const system_notice: TranslationStrings = {
  'system_notice.v3_photos.title': 'Hình ảnh đã được dời đi trong bản 3.0',
  'system_notice.v3_photos.body':
    '**Hình ảnh** trong công cụ Lên kế hoạch chuyến đi đã được chuyển đi. Ảnh của bồ vẫn an toàn tuyệt đối nhé — Tripp không bao giờ đụng chạm gì vào thư viện Immich hay Synology của bồ đâu.\n\nẢnh bây giờ sẽ nằm trong phần tiện ích **Hành trình** (Journey) nhé. Tiện ích này là tùy chọn — nếu bồ chưa thấy nó xuất hiện, hãy nhắn admin bật lên trong mục Admin → Tiện ích nhé.',
  'system_notice.v3_journey.title': 'Làm quen với Hành trình — nhật ký du lịch mới tinh',
  'system_notice.v3_journey.body':
    'Ghi lại các chuyến đi chơi thành những câu chuyện sống động với dòng thời gian, bộ sưu tập ảnh và bản đồ tương tác siêu xịn.',
  'system_notice.v3_journey.cta_label': 'Mở Hành trình ngay',
  'system_notice.v3_journey.highlight_timeline': 'Dòng thời gian & Bộ sưu tập theo từng ngày',
  'system_notice.v3_journey.highlight_photos': 'Nhập ảnh trực tiếp từ Immich hoặc Synology',
  'system_notice.v3_journey.highlight_share': 'Chia sẻ công khai — không cần đăng nhập',
  'system_notice.v3_journey.highlight_export': 'Xuất thành sách ảnh PDF xịn xò',
  'system_notice.v3_features.title': 'Những điểm nổi bật khác trong bản 3.0',
  'system_notice.v3_features.body': 'Thêm vài thứ ho he bồ nên biết về bản phát hành này nè.',
  'system_notice.v3_features.highlight_dashboard': 'Thiết kế lại Dashboard tối ưu cho điện thoại',
  'system_notice.v3_features.highlight_offline': 'Chế độ ngoại tuyến đầy đủ (dưới dạng PWA)',
  'system_notice.v3_features.highlight_search': 'Tự động hoàn thành tìm kiếm địa điểm thời gian thực',
  'system_notice.v3_features.highlight_import': 'Nhập địa điểm trực tiếp từ file KMZ/KML',
  'system_notice.v3_mcp.title': 'MCP: Nâng cấp lên OAuth 2.1',
  'system_notice.v3_mcp.body':
    'Tích hợp MCP đã được làm mới hoàn toàn. Từ giờ OAuth 2.1 là phương thức xác thực khuyên dùng nha bồ. Đống token tĩnh cũ (trek_...) đã lỗi thời và sẽ bị xóa trong các bản cập nhật tới.',
  'system_notice.v3_mcp.highlight_oauth': 'Khuyên dùng OAuth 2.1 (mcp-remote)',
  'system_notice.v3_mcp.highlight_scopes': '24 phân quyền chi tiết, cực kỳ bảo mật',
  'system_notice.v3_mcp.highlight_deprecated': 'Token tĩnh cũ sắp bị khai tử',
  'system_notice.v3_mcp.highlight_tools': 'Mở rộng bộ công cụ & gợi ý cho AI',
  'system_notice.v3_thankyou.title': 'Một vài dòng tâm sự từ mình',
  'system_notice.v3_thankyou.body':
    "Trước khi bồ bắt đầu — mình muốn dành một chút thời gian để cảm ơn.\n\nTripp bắt đầu như một dự án phụ mình tự xây cho các chuyến đi của riêng mình. Mình chưa bao giờ nghĩ nó lại lớn mạnh như bây giờ, được hơn 4.000 bạn tin tưởng để lên kế hoạch cho các chuyến đi. Từng ngôi sao trên GitHub, từng issue báo lỗi, từng yêu cầu tính năng — mình đều đọc hết, và đó là động lực giúp mình thức đêm cày cuốc sau giờ làm việc và học tập ở trường.\n\nMình muốn bồ biết rằng: Tripp sẽ luôn là mã nguồn mở, luôn tự lưu trữ và luôn thuộc về bồ. Không theo dõi, không phí đăng ký, không ràng buộc gì hết. Đơn giản là một công cụ được xây dựng bởi một người yêu du lịch y hệt như bồ.\n\nGửi lời cảm ơn đặc biệt đến [jubnl](https://github.com/jubnl) — bạn đã trở thành một cộng sự tuyệt vời. Rất nhiều thứ hay ho trong bản 3.0 này có dấu ấn của bạn. Cảm ơn vì đã tin tưởng vào dự án này từ những ngày đầu còn sơ khai.\n\nVà gửi tới từng bạn đã báo lỗi, dịch thuật, chia sẻ Tripp với bạn bè hoặc đơn giản là dùng nó để lên kế hoạch đi chơi — **cảm ơn bồ rất nhiều**. Bồ chính là lý do công cụ này tồn tại.\n\nChúc chúng mình có thêm nhiều chuyến đi tuyệt vời cùng nhau.\n\n— Maurice\n\n---\n\n[Tham gia cộng đồng trên Discord nha](https://discord.gg/7Q6M6jDwzf)\n\nNếu Tripp giúp các chuyến đi của bồ ổn áp hơn, [một ly cà phê nhỏ](https://ko-fi.com/mauriceboe) luôn là nguồn năng lượng giúp mình duy trì dự án nhé.",
  'system_notice.v3014_whitespace_collision.title': 'Cần xử lý: Xung đột tài khoản người dùng',
  'system_notice.v3014_whitespace_collision.body':
    'Bản nâng cấp 3.0.14 phát hiện một hoặc nhiều tài khoản trùng tên hoặc email do có khoảng trắng thừa ở đầu/cuối tên khi lưu trữ. Các tài khoản bị ảnh hưởng đã được tự động đổi tên. Bồ check log máy chủ tìm các dòng bắt đầu bằng **[migration] WHITESPACE COLLISION** để xem lại các tài khoản này nhé.',
  'system_notice.welcome_v1.title': 'Chào mừng bồ đến với Tripp',
  'system_notice.welcome_v1.body':
    'Your all-in-one travel planner. Build itineraries, share trips with friends, and stay organized — online or offline.',
  'system_notice.welcome_v1.cta_label': 'Lên lịch đi chơi luôn',
  'system_notice.welcome_v1.hero_alt': 'Một điểm du lịch tuyệt đẹp với giao diện lập kế hoạch Tripp đè lên',
  'system_notice.welcome_v1.highlight_plan': 'Lịch trình chi tiết từng ngày cho mọi chuyến đi',
  'system_notice.welcome_v1.highlight_share': 'Cùng lên kế hoạch với bạn đồng hành',
  'system_notice.welcome_v1.highlight_offline': 'Chạy mượt mà offline trên điện thoại',
  'system_notice.dev_test_modal.title': '[Dev] Thông báo test',
  'system_notice.dev_test_modal.body': 'Thông báo này chỉ dành cho nhà phát triển test thôi nha.',
  'system_notice.thank_you_support.title': 'Cảm ơn bồ đã sử dụng Tripp',
  'system_notice.thank_you_support.body':
    "Cảm ơn bồ rất nhiều vì đã cài đặt Tripp — điều này thực sự có ý nghĩa lớn đối với mình.\n\nMình là nhà phát triển độc lập và xây dựng Tripp trong thời gian rảnh rỗi. Dự án bắt đầu chỉ là một công cụ nhỏ cho các chuyến đi của riêng mình, và mình thực sự bất ngờ trước sự quan tâm và ủng hộ từ cộng đồng. Tripp được tạo ra với rất nhiều tâm huyết của mình — và cũng nhờ sự đóng góp tuyệt vời từ nhiều cộng sự bên ngoài đã giúp định hình dự án.\n\n**Tripp là mã nguồn mở và hoàn toàn miễn phí — và sẽ mãi như vậy. Không tính phí, không bắt đăng ký, không có bẫy gì hết. Mình hứa danh dự luôn.**\n\nNếu Tripp có ích cho bồ và bồ muốn ủng hộ sự phát triển của nó, [một ly cà phê nhỏ](https://ko-fi.com/mauriceboe) thực sự giúp mình có thêm động lực cày đêm — không ép buộc gì đâu nha, nhưng mọi sự ủng hộ đều rất đáng quý.\n\nCảm ơn bồ đã ở đây.\n\n— Maurice",
  'system_notice.thank_you_support.highlight_opensource': 'Mã nguồn mở 100% trên GitHub',
  'system_notice.thank_you_support.highlight_free': 'Miễn phí mãi mãi — không bao giờ thu phí',
  'system_notice.thank_you_support.highlight_community': 'Xây dựng cùng cộng đồng',
  'system_notice.thank_you_support.cta_bmc': 'Mua cho mình ly cà phê',
  'system_notice.thank_you_support.cta_kofi': 'Ủng hộ qua Ko-fi',
  'system_notice.pager.prev': 'Thông báo trước',
  'system_notice.pager.next': 'Thông báo tiếp theo',
  'system_notice.pager.counter': '{current} / {total}',
  'system_notice.pager.goto': 'Đi đến thông báo {n}',
  'system_notice.pager.position': 'Thông báo {current} trên {total}',
};

export default system_notice;
