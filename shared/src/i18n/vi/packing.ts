import type { TranslationStrings } from '../types';

const packing: TranslationStrings = {
  'packing.title': 'Đồ đạc cần mang',
  'packing.empty': 'Danh sách hành lý trống trơn',
  'packing.import': 'Nhập nhanh',
  'packing.importTitle': 'Nhập danh sách hành lý',
  'packing.importHint':
    'Mỗi món đồ một dòng. Định dạng: Danh mục, Tên, Cân nặng tính bằng g (tùy chọn), Túi (tùy chọn), checked/unchecked (tùy chọn)',
  'packing.importPlaceholder':
    'Vệ sinh, Bàn chải đánh răng\nQuần áo, Áo thun, 200\nGiấy tờ, Hộ chiếu, , Túi xách tay\nĐiện tử, Sạc pin, 50, Vali, checked',
  'packing.importCsv': 'Tải file CSV/TXT',
  'packing.importAction': 'Nhập {count} món',
  'packing.importSuccess': 'Đã nhập thành công {count} món đồ',
  'packing.importError': 'Nhập dữ liệu bị xịt rồi',
  'packing.importEmpty': 'Không có món nào để nhập cả',
  'packing.progress': 'Đã xếp {packed} / {total} món ({percent}%)',
  'packing.clearChecked': 'Xóa {count} món đã chọn',
  'packing.clearCheckedShort': 'Xóa {count} món',
  'packing.suggestions': 'Gợi ý',
  'packing.suggestionsTitle': 'Thêm gợi ý',
  'packing.allSuggested': 'Đã thêm tất cả gợi ý',
  'packing.allPacked': 'Xếp xong hết rồi! Quá đỉnh',
  'packing.addPlaceholder': 'Thêm món mới…',
  'packing.categoryPlaceholder': 'Danh mục…',
  'packing.filterAll': 'Tất cả',
  'packing.filterOpen': 'Cần xếp',
  'packing.filterDone': 'Đã xếp',
  'packing.emptyTitle': 'Danh sách hành lý trống trơn',
  'packing.emptyHint': 'Thêm đồ hoặc dùng đống gợi ý có sẵn bên dưới đi bồ',
  'packing.emptyFiltered': 'Không có món nào khớp bộ lọc',
  'packing.menuRename': 'Đổi tên',
  'packing.menuCheckAll': 'Chọn tất cả',
  'packing.menuUncheckAll': 'Bỏ chọn tất cả',
  'packing.menuDeleteCat': 'Xóa danh mục',
  'packing.noMembers': 'Chưa có ai trong chuyến đi',
  'packing.addItem': 'Thêm món',
  'packing.addItemPlaceholder': 'Tên món đồ…',
  'packing.addCategory': 'Thêm danh mục',
  'packing.newCategoryPlaceholder': 'Tên danh mục (VD: Quần áo)',
  'packing.applyTemplate': 'Dùng mẫu hành lý',
  'packing.template': 'Mẫu hành lý',
  'packing.templateApplied': 'Đã thêm {count} món từ mẫu hành lý',
  'packing.templateError': 'Dùng mẫu hành lý thất bại u là trời',
  'packing.saveAsTemplate': 'Lưu làm mẫu hành lý',
  'packing.templateName': 'Tên mẫu hành lý',
  'packing.templateSaved': 'Đã lưu danh sách hành lý làm mẫu',
  'packing.bags': 'Túi xách/Vali',
  'packing.noBag': 'Chưa phân vào túi',
  'packing.totalWeight': 'Tổng cân nặng',
  'packing.bagName': 'Tên túi/vali…',
  'packing.addBag': 'Thêm túi/vali',
  'packing.changeCategory': 'Đổi danh mục',
  'packing.confirm.clearChecked': 'Bồ có chắc muốn xóa {count} món đã xếp xong không?',
  'packing.confirm.deleteCat': 'Chắc chắn xóa danh mục "{name}" có {count} món đồ này không bồ?',
  'packing.defaultCategory': 'Khác',
  'packing.toast.saveError': 'Lưu bị lỗi rồi',
  'packing.toast.deleteError': 'Xóa bị lỗi rồi',
  'packing.toast.renameError': 'Đổi tên thất bại',
  'packing.toast.addError': 'Thêm đồ bị lỗi rồi',
  'packing.suggestions.items': [
    {
      name: 'Hộ chiếu',
      category: 'Giấy tờ',
    },
    {
      name: 'CCCD',
      category: 'Giấy tờ',
    },
    {
      name: 'Bảo hiểm du lịch',
      category: 'Giấy tờ',
    },
    {
      name: 'Vé máy bay',
      category: 'Giấy tờ',
    },
    {
      name: 'Thẻ ngân hàng',
      category: 'Tài chính',
    },
    {
      name: 'Tiền mặt',
      category: 'Tài chính',
    },
    {
      name: 'Thị thực (Visa)',
      category: 'Giấy tờ',
    },
    {
      name: 'Áo thun',
      category: 'Quần áo',
    },
    {
      name: 'Quần dài',
      category: 'Quần áo',
    },
    {
      name: 'Đồ lót',
      category: 'Quần áo',
    },
    {
      name: 'Tất/Vớ',
      category: 'Quần áo',
    },
    {
      name: 'Áo khoác',
      category: 'Quần áo',
    },
    {
      name: 'Đồ ngủ',
      category: 'Quần áo',
    },
    {
      name: 'Đồ bơi',
      category: 'Quần áo',
    },
    {
      name: 'Áo mưa',
      category: 'Quần áo',
    },
    {
      name: 'Giày đi bộ êm chân',
      category: 'Quần áo',
    },
    {
      name: 'Bàn chải đánh răng',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Kem đánh răng',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Dầu gội',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Lăn khử mùi',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Kem chống nắng',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Dao cạo râu',
      category: 'Đồ vệ sinh',
    },
    {
      name: 'Sạc pin',
      category: 'Đồ điện tử',
    },
    {
      name: 'Sạc dự phòng',
      category: 'Đồ điện tử',
    },
    {
      name: 'Tai nghe',
      category: 'Đồ điện tử',
    },
    {
      name: 'Đầu chuyển đổi ổ cắm',
      category: 'Đồ điện tử',
    },
    {
      name: 'Máy ảnh',
      category: 'Đồ điện tử',
    },
    {
      name: 'Thuốc giảm đau',
      category: 'Sức khỏe',
    },
    {
      name: 'Băng cá nhân',
      category: 'Sức khỏe',
    },
    {
      name: 'Nước sát khuẩn',
      category: 'Sức khỏe',
    },
  ],
};

export default packing;
