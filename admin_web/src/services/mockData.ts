import type { User } from '../context/AuthContext';

export const MOCK_USERS: (User & {
  phone?: string;
  studentCode?: string;
  isActive?: boolean;
  balance?: number;
  createdAt?: string;
})[] = [
  {
    id: 'user-super-admin',
    email: 'admin@smartcanteen.vn',
    fullName: 'Nguyễn Minh Quân (Super Admin)',
    role: 'SUPER_ADMIN',
    phone: '0901000001',
    canteenId: null,
    canteen: null,
    permissions: [],
    isActive: true,
    createdAt: '2026-01-05T08:00:00.000Z',
  },
  {
    id: 'user-admin-cs1',
    email: 'admin.cs1@smartcanteen.vn',
    fullName: 'Trần Văn Cơ Sở (Admin CS1)',
    role: 'ADMIN',
    phone: '0902000001',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    permissions: [
      'CANTEEN_CONFIG',
      'MENU_MANAGEMENT',
      'INVENTORY_MANAGEMENT',
      'PACKAGE_MANAGEMENT',
      'FEEDBACK_RESOLVE',
      'FINANCE_VIEW',
      'FINANCE_WITHDRAW',
      'SERVING_OPERATION',
    ],
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'user-admin-cs2',
    email: 'admin.cs2@smartcanteen.vn',
    fullName: 'Lê Thị Thu Hà (Admin CS2)',
    role: 'ADMIN',
    phone: '0902000002',
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    permissions: ['MENU_MANAGEMENT', 'INVENTORY_MANAGEMENT', 'SERVING_OPERATION', 'FEEDBACK_RESOLVE'],
    isActive: true,
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'user-student-1',
    email: 'student@smartcanteen.vn',
    fullName: 'Nguyễn Văn An',
    role: 'USER',
    phone: '0903000001',
    studentCode: 'HS-2026-0098',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    balance: 250000,
    isActive: true,
    createdAt: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'user-student-2',
    email: 'student2@smartcanteen.vn',
    fullName: 'Trần Thị Bích',
    role: 'USER',
    phone: '0903000002',
    studentCode: 'HS-2026-0102',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    balance: 180000,
    isActive: true,
    createdAt: '2026-02-03T08:00:00.000Z',
  },
  {
    id: 'user-parent-1',
    email: 'parent@smartcanteen.vn',
    fullName: 'Nguyễn Văn Ba (Phụ huynh)',
    role: 'PARENT',
    phone: '0904000001',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    balance: 1200000,
    isActive: true,
    createdAt: '2026-02-01T08:30:00.000Z',
  },
];

export const MOCK_CANTEENS = [
  {
    id: 'cs1',
    name: 'THPT FPT Quy Nhơn • Cơ sở 1',
    address: 'Khu đô thị An Phú Thịnh, P. Nhơn Bình, TP. Quy Nhơn',
    description: 'Canteen trung tâm phục vụ 1.200 học sinh bán trú & nội trú',
    notificationEmail: 'bep.cs1@smartcanteen.vn',
    bankBin: '970422',
    bankAccountNumber: '090123456789',
    bankAccountName: 'CONG TY SMART CANTEEN CS1',
    standardMealPrice: 35000,
    maxDishes: 3,
    bufferMarginPercent: 10,
    cutoffBreakfast: '07:00',
    cutoffLunch: '10:30',
    cutoffDinner: '16:00',
    isActive: true,
  },
  {
    id: 'cs2',
    name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2',
    address: 'Khu đô thị FPT City, P. Hòa Hải, Q. Ngũ Hành Sơn, Đà Nẵng',
    description: 'Canteen khu phức hợp giáo dục FPT Đà Nẵng',
    notificationEmail: 'bep.cs2@smartcanteen.vn',
    bankBin: '970422',
    bankAccountNumber: '090987654321',
    bankAccountName: 'CONG TY SMART CANTEEN CS2',
    standardMealPrice: 35000,
    maxDishes: 3,
    bufferMarginPercent: 12,
    cutoffBreakfast: '06:45',
    cutoffLunch: '10:15',
    cutoffDinner: '16:00',
    isActive: true,
  },
  {
    id: 'cs3',
    name: 'Tiểu học & THCS Cần Thơ • Cơ sở 3',
    address: '600 Nguyễn Văn Cừ nối dài, P. An Bình, Q. Ninh Kiều, Cần Thơ',
    description: 'Canteen tiêu chuẩn dinh dưỡng học đường miền Tây',
    notificationEmail: 'bep.cs3@smartcanteen.vn',
    bankBin: '970436',
    bankAccountNumber: '1012345678',
    bankAccountName: 'CONG TY SMART CANTEEN CS3',
    standardMealPrice: 32000,
    maxDishes: 3,
    bufferMarginPercent: 10,
    cutoffBreakfast: '07:00',
    cutoffLunch: '10:30',
    cutoffDinner: '16:30',
    isActive: false,
  },
];

export const MOCK_BRAND = {
  brandName: 'Smart Canteen HQ',
  brandSubtitle: 'Hệ thống F&B Chuỗi Học Đường',
  logoUrl: '',
  updatedAt: '2026-11-10T09:00:00.000Z',
  updatedBy: 'admin@smartcanteen.vn',
};

export const MOCK_DISHES = [
  {
    id: 'dish-1',
    name: 'Cơm tấm sườn cốt lết nướng mật ong',
    category: 'MAIN',
    extraPrice: 0,
    description: 'Sườn cốt lết ướp mật ong nướng than, kèm đồ chua và mỡ hành',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80',
    recipes: [
      { ingredientId: 'ing-1', quantityRequired: 0.15, ingredient: { name: 'Thịt sườn heo cốt lết', unit: 'kg' } },
      { ingredientId: 'ing-2', quantityRequired: 0.18, ingredient: { name: 'Gạo tấm thơm', unit: 'kg' } },
    ],
  },
  {
    id: 'dish-2',
    name: 'Gà chiên nước mắm tỏi ớt',
    category: 'MAIN',
    extraPrice: 5000,
    description: 'Đùi gà góc tư chiên giòn sốt mắm tỏi đậm đà',
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80',
    recipes: [
      { ingredientId: 'ing-3', quantityRequired: 0.18, ingredient: { name: 'Đùi gà công nghiệp', unit: 'kg' } },
      { ingredientId: 'ing-2', quantityRequired: 0.18, ingredient: { name: 'Gạo tấm thơm', unit: 'kg' } },
    ],
  },
  {
    id: 'dish-3',
    name: 'Cá basa kho tộ tiêu xanh',
    category: 'MAIN',
    extraPrice: 0,
    description: 'Cá basa phi lê kho tộ nước dừa, ít xương an toàn cho học sinh',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    recipes: [
      { ingredientId: 'ing-4', quantityRequired: 0.14, ingredient: { name: 'Cá basa phi lê', unit: 'kg' } },
    ],
  },
  {
    id: 'dish-4',
    name: 'Canh cải thìa thịt băm',
    category: 'SIDE',
    extraPrice: 0,
    description: 'Rau cải thìa tươi nấu thịt nạc băm thanh mát',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&auto=format&fit=crop&q=80',
    recipes: [
      { ingredientId: 'ing-5', quantityRequired: 0.1, ingredient: { name: 'Rau cải thìa Đà Lạt', unit: 'kg' } },
    ],
  },
  {
    id: 'dish-5',
    name: 'Bông cải xanh xào tỏi',
    category: 'SIDE',
    extraPrice: 0,
    description: 'Súp lơ xanh xào giòn giữ nguyên vitamin',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80',
    recipes: [
      { ingredientId: 'ing-6', quantityRequired: 0.1, ingredient: { name: 'Súp lơ xanh', unit: 'kg' } },
    ],
  },
  {
    id: 'dish-6',
    name: 'Trà đào cam sả ít đường',
    category: 'DRINK',
    extraPrice: 5000,
    description: 'Trà đào thanh nhiệt pha chế trong ngày',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
    recipes: [],
  },
  {
    id: 'dish-7',
    name: 'Sữa chua nếp cẩm',
    category: 'DESSERT',
    extraPrice: 0,
    description: 'Sữa chua lên men tự nhiên kết hợp nếp cẩm dẻo',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80',
    recipes: [],
  },
];

export const MOCK_INGREDIENTS = [
  {
    id: 'ing-1',
    name: 'Thịt sườn heo cốt lết',
    category: 'Thịt tươi sống',
    unit: 'kg',
    currentQty: 42,
    minThreshold: 25,
    unitPrice: 135000,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    isLowStock: false,
    updatedAt: '2026-11-14T06:30:00.000Z',
  },
  {
    id: 'ing-2',
    name: 'Gạo tấm thơm ST25',
    category: 'Lương thực khô',
    unit: 'kg',
    currentQty: 18,
    minThreshold: 50,
    unitPrice: 24000,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    isLowStock: true,
    updatedAt: '2026-11-14T06:30:00.000Z',
  },
  {
    id: 'ing-3',
    name: 'Đùi gà góc tư CP',
    category: 'Thịt tươi sống',
    unit: 'kg',
    currentQty: 12,
    minThreshold: 20,
    unitPrice: 78000,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    isLowStock: true,
    updatedAt: '2026-11-14T07:00:00.000Z',
  },
  {
    id: 'ing-4',
    name: 'Cá basa phi lê đông lạnh',
    category: 'Thủy hải sản',
    unit: 'kg',
    currentQty: 35,
    minThreshold: 15,
    unitPrice: 89000,
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    isLowStock: false,
    updatedAt: '2026-11-14T06:15:00.000Z',
  },
  {
    id: 'ing-5',
    name: 'Rau cải thìa Đà Lạt',
    category: 'Rau củ quả',
    unit: 'kg',
    currentQty: 8,
    minThreshold: 15,
    unitPrice: 28000,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    isLowStock: true,
    updatedAt: '2026-11-14T05:45:00.000Z',
  },
  {
    id: 'ing-6',
    name: 'Súp lơ xanh',
    category: 'Rau củ quả',
    unit: 'kg',
    currentQty: 26,
    minThreshold: 12,
    unitPrice: 42000,
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    isLowStock: false,
    updatedAt: '2026-11-14T05:45:00.000Z',
  },
];

export const MOCK_INVENTORY_TRANSACTIONS = [
  {
    id: 'inv-tx-1',
    type: 'IMPORT',
    quantity: 50,
    unitPrice: 135000,
    note: 'Nhập hàng tươi sống đầu ngày từ NCC CP Foods',
    createdAt: '2026-11-14T06:00:00.000Z',
    ingredient: { id: 'ing-1', name: 'Thịt sườn heo cốt lết', unit: 'kg' },
    actor: { fullName: 'Trần Văn Cơ Sở' },
  },
  {
    id: 'inv-tx-2',
    type: 'EXPORT',
    quantity: 22,
    unitPrice: 24000,
    note: 'Xuất nấu ca trưa 450 suất',
    createdAt: '2026-11-14T08:30:00.000Z',
    ingredient: { id: 'ing-2', name: 'Gạo tấm thơm ST25', unit: 'kg' },
    actor: { fullName: 'Bếp trưởng Minh' },
  },
  {
    id: 'inv-tx-3',
    type: 'WASTE',
    quantity: 1.5,
    unitPrice: 28000,
    note: 'Loại bỏ lá úa khi sơ chế',
    createdAt: '2026-11-13T15:10:00.000Z',
    ingredient: { id: 'ing-5', name: 'Rau cải thìa Đà Lạt', unit: 'kg' },
    actor: { fullName: 'Phụ bếp Lan' },
  },
];

export const MOCK_PACKAGES = [
  {
    id: 'pkg-1',
    name: 'Gói 30 Suất (Ca Trưa)',
    description: 'Áp dụng cho 30 bữa trưa tiêu chuẩn trong 30 ngày. Tặng kèm canh & tráng miệng.',
    price: 990000,
    totalCredits: 30,
    totalMeals: 30,
    durationDays: 30,
    includesBreakfast: false,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    activeSubscribers: 184,
    isActive: true,
  },
  {
    id: 'pkg-2',
    name: 'Gói 60 Suất (Trưa & Tối)',
    description: 'Dành cho học sinh nội trú: 60 lượt ăn trưa và tối linh hoạt trong tháng.',
    price: 1860000,
    totalCredits: 60,
    totalMeals: 60,
    durationDays: 30,
    includesBreakfast: false,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    activeSubscribers: 96,
    isActive: true,
  },
  {
    id: 'pkg-3',
    name: 'Gói Toàn Diện 90 Suất (Sáng - Trưa - Tối)',
    description: 'Trọn gói 3 bữa/ngày trong 30 ngày, ưu đãi 12% so với đặt lẻ.',
    price: 2590000,
    totalCredits: 90,
    totalMeals: 90,
    durationDays: 30,
    includesBreakfast: true,
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    activeSubscribers: 62,
    isActive: true,
  },
];

export const MOCK_WITHDRAWALS = [
  {
    id: 'wd-1',
    code: 'DS-202611-01',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    amount: 45000000,
    status: 'COMPLETED',
    description: 'Đối soát doanh thu tuần 1 tháng 11/2026',
    createdAt: '2026-11-08T10:00:00.000Z',
    processedAt: '2026-11-09T14:20:00.000Z',
  },
  {
    id: 'wd-2',
    code: 'DS-202611-02',
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    amount: 28500000,
    status: 'PENDING',
    description: 'Yêu cầu rút doanh thu giữa tháng 11/2026',
    createdAt: '2026-11-13T16:40:00.000Z',
    processedAt: null,
  },
];

export const MOCK_WALLET_TRANSACTIONS = [
  {
    id: 'wtx-1',
    type: 'TOPUP',
    amount: 500000,
    balanceAfter: 750000,
    description: 'Phụ huynh Nguyễn Văn Ba nạp ví qua VietQR',
    status: 'SUCCESS',
    canteenId: 'cs1',
    user: { fullName: 'Nguyễn Văn An', email: 'student@smartcanteen.vn' },
    createdAt: '2026-11-14T07:45:00.000Z',
  },
  {
    id: 'wtx-2',
    type: 'PAYMENT',
    amount: -35000,
    balanceAfter: 715000,
    description: 'Thanh toán suất ăn trưa #ORD-8821',
    status: 'SUCCESS',
    canteenId: 'cs1',
    user: { fullName: 'Nguyễn Văn An', email: 'student@smartcanteen.vn' },
    createdAt: '2026-11-14T09:15:00.000Z',
  },
  {
    id: 'wtx-3',
    type: 'PACKAGE_PURCHASE',
    amount: -990000,
    balanceAfter: 210000,
    description: 'Đăng ký Gói 30 Suất (Ca Trưa)',
    status: 'SUCCESS',
    canteenId: 'cs2',
    user: { fullName: 'Trần Thị Bích', email: 'student2@smartcanteen.vn' },
    createdAt: '2026-11-13T19:20:00.000Z',
  },
];

export const MOCK_FEEDBACKS = [
  {
    id: 'fb-1',
    rating: 5,
    comment: 'Cơm tấm sườn hôm nay rất ngon, sườn mềm và nóng hổi. Mong canteen giữ phong độ!',
    status: 'RESOLVED',
    reply: 'Cảm ơn em đã góp ý! Bếp cơ sở 1 sẽ tiếp tục duy trì chất lượng phục vụ.',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    user: { id: 'user-student-1', fullName: 'Nguyễn Văn An', studentCode: 'HS-2026-0098' },
    dish: { id: 'dish-1', name: 'Cơm tấm sườn cốt lết nướng mật ong' },
    createdAt: '2026-11-13T12:15:00.000Z',
  },
  {
    id: 'fb-2',
    rating: 3,
    comment: 'Giờ cao điểm 11h45 hàng chờ quét QR hơi đông, mong mở thêm 1 lane trả khay.',
    status: 'IN_PROGRESS',
    reply: null,
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    user: { id: 'user-student-2', fullName: 'Trần Thị Bích', studentCode: 'HS-2026-0102' },
    dish: null,
    assignedTo: { id: 'user-admin-cs1', fullName: 'Trần Văn Cơ Sở (Admin CS1)' },
    createdAt: '2026-11-14T11:55:00.000Z',
  },
  {
    id: 'fb-3',
    rating: 4,
    comment: 'Canh cải thìa hơi nhạt một chút nhưng rau rất tươi.',
    status: 'NEW',
    reply: null,
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    user: { id: 'user-parent-1', fullName: 'Nguyễn Văn Ba (Phụ huynh)' },
    dish: { id: 'dish-4', name: 'Canh cải thìa thịt băm' },
    createdAt: '2026-11-14T12:30:00.000Z',
  },
];

export const MOCK_AUDIT_LOGS = [
  {
    id: 'log-1',
    action: 'UPDATE_CANTEEN_CONFIG',
    entityType: 'CANTEEN',
    entityId: 'cs1',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    actor: { fullName: 'Nguyễn Minh Quân (Super Admin)', email: 'admin@smartcanteen.vn' },
    beforeJson: { cutoffLunch: '10:00', bufferMarginPercent: 8 },
    afterJson: { cutoffLunch: '10:30', bufferMarginPercent: 10 },
    details: { cutoffLunch: '10:30', bufferMarginPercent: 10 },
    createdAt: '2026-11-14T08:12:00.000Z',
  },
  {
    id: 'log-2',
    action: 'STOCK_ADJUSTMENT',
    entityType: 'INGREDIENT',
    entityId: 'ing-1',
    canteenId: 'cs1',
    canteen: { id: 'cs1', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    actor: { fullName: 'Trần Văn Cơ Sở (Admin CS1)', email: 'admin.cs1@smartcanteen.vn' },
    beforeJson: { ingredient: 'Thịt sườn heo cốt lết', currentQty: 35 },
    afterJson: { ingredient: 'Thịt sườn heo cốt lết', currentQty: 85, reason: 'Nhập hàng tươi sống đầu ngày' },
    details: { delta: 50, reason: 'Nhập hàng tươi sống đầu ngày' },
    createdAt: '2026-11-14T06:05:00.000Z',
  },
  {
    id: 'log-3',
    action: 'CREATE_PACKAGE',
    entityType: 'PACKAGE',
    entityId: 'pkg-3',
    canteenId: 'cs2',
    canteen: { id: 'cs2', name: 'THCS & THPT FPT Đà Nẵng • Cơ sở 2' },
    actor: { fullName: 'Nguyễn Minh Quân (Super Admin)', email: 'admin@smartcanteen.vn' },
    beforeJson: null,
    afterJson: { name: 'Gói Toàn Diện 90 Suất (Sáng - Trưa - Tối)', price: 2590000, totalCredits: 90 },
    details: { name: 'Gói Toàn Diện 90 Suất (Sáng - Trưa - Tối)', price: 2590000 },
    createdAt: '2026-11-12T15:30:00.000Z',
  },
];

export function buildMockDashboard(canteenId?: string) {
  const isFiltered = canteenId && canteenId !== 'ALL';
  const scale = isFiltered ? (canteenId === 'cs1' ? 0.62 : 0.38) : 1;

  const canteensPerformance = MOCK_CANTEENS.filter((c) => !isFiltered || c.id === canteenId).map((c, idx) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    checkinCount: c.isActive ? (idx === 0 ? 310 : 185) : 0,
    orderCount: c.isActive ? (idx === 0 ? 195 : 112) : 0,
    todayRevenue: c.isActive ? (idx === 0 ? 17675000 : 10395000) : 0,
    isActive: c.isActive,
  }));

  const alerts = MOCK_INGREDIENTS.filter((i) => i.isLowStock && (!isFiltered || i.canteenId === canteenId)).map(
    (i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      currentQty: i.currentQty,
      minThreshold: i.minThreshold,
      unit: i.unit,
      canteenName: i.canteen?.name,
    })
  );

  return {
    summary: {
      totalRevenueToday: Math.round(28070000 * scale),
      totalRevenueMonth: Math.round(642500000 * scale),
      totalOrdersToday: Math.round(307 * scale),
      totalCheckinsToday: Math.round(495 * scale),
      peakHourSlot: '11:30 - 12:15',
      busiestDay: 'Thứ Tư',
      lowStockAlertCount: alerts.length,
    },
    sevenDayTrend: [
      { dateStr: '08/11', dayLabel: 'T7', revenue: Math.round(14200000 * scale), meals: Math.round(410 * scale) },
      { dateStr: '09/11', dayLabel: 'CN', revenue: Math.round(9800000 * scale), meals: Math.round(285 * scale) },
      { dateStr: '10/11', dayLabel: 'T2', revenue: Math.round(26400000 * scale), meals: Math.round(760 * scale) },
      { dateStr: '11/11', dayLabel: 'T3', revenue: Math.round(27100000 * scale), meals: Math.round(780 * scale) },
      { dateStr: '12/11', dayLabel: 'T4', revenue: Math.round(29500000 * scale), meals: Math.round(845 * scale) },
      { dateStr: '13/11', dayLabel: 'T5', revenue: Math.round(27800000 * scale), meals: Math.round(795 * scale) },
      { dateStr: '14/11', dayLabel: 'T6', revenue: Math.round(28070000 * scale), meals: Math.round(802 * scale) },
    ],
    canteensPerformance,
    lowStockAlerts: alerts,
    topDishes: [
      {
        id: 'dish-1',
        rank: 1,
        name: 'Cơm tấm sườn cốt lết nướng mật ong',
        category: 'MAIN',
        extraPrice: 0,
        totalOrdered: Math.round(320 * scale),
        percentage: 42,
        revenue: Math.round(11200000 * scale),
      },
      {
        id: 'dish-2',
        rank: 2,
        name: 'Gà chiên nước mắm tỏi ớt',
        category: 'MAIN',
        extraPrice: 5000,
        totalOrdered: Math.round(215 * scale),
        percentage: 28,
        revenue: Math.round(8600000 * scale),
      },
      {
        id: 'dish-3',
        rank: 3,
        name: 'Cá basa kho tộ tiêu xanh',
        category: 'MAIN',
        extraPrice: 0,
        totalOrdered: Math.round(145 * scale),
        percentage: 19,
        revenue: Math.round(5075000 * scale),
      },
      {
        id: 'dish-6',
        rank: 4,
        name: 'Trà đào cam sả ít đường',
        category: 'DRINK',
        extraPrice: 5000,
        totalOrdered: Math.round(85 * scale),
        percentage: 11,
        revenue: Math.round(425000 * scale),
      },
    ],
    hourlyTraffic: [
      { slot: '06:30 - 07:30', label: 'Ca Sáng', count: Math.round(140 * scale), percentage: 18, isPeak: false },
      { slot: '11:00 - 11:30', label: 'Đầu ca Trưa', count: Math.round(165 * scale), percentage: 21, isPeak: false },
      { slot: '11:30 - 12:15', label: 'Cao điểm Trưa', count: Math.round(335 * scale), percentage: 42, isPeak: true },
      { slot: '17:00 - 18:30', label: 'Ca Tối nội trú', count: Math.round(162 * scale), percentage: 19, isPeak: false },
    ],
    peakInsight: {
      slot: '11:30 - 12:15',
      recommendation: 'Nên bố trí tối thiểu 2 nhân viên quét QR & 3 nhân viên chia khay ở khung giờ này.',
    },
    weekdayTraffic: [
      { day: 'Thứ 2', count: Math.round(760 * scale), percentage: 89, isBusiest: false },
      { day: 'Thứ 3', count: Math.round(780 * scale), percentage: 92, isBusiest: false },
      { day: 'Thứ 4', count: Math.round(845 * scale), percentage: 100, isBusiest: true },
      { day: 'Thứ 5', count: Math.round(795 * scale), percentage: 94, isBusiest: false },
      { day: 'Thứ 6', count: Math.round(802 * scale), percentage: 95, isBusiest: false },
    ],
    weekdayInsight: {
      busiestDay: 'Thứ Tư',
      note: 'Ngày giữa tuần thường có thực đơn sườn nướng/gà chiên nên nhu cầu tăng ~10%.',
    },
  };
}

export function buildMockWeeklyMenus(canteenId?: string, startDate?: string) {
  const baseDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const monday = new Date(baseDate);
  if (!startDate) {
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
  }

  const targetCanteen = canteenId && canteenId !== 'ALL' ? canteenId : 'cs1';
  const result: any[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    result.push({
      id: `menu-${targetCanteen}-${dateStr}-BREAKFAST`,
      canteenId: targetCanteen,
      date: dateStr,
      mealType: 'BREAKFAST',
      items: [
        { id: `mi-b1-${i}`, dish: MOCK_DISHES[1] },
        { id: `mi-b2-${i}`, dish: MOCK_DISHES[5] },
      ],
    });
    result.push({
      id: `menu-${targetCanteen}-${dateStr}-LUNCH`,
      canteenId: targetCanteen,
      date: dateStr,
      mealType: 'LUNCH',
      items: [
        { id: `mi-l1-${i}`, dish: MOCK_DISHES[0] },
        { id: `mi-l2-${i}`, dish: MOCK_DISHES[2] },
        { id: `mi-l3-${i}`, dish: MOCK_DISHES[3] },
        { id: `mi-l4-${i}`, dish: MOCK_DISHES[6] },
      ],
    });
    result.push({
      id: `menu-${targetCanteen}-${dateStr}-DINNER`,
      canteenId: targetCanteen,
      date: dateStr,
      mealType: 'DINNER',
      items: [
        { id: `mi-d1-${i}`, dish: MOCK_DISHES[1] },
        { id: `mi-d2-${i}`, dish: MOCK_DISHES[4] },
      ],
    });
  }

  return result;
}

export function buildMockServingDisplay(canteenId: string, mealType = 'LUNCH') {
  const canteen = MOCK_CANTEENS.find((c) => c.id === canteenId) || MOCK_CANTEENS[0];
  return {
    canteen,
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
    activeMealType: mealType,
    todayMenus: [
      {
        mealType,
        items: [
          { dish: MOCK_DISHES[0] },
          { dish: MOCK_DISHES[1] },
          { dish: MOCK_DISHES[3] },
        ],
      },
    ],
    stats: {
      totalCheckins: 148,
      waitingCount: 3,
      servingCount: 1,
      completedCount: 144,
    },
    currentServing: {
      id: 'chk-now',
      queueNumber: 145,
      studentName: 'Nguyễn Văn An',
      studentCode: 'HS-2026-0098',
      mealType,
      status: 'SERVING',
      dishes: ['Cơm tấm sườn cốt lết nướng mật ong', 'Canh cải thìa thịt băm'],
      checkedInAt: new Date(Date.now() - 45000).toISOString(),
    },
    waitingQueue: [
      {
        id: 'chk-w1',
        queueNumber: 146,
        studentName: 'Trần Thị Bích',
        studentCode: 'HS-2026-0102',
        mealType,
        status: 'WAITING',
        dishes: ['Gà chiên nước mắm tỏi ớt', 'Sữa chua nếp cẩm'],
        checkedInAt: new Date(Date.now() - 25000).toISOString(),
      },
      {
        id: 'chk-w2',
        queueNumber: 147,
        studentName: 'Lê Hoàng Nam',
        studentCode: 'HS-2026-0115',
        mealType,
        status: 'WAITING',
        dishes: ['Cá basa kho tộ tiêu xanh', 'Canh cải thìa thịt băm'],
        checkedInAt: new Date(Date.now() - 12000).toISOString(),
      },
      {
        id: 'chk-w3',
        queueNumber: 148,
        studentName: 'Phạm Minh Anh',
        studentCode: 'HS-2026-0129',
        mealType,
        status: 'WAITING',
        dishes: ['Cơm tấm sườn cốt lết nướng mật ong'],
        checkedInAt: new Date(Date.now() - 5000).toISOString(),
      },
    ],
    completedQueue: [
      {
        id: 'chk-c1',
        queueNumber: 144,
        studentName: 'Võ Gia Huy',
        studentCode: 'HS-2026-0081',
        mealType,
        status: 'COMPLETED',
        dishes: ['Cơm tấm sườn cốt lết nướng mật ong'],
        servedAt: new Date(Date.now() - 90000).toISOString(),
      },
    ],
  };
}
