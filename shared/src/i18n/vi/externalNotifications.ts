import type { NotificationLocale } from '../externalNotifications/types';

const vi: NotificationLocale = {
  email: {
    footer: 'Bạn nhận được email này vì đã bật thông báo trong Tripp.',
    manage: 'Tùy chỉnh thông báo trong phần Cài đặt nhé',
    madeWith: 'Được tạo với',
    openTrek: 'Mở Tripp',
  },
  events: {
    trip_invite: (p) => ({
      title: `Lời mời đi chơi: "${p.trip}"`,
      body: `${p.actor} đã rủ ${p.invitee || 'một thành viên'} tham gia chuyến đi "${p.trip}".`,
    }),
    booking_change: (p) => ({
      title: `Mục đặt trước mới: ${p.booking}`,
      body: `${p.actor} đã thêm ${p.type} mới "${p.booking}" vào chuyến đi "${p.trip}".`,
    }),
    trip_reminder: (p) => ({
      title: `Nhắc lịch đi chơi: ${p.trip}`,
      body: `Chuyến đi "${p.trip}" của bạn sắp khởi hành rồi nè! Chuẩn bị đồ đạc thui.`,
    }),
    todo_due: (p) => ({
      title: `Việc cần làm sắp đến hạn: ${p.todo}`,
      body: `"${p.todo}" trong chuyến đi "${p.trip}" có hạn chót vào ngày ${p.due} đó nha.`,
    }),
    vacay_invite: (p) => ({
      title: 'Lời mời ghép lịch Vacay',
      body: `${p.actor} đã rủ bạn ghép lịch nghỉ phép. Mở Tripp lên để chốt đơn đồng ý hoặc từ chối nhé.`,
    }),
    photos_shared: (p) => ({
      title: `Đã chia sẻ ${p.count} ảnh mới`,
      body: `${p.actor} đã chia sẻ ${p.count} bức ảnh trong chuyến đi "${p.trip}".`,
    }),
    collab_message: (p) => ({
      title: `Tin nhắn mới trong "${p.trip}"`,
      body: `${p.actor}: ${p.preview}`,
    }),
    packing_tagged: (p) => ({
      title: `Chuẩn bị hành lý: ${p.category}`,
      body: `${p.actor} đã giao cho bạn chuẩn bị phần "${p.category}" trong chuyến đi "${p.trip}".`,
    }),
    version_available: (p) => ({
      title: 'Có phiên bản Tripp mới rồi nè',
      body: `Phiên bản Tripp ${p.version} đã sẵn sàng. Ghé qua trang quản trị để lên đời ngay bồ ơi.`,
    }),
    synology_session_cleared: () => ({
      title: 'Phiên làm việc Synology đã bị xóa',
      body: 'Tài khoản hoặc URL Synology của bạn đã thay đổi. Bạn đã bị đăng xuất khỏi Synology Photos.',
    }),
  },
  passwordReset: {
    subject: 'Đặt lại mật khẩu của bạn',
    greeting: 'Chào bạn',
    body: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Tripp của bạn. Click vào nút bên dưới để tạo mật khẩu mới nha.',
    ctaIntro: 'Đặt lại mật khẩu',
    expiry: 'Liên kết này chỉ có hiệu lực trong vòng 60 phút thôi nhé.',
    ignore: 'Nếu bồ không yêu cầu việc này, cứ bơ email này đi — mật khẩu của bồ sẽ không bị đổi đâu, yên tâm.',
  },
};

export default vi;
