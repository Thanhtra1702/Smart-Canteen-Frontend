export const todayVnDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export const MOCK_ZALO_BRAND = {
  brandName: 'Mino Smart Canteen',
  brandSubtitle: 'Meal In No Time',
  logoUrl: '',
};

export const MOCK_ZALO_CANTEENS = [
  {
    id: 'cs-01',
    name: 'THPT FPT Quy Nhơn • Cơ sở 1',
    address: 'Khu Đô thị An Phú Thịnh, P. Nhơn Bình, Quy Nhơn',
    standardMealPrice: 30000,
    maxDishes: 3,
    bufferMarginPercent: 10,
    cutoffBreakfast: '07:00',
    cutoffLunch: '23:59',
    cutoffDinner: '23:59',
    bankBin: '970422',
    bankAccountNumber: '090123456789',
    bankAccountName: 'CONG TY SMART CANTEEN CS1',
    notificationEmail: 'bep.cs1@smartcanteen.vn',
    isActive: true,
    mealPrices: [
      { mealType: 'BREAKFAST', price: 20000, maxDishes: 2 },
      { mealType: 'LUNCH', price: 30000, maxDishes: 3 },
      { mealType: 'DINNER', price: 30000, maxDishes: 3 },
    ],
  },
  {
    id: 'cs-02',
    name: 'Canteen KTX FPT TP.HCM',
    address: 'Khu Công Nghệ Cao, P. Long Thạnh Mỹ, TP. Thủ Đức',
    standardMealPrice: 35000,
    maxDishes: 3,
    bufferMarginPercent: 12,
    cutoffBreakfast: '07:00',
    cutoffLunch: '23:59',
    cutoffDinner: '23:59',
    bankBin: '970422',
    bankAccountNumber: '090987654321',
    bankAccountName: 'CONG TY SMART CANTEEN CS2',
    notificationEmail: 'bep.cs2@smartcanteen.vn',
    isActive: true,
    mealPrices: [
      { mealType: 'BREAKFAST', price: 25000, maxDishes: 2 },
      { mealType: 'LUNCH', price: 35000, maxDishes: 3 },
      { mealType: 'DINNER', price: 35000, maxDishes: 3 },
    ],
  },
];

export const MOCK_ZALO_DISHES = [
  {
    id: 'dish-1',
    canteenId: 'cs-01',
    name: 'Cơm tấm sườn cốt lết nướng mật ong',
    category: 'MAIN',
    extraPrice: 0,
    isAvailable: true,
    description: 'Sườn cốt lết ướp mật ong nướng thơm mềm, kèm đồ chua và mỡ hành.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-2',
    canteenId: 'cs-01',
    name: 'Gà chiên nước mắm tỏi ớt',
    category: 'MAIN',
    extraPrice: 5000,
    isAvailable: true,
    description: 'Đùi gà góc tư chiên giòn rụm áo sốt mắm tỏi đậm đà.',
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-3',
    canteenId: 'cs-01',
    name: 'Cá basa kho tộ tiêu xanh',
    category: 'MAIN',
    extraPrice: 0,
    isAvailable: true,
    description: 'Cá basa phi lê kho tộ nước dừa, ít xương an toàn cho học sinh.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-4',
    canteenId: 'cs-01',
    name: 'Bông cải xanh xào tỏi',
    category: 'VEGETABLE',
    extraPrice: 0,
    isAvailable: true,
    description: 'Súp lơ xanh Đà Lạt xào giòn giữ trọn vitamin tự nhiên.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-5',
    canteenId: 'cs-01',
    name: 'Canh cải thìa thịt băm',
    category: 'SOUP',
    extraPrice: 0,
    isAvailable: true,
    description: 'Rau cải thìa tươi nấu thịt nạc băm thanh mát.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-6',
    canteenId: 'cs-01',
    name: 'Trà đào cam sả ít đường',
    category: 'DRINK',
    extraPrice: 5000,
    isAvailable: true,
    description: 'Trà đào thanh nhiệt pha chế tươi mỗi sáng.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dish-7',
    canteenId: 'cs-01',
    name: 'Sữa chua nếp cẩm',
    category: 'DESSERT',
    extraPrice: 0,
    isAvailable: true,
    description: 'Sữa chua lên men tự nhiên kết hợp nếp cẩm dẻo thơm.',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80',
  },
];

export const MOCK_ZALO_USERS = [
  {
    id: 'mock_student_id',
    email: 'student@smartcanteen.vn',
    fullName: 'Nguyễn Văn An',
    role: 'USER',
    phone: '0903000001',
    studentCode: 'HS-2026-0098',
    canteenId: 'cs-01',
    canteen: { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    wallet: { balance: 350000 },
    studentLinks: [
      {
        studentCode: 'HS-2026-0098',
        parent: { id: 'mock_parent_id', fullName: 'Nguyễn Văn Ba', phone: '0904000001' },
      },
    ],
    subscriptions: [{ id: 'sub-1', package: { name: 'Gói 60 Suất (Trưa & Tối)' }, remainingMeals: 24 }],
  },
  {
    id: 'mock_student_2_id',
    email: 'student2@smartcanteen.vn',
    fullName: 'Trần Thị Bích',
    role: 'USER',
    phone: '0903000002',
    studentCode: 'HS-2026-0102',
    canteenId: 'cs-01',
    canteen: { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    wallet: { balance: 180000 },
    studentLinks: [
      {
        studentCode: 'HS-2026-0102',
        parent: { id: 'mock_parent_id', fullName: 'Nguyễn Văn Ba', phone: '0904000001' },
      },
    ],
    subscriptions: [],
  },
  {
    id: 'mock_parent_id',
    email: 'parent@smartcanteen.vn',
    fullName: 'Nguyễn Văn Ba (Phụ Huynh)',
    role: 'PARENT',
    phone: '0904000001',
    canteenId: 'cs-01',
    canteen: { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    wallet: { balance: 1500000 },
    parentLinks: [{ studentCode: 'HS-2026-0098' }, { studentCode: 'HS-2026-0102' }],
  },
  {
    id: 'mock_staff_id',
    email: 'admin.cs1@smartcanteen.vn',
    fullName: 'Trần Văn Cơ Sở (Admin CS1)',
    role: 'ADMIN',
    phone: '0902000001',
    canteenId: 'cs-01',
    canteen: { id: 'cs-01', name: 'THPT FPT Quy Nhơn • Cơ sở 1' },
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
  },
];

export const MOCK_ZALO_PACKAGES = [
  {
    id: 'pkg-1',
    canteenId: 'cs-01',
    name: 'Gói Tiêu Chuẩn 60 Suất',
    subtitle: 'Trưa & Tối • Cơm canh miễn phí',
    description: '60 lượt ăn trưa và tối trong 30 ngày. Tặng kèm cơm canh thêm miễn phí.',
    price: 1680000,
    totalCredits: 60,
    durationDays: 30,
    includesBreakfast: false,
  },
  {
    id: 'pkg-2',
    canteenId: 'cs-01',
    name: 'Gói Toàn Diện 90 Suất',
    subtitle: 'Cả 3 ca Sáng - Trưa - Tối',
    description: '90 suất ăn cả ngày (sáng, trưa, tối) tiện lợi và đầy đủ dinh dưỡng.',
    price: 2280000,
    totalCredits: 90,
    durationDays: 30,
    includesBreakfast: true,
  },
  {
    id: 'pkg-3',
    canteenId: 'cs-01',
    name: 'Gói 20 Suất Linh Hoạt',
    subtitle: 'Tự do đổi bữa • Hạn 45 ngày',
    description: '20 suất ăn trưa thời hạn 45 ngày. Tự động trừ suất khi quét mã QR nhận khay.',
    price: 600000,
    totalCredits: 20,
    durationDays: 45,
    includesBreakfast: false,
  },
];

export function createInitialStudentOrders() {
  const today = todayVnDate();
  return [
    {
      id: 'ord-today-pending-01',
      orderCode: 'ORD-8821',
      canteenId: 'cs-01',
      orderDate: today,
      date: today,
      mealType: 'LUNCH',
      status: 'CONFIRMED',
      paymentMethod: 'WALLET',
      totalAmount: 30000,
      isWaitingServing: false,
      createdAt: new Date().toISOString(),
      canteen: MOCK_ZALO_CANTEENS[0],
      items: [
        { dishId: 'dish-1', quantity: 1, dish: MOCK_ZALO_DISHES[0] },
        { dishId: 'dish-4', quantity: 1, dish: MOCK_ZALO_DISHES[3] },
        { dishId: 'dish-5', quantity: 1, dish: MOCK_ZALO_DISHES[4] },
      ],
    },
    {
      id: 'ord-today-served-02',
      orderCode: 'ORD-8710',
      canteenId: 'cs-01',
      orderDate: today,
      date: today,
      mealType: 'BREAKFAST',
      status: 'SERVED',
      paymentMethod: 'PACKAGE',
      totalAmount: 0,
      isWaitingServing: false,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      servedAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      canteen: MOCK_ZALO_CANTEENS[0],
      items: [
        { dishId: 'dish-2', quantity: 1, dish: MOCK_ZALO_DISHES[1] },
        { dishId: 'dish-6', quantity: 1, dish: MOCK_ZALO_DISHES[5] },
      ],
    },
  ];
}

export function createInitialChildren() {
  return [
    {
      linkId: 'link-01',
      studentId: 'mock_student_id',
      fullName: 'Nguyễn Văn An',
      email: 'student@smartcanteen.vn',
      phone: '0903000001',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
      balance: 350000,
      linkCode: 'HS-2026-0098',
      canteenName: 'THPT FPT Quy Nhơn • Cơ sở 1',
      totalRemainingCredits: 24,
      activeSubscriptions: [{ id: 'sub-1', packageName: 'Gói Tiêu Chuẩn 60 Suất', remainingMeals: 24 }],
      isServedToday: true,
      servedTime: '11:42',
      latestMealAlert: {
        orderId: 'ord-today-served-02',
        studentName: 'Nguyễn Văn An',
        mealType: 'BREAKFAST',
        mealLabel: 'Bữa sáng',
        servedTime: '07:15',
        message: 'Bé Nguyễn Văn An đã nhận suất ăn sáng tại quầy!',
        itemsSummary: 'Gà chiên nước mắm tỏi ớt, Trà đào cam sả',
      },
      todayOrders: [
        {
          id: 'ord-today-pending-01',
          mealType: 'LUNCH',
          status: 'CONFIRMED',
          totalAmount: 30000,
          createdAt: new Date().toISOString(),
          items: [
            { dish: MOCK_ZALO_DISHES[0] },
            { dish: MOCK_ZALO_DISHES[3] },
            { dish: MOCK_ZALO_DISHES[4] },
          ],
        },
        {
          id: 'ord-today-served-02',
          mealType: 'BREAKFAST',
          status: 'SERVED',
          totalAmount: 20000,
          createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          items: [{ dish: MOCK_ZALO_DISHES[1] }, { dish: MOCK_ZALO_DISHES[5] }],
        },
      ],
    },
    {
      linkId: 'link-02',
      studentId: 'mock_student_2_id',
      fullName: 'Trần Thị Bích',
      email: 'student2@smartcanteen.vn',
      phone: '0903000002',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      balance: 180000,
      linkCode: 'HS-2026-0102',
      canteenName: 'THPT FPT Quy Nhơn • Cơ sở 1',
      totalRemainingCredits: 12,
      activeSubscriptions: [{ id: 'sub-2', packageName: 'Gói 20 Suất Linh Hoạt', remainingMeals: 12 }],
      isServedToday: false,
      servedTime: null,
      latestMealAlert: null,
      todayOrders: [
        {
          id: 'ord-bich-01',
          mealType: 'LUNCH',
          status: 'CONFIRMED',
          totalAmount: 30000,
          createdAt: new Date().toISOString(),
          items: [{ dish: MOCK_ZALO_DISHES[2] }, { dish: MOCK_ZALO_DISHES[4] }],
        },
      ],
    },
  ];
}

export function createInitialParentRequests() {
  return [
    {
      id: 'req-01',
      type: 'TOPUP',
      amount: 200000,
      note: 'Bố mẹ nạp tiền cơm tuần này giúp An nhé',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
      student: {
        id: 'mock_student_id',
        fullName: 'Nguyễn Văn An',
        studentCode: 'HS-2026-0098',
      },
    },
    {
      id: 'req-02',
      type: 'PACKAGE',
      amount: 1680000,
      packageId: 'pkg-1',
      packageName: 'Gói Tiêu Chuẩn 60 Suất',
      note: 'Con muốn đăng ký gói cơm tháng 11 ạ',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      student: {
        id: 'mock_student_2_id',
        fullName: 'Trần Thị Bích',
        studentCode: 'HS-2026-0102',
      },
    },
    {
      id: 'req-03',
      type: 'TOPUP',
      amount: 500000,
      note: 'Nạp tiền dự phòng ăn sáng và nước uống',
      status: 'PAID',
      createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      student: {
        id: 'mock_student_id',
        fullName: 'Nguyễn Văn An',
        studentCode: 'HS-2026-0098',
      },
    },
    {
      id: 'req-04',
      type: 'PACKAGE',
      amount: 600000,
      packageId: 'pkg-3',
      packageName: 'Gói 20 Suất Linh Hoạt',
      note: 'Mua thêm 20 suất ăn trưa linh hoạt',
      status: 'PAID',
      createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
      student: {
        id: 'mock_student_id',
        fullName: 'Nguyễn Văn An',
        studentCode: 'HS-2026-0098',
      },
    },
    {
      id: 'req-05',
      type: 'TOPUP',
      amount: 300000,
      note: 'Gửi nhầm số tiền cần nạp',
      status: 'REJECTED',
      createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
      student: {
        id: 'mock_student_id',
        fullName: 'Nguyễn Văn An',
        studentCode: 'HS-2026-0098',
      },
    },
  ];
}

export interface ServingQueueItem {
  id: string;
  queueNumber: number;
  studentName: string;
  studentCode: string;
  mealType: string;
  status: string;
  dishes: string[];
  checkedInAt?: string;
  completedTimeStr?: string;
}

export function createInitialServingQueue(): {
  canteen: (typeof MOCK_ZALO_CANTEENS)[number];
  date: string;
  activeMealType: string;
  stats: {
    totalCheckins: number;
    waitingCount: number;
    servingCount: number;
    completedCount: number;
  };
  currentServing: ServingQueueItem | null;
  waitingQueue: ServingQueueItem[];
  completedQueue: ServingQueueItem[];
} {
  return {
    canteen: MOCK_ZALO_CANTEENS[0],
    date: todayVnDate(),
    activeMealType: 'LUNCH',
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
      mealType: 'LUNCH',
      status: 'SERVING',
      dishes: ['Cơm tấm sườn cốt lết nướng mật ong', 'Bông cải xanh xào tỏi', 'Canh cải thìa thịt băm'],
      checkedInAt: new Date(Date.now() - 45000).toISOString(),
    },
    waitingQueue: [
      {
        id: 'chk-w1',
        queueNumber: 146,
        studentName: 'Trần Thị Bích',
        studentCode: 'HS-2026-0102',
        mealType: 'LUNCH',
        status: 'SUCCESS',
        dishes: ['Cá basa kho tộ tiêu xanh', 'Canh cải thìa thịt băm'],
        checkedInAt: new Date(Date.now() - 25000).toISOString(),
      },
      {
        id: 'chk-w2',
        queueNumber: 147,
        studentName: 'Lê Hoàng Nam',
        studentCode: 'HS-2026-0115',
        mealType: 'LUNCH',
        status: 'SUCCESS',
        dishes: ['Gà chiên nước mắm tỏi ớt', 'Sữa chua nếp cẩm'],
        checkedInAt: new Date(Date.now() - 12000).toISOString(),
      },
      {
        id: 'chk-w3',
        queueNumber: 148,
        studentName: 'Phạm Minh Anh',
        studentCode: 'HS-2026-0129',
        mealType: 'LUNCH',
        status: 'SUCCESS',
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
        mealType: 'LUNCH',
        status: 'SERVED',
        completedTimeStr: '11:38',
        dishes: ['Cơm tấm sườn cốt lết nướng mật ong'],
      },
    ],
  };
}
