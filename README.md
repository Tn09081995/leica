# Lumina Studio — Trình Xử Lý Ảnh Trên Trình Duyệt

Ứng dụng xử lý ảnh hiện đại theo phong cách phòng tối kỹ thuật số, chạy hoàn toàn phía client bằng HTML5 Canvas (không cần cài đặt thư viện, không tải ảnh lên máy chủ).

## Tính năng nổi bật

- **10 Bộ lọc màu phim & phong cách** với ảnh xem trước trực tiếp: Leica Classic, Leica Monochrom, Kodak Portra, Fuji Velvia, Cine Teal & Orange, Giờ Vàng, Noir Tương Phản, Phim Mờ Vintage, Đêm Tokyo.
- **Chỉnh màu chuyên sâu & Biểu đồ sáng (Histogram)** thời gian thực: Phơi sáng, Tương phản, Highlights, Shadows, Điểm trắng/đen, Nhiệt độ màu, Tint, Vibrance, Độ bão hòa, Độ sắc nét, Làm mờ, Vignette, Hạt phim, Fade, Sepia.
- **Cắt & Xoay (Crop & Transform)**: Cắt tự do hoặc theo tỷ lệ (`1:1`, `4:3`, `3:2`, `16:9`, `4:5`, `9:16`), xoay 90°, lật ngang/dọc, căn thẳng góc.
- **Khung ảnh & Chữ ký Studio**: Gallery trắng, Phòng tối, Polaroid, Chữ ký Studio kèm thông số EXIF.
- **Tiện ích chỉnh sửa**: So sánh Trước/Sau bằng thanh kéo hoặc nhấn giữ phím `\`, Hoàn tác/Làm lại (`Ctrl+Z` / `Ctrl+Y`), dán ảnh từ clipboard (`Ctrl+V`), xuất ảnh chất lượng cao (`JPEG`, `PNG`, `WebP`).

## Cách chạy cục bộ

### Cách 1: Mở trực tiếp
Mở tệp `index.html` bằng trình duyệt web bất kỳ.

### Cách 2: Chạy qua Node.js
```bash
node server.js
```
Sau đó mở trình duyệt tại `http://localhost:8080`.
