# Tư vấn tâm lý KTX

Website tĩnh giới thiệu phòng tham vấn tâm lý Ký túc xá: thông tin liên hệ, lịch trực, workshop, góc kiến thức và chatbot hỗ trợ nhanh. Không cần build, không phụ thuộc thư viện ngoài.

## Cấu trúc

```
├── index.html
├── data/site-data.js   # toàn bộ nội dung chỉnh sửa được (thông tin, lịch trực, workshop)
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── main.js     # hiển thị trang + chatbot
│       └── admin.js    # trình chỉnh sửa (chỉ tải khi bấm "Quản trị")
└── README.md
```

## Chỉnh sửa nội dung ngay trên trang (Quản trị)

1. Ở cuối trang bấm **🔧 Quản trị** (hoặc thêm `#admin` vào địa chỉ trang).
2. Sửa thông tin, lịch trực, workshop; trang phía sau đổi ngay để xem trước.
3. Lưu bằng một trong các cách:
   - **Đăng lên website:** nhập tài khoản, tên repo, nhánh và token GitHub rồi bấm **🚀 Đăng lên website**. Trang sẽ tự commit file `data/site-data.js`, sau 1–2 phút mọi người sẽ thấy.
   - **💾 Lưu nháp:** chỉ lưu trong trình duyệt của bạn, người khác không thấy.
   - **⬇️ Tải file / ⬆️ Nhập file:** tải `site-data.js` về để tự commit, hoặc nhập lại file đã có.

### Tạo token GitHub (đóng vai trò mật khẩu admin)

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Chọn đúng repo của website, đặt quyền **Contents: Read and write**. Chỉ người có token này mới đăng được nội dung. Không chia sẻ token và không ghi token vào code.

> Nút "Quản trị" ai cũng thấy, nhưng người không có token chỉ xem thử được trên máy họ, không thể thay đổi website.

## Chạy thử

Mở `index.html` bằng trình duyệt, hoặc chạy `python3 -m http.server` rồi vào http://localhost:8000.

## Đưa lên GitHub Pages

1. Tạo repository mới và đẩy các file này lên nhánh `main`.
2. Vào **Settings → Pages**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`.
3. Sau ít phút, website có tại `https://<tên-tài-khoản>.github.io/<tên-repo>/`.

## Lưu ý

Website chỉ cung cấp thông tin tham khảo, không thay thế chẩn đoán hay điều trị y khoa.
