# Smart Canteen - Zalo Mini App

Ứng dụng Zalo Mini App dành cho học sinh, sinh viên và cán bộ giảng viên để:
- Xem thực đơn hôm nay, tuần này theo từng ca ăn (Sáng, Trưa, Tối).
- Chọn món trước (Pre-order) tránh cảnh xếp hàng chen chúc.
- Sử dụng mã nhận cơm điện tử QR Pass thông minh tại quầy phục vụ.
- Quản lý gói cơm tháng, ví điện tử và nạp tiền qua VietQR tự động.

## Cài đặt và Chạy thử nghiệm Local Simulator
```bash
cd zalo_miniapp
npm install
npm run dev
```
Truy cập: `http://localhost:5174`

## Đóng gói và Triển khai lên Zalo Mini App Platform
```bash
# 1. Cài đặt ZMP CLI (Zalo Mini App CLI)
npm install -g zmp-cli

# 2. Đăng nhập Zalo Developer Account
zmp login

# 3. Build và Deploy bản thử nghiệm
npm run build
zmp deploy
```
