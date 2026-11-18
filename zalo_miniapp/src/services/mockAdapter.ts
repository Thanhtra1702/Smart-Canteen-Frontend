import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  MOCK_ZALO_BRAND,
  MOCK_ZALO_CANTEENS,
  MOCK_ZALO_DISHES,
  MOCK_ZALO_PACKAGES,
  MOCK_ZALO_USERS,
  createInitialChildren,
  createInitialParentRequests,
  createInitialServingQueue,
  createInitialStudentOrders,
  todayVnDate,
} from './mockData';

interface MockFeedback {
  id: string;
  rating: number;
  comment: string;
  status: string;
  reply: string;
  user: { fullName: string; studentCode: string };
  dish: { name: string } | null;
  createdAt: string;
}

const state = {
  users: [...MOCK_ZALO_USERS],
  canteens: [...MOCK_ZALO_CANTEENS],
  dishes: [...MOCK_ZALO_DISHES],
  packages: [...MOCK_ZALO_PACKAGES],
  walletBalance: 350000,
  remainingMeals: 24,
  remainingBreakfastMeals: 8,
  transactions: [
    {
      id: 'tx-1',
      type: 'MEAL',
      amount: 0,
      description: 'Dùng 1 suất Vé Tháng Bán Trú',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'tx-2',
      type: 'PAYMENT',
      amount: -30000,
      description: 'Đặt suất cơm trưa #ORD-8821',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'tx-3',
      type: 'TOPUP',
      amount: 500000,
      description: 'Phụ huynh nạp ví qua VietQR',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'tx-4',
      type: 'PAYMENT',
      amount: -25000,
      description: 'Đặt bữa sáng + Trà đào cam sả',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'tx-5',
      type: 'PACKAGE',
      amount: -600000,
      description: 'Đăng ký Gói 20 Suất Linh Hoạt',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'tx-6',
      type: 'TOPUP',
      amount: 200000,
      description: 'Nạp tiền vào ví Canteen qua VietQR',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
  ],
  orders: createInitialStudentOrders(),
  children: createInitialChildren(),
  parentRequests: createInitialParentRequests(),
  servingQueue: createInitialServingQueue(),
  feedbacks: [
    {
      id: 'fb-1',
      rating: 5,
      comment: 'Cơm tấm sườn hôm nay rất ngon, sườn mềm và nóng hổi!',
      status: 'RESOLVED',
      reply: 'Cảm ơn em đã góp ý 5 sao cho bếp Cơ sở 1!',
      user: { fullName: 'Nguyễn Văn An', studentCode: 'HS-2026-0098' },
      dish: { name: 'Cơm tấm sườn cốt lết nướng mật ong' },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'fb-2',
      rating: 4,
      comment: 'Canh cải thìa hơi nhạt nhẹ một chút nhưng rau rất tươi.',
      status: 'NEW',
      reply: '',
      user: { fullName: 'Trần Thị Bích', studentCode: 'HS-2026-0102' },
      dish: { name: 'Canh cải thìa thịt băm' },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ] as MockFeedback[],
};

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const parseBody = (data: unknown): Record<string, any> => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data as Record<string, any>;
};

const ok = (config: InternalAxiosRequestConfig, data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config,
});

const fail = (config: InternalAxiosRequestConfig, status: number, message: string) => {
  const err: any = new Error(message);
  err.config = config;
  err.response = { status, data: { message }, headers: {}, config };
  return Promise.reject(err);
};

function getCurrentUser(config: InternalAxiosRequestConfig) {
  const auth = config.headers?.Authorization || config.headers?.authorization;
  const token = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';
  if (token.startsWith('mock-zalo-token:')) {
    const id = token.slice('mock-zalo-token:'.length);
    return state.users.find((u) => u.id === id) || state.users[0];
  }
  return state.users[0];
}

export function setupZaloMockAdapter(api: AxiosInstance) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await delay(80);

    const method = (config.method || 'get').toLowerCase();
    const rawUrl = (config.url || '/').split('?')[0];
    const path = rawUrl.replace(/^\/api/, '') || '/';
    const params = (config.params || {}) as Record<string, any>;
    const body = parseBody(config.data);

    // 1. AUTH & PROFILE
    if (path === '/auth/login' && method === 'post') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) {
        return fail(config, 400, 'Vui lòng nhập email');
      }
      const found =
        state.users.find((u) => u.email.toLowerCase() === email) ||
        (email.includes('parent')
          ? state.users[2]
          : email.includes('admin') || email.includes('staff')
          ? state.users[3]
          : state.users[0]);

      return ok(config, {
        token: `mock-zalo-token:${found.id}`,
        user: found,
      });
    }

    if (path === '/users/me' && method === 'get') {
      return ok(config, getCurrentUser(config));
    }

    if ((path === '/users/me' || path.startsWith('/users/')) && (method === 'patch' || method === 'put')) {
      const current = getCurrentUser(config);
      const updated = { ...current, ...body };
      state.users = state.users.map((u) => (u.id === current.id ? updated : u));
      return ok(config, updated);
    }

    if (path === '/users' && method === 'get') {
      return ok(config, state.users);
    }

    // 2. BRAND & CANTEENS
    if (path === '/brand' && method === 'get') {
      return ok(config, MOCK_ZALO_BRAND);
    }

    if (path === '/canteens' && method === 'get') {
      return ok(config, state.canteens);
    }

    const canteenConfigMatch = path.match(/^\/canteens\/([^/]+)(?:\/config)?$/);
    if (canteenConfigMatch && (method === 'patch' || method === 'put')) {
      const id = canteenConfigMatch[1];
      state.canteens = state.canteens.map((c) => (c.id === id ? { ...c, ...body } : c));
      const updated = state.canteens.find((c) => c.id === id);
      return ok(config, { canteen: updated, ...updated });
    }

    if (path === '/canteen/me' && method === 'put') {
      const cid = getCurrentUser(config).canteenId || 'cs-01';
      state.canteens = state.canteens.map((c) => (c.id === cid ? { ...c, ...body } : c));
      return ok(config, state.canteens.find((c) => c.id === cid) || {});
    }

    // 3. MENU & DISHES
    if ((path === '/menu/today' || path === '/menu') && method === 'get') {
      const date = params.date || todayVnDate();
      const canteenId = params.canteenId || 'cs-01';
      return ok(config, [
        {
          id: `menu-${date}-BREAKFAST`,
          canteenId,
          date,
          mealType: 'BREAKFAST',
          items: [{ dish: state.dishes[1] }, { dish: state.dishes[5] }],
        },
        {
          id: `menu-${date}-LUNCH`,
          canteenId,
          date,
          mealType: 'LUNCH',
          items: state.dishes.map((dish) => ({ dish })),
        },
        {
          id: `menu-${date}-DINNER`,
          canteenId,
          date,
          mealType: 'DINNER',
          items: [
            { dish: state.dishes[0] },
            { dish: state.dishes[2] },
            { dish: state.dishes[3] },
            { dish: state.dishes[6] },
          ],
        },
      ]);
    }

    if ((path === '/menu/dishes' || path === '/dishes') && method === 'get') {
      return ok(config, state.dishes);
    }

    if (path === '/menu/dishes' && method === 'post') {
      const newDish: (typeof state.dishes)[number] = {
        ...body,
        id: `dish-${Date.now()}`,
        canteenId: String(body.canteenId || 'cs-01'),
        name: String(body.name || 'Món mới'),
        category: String(body.category || 'MAIN'),
        extraPrice: Number(body.extraPrice ?? 0),
        isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : true,
        description: String(body.description || ''),
        image:
          body.image ||
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
      };
      state.dishes.unshift(newDish);
      return ok(config, newDish, 201);
    }

    const dishPutMatch = path.match(/^\/menu\/dishes\/([^/]+)$/);
    if (dishPutMatch && (method === 'put' || method === 'patch')) {
      const id = dishPutMatch[1];
      state.dishes = state.dishes.map((d) => (d.id === id ? { ...d, ...body } : d));
      return ok(config, state.dishes.find((d) => d.id === id) || {});
    }

    // 4. WALLET & PACKAGES (STUDENT)
    if (path === '/wallet/me' && method === 'get') {
      return ok(config, {
        balance: state.walletBalance,
        transactions: state.transactions,
      });
    }

    if ((path === '/wallet/topup-confirm' || path === '/wallet/topup') && method === 'post') {
      const amount = Number(body.amount || 0);
      state.walletBalance += amount;
      state.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: 'TOPUP',
        amount,
        description: 'Nạp tiền vào ví Canteen qua VietQR',
        createdAt: new Date().toISOString(),
      });
      return ok(config, { balance: state.walletBalance });
    }

    if (path === '/packages' && method === 'get') {
      return ok(config, state.packages);
    }

    if (path === '/packages/user/my-credits' && method === 'get') {
      return ok(config, {
        totalRemainingMeals: state.remainingMeals,
        remainingMeals: state.remainingMeals,
        remainingBreakfastMeals: state.remainingBreakfastMeals,
        packageName: 'Gói Tiêu Chuẩn 60 Suất',
        hasActiveSubscription: state.remainingMeals > 0,
        endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      });
    }

    if (path === '/packages/subscribe' && method === 'post') {
      const pkg = state.packages.find((p) => p.id === body.packageId) || state.packages[0];
      if (body.paymentMethod === 'WALLET') {
        if (state.walletBalance < pkg.price) {
          return fail(config, 400, 'Số dư ví không đủ để đăng ký gói ăn này.');
        }
        state.walletBalance -= pkg.price;
      }
      state.remainingMeals += pkg.totalCredits;
      state.transactions.unshift({
        id: `tx-${Date.now()}`,
        type: 'PACKAGE',
        amount: -pkg.price,
        description: `Đăng ký ${pkg.name}`,
        createdAt: new Date().toISOString(),
      });
      return ok(config, { message: `Đăng ký ${pkg.name} thành công!` });
    }

    // 5. ORDERS & QR PASS (STUDENT)
    if (path === '/orders/my-orders' && method === 'get') {
      return ok(config, state.orders);
    }

    if (path === '/orders/canteen' && method === 'get') {
      return ok(config, state.orders);
    }

    if (path === '/orders' && method === 'post') {
      const dishIds: string[] = Array.isArray(body.dishIds)
        ? body.dishIds
        : (body.items || []).map((i: any) => i.dishId || i.id);
      const items = dishIds.map((id) => {
        const dish = state.dishes.find((d) => d.id === id) || state.dishes[0];
        return { dishId: dish.id, quantity: 1, dish };
      });
      const totalAmount = Number(body.totalAmount ?? 30000);

      if (body.paymentMethod === 'PACKAGE' || body.paymentMethod === 'MEAL_PASS') {
        if (state.remainingMeals <= 0) {
          return fail(config, 400, 'Bạn đã hết lượt suất ăn trong gói tháng.');
        }
        state.remainingMeals -= Number(body.quantity || 1);
      } else if (body.paymentMethod === 'WALLET') {
        if (state.walletBalance < totalAmount) {
          return fail(config, 400, 'Số dư ví không đủ, vui lòng nạp thêm.');
        }
        state.walletBalance -= totalAmount;
        state.transactions.unshift({
          id: `tx-${Date.now()}`,
          type: 'PAYMENT',
          amount: -totalAmount,
          description: `Thanh toán đơn đặt trước (${body.mealType || 'LUNCH'})`,
          createdAt: new Date().toISOString(),
        });
      }

      const id = `ord-${Date.now().toString(36)}`;
      const orderDate = body.orderDate || body.date || todayVnDate();
      const newOrder = {
        id,
        orderCode: `ORD-${id.slice(-4).toUpperCase()}`,
        canteenId: body.canteenId || 'cs-01',
        orderDate,
        date: orderDate,
        mealType: body.mealType || 'LUNCH',
        status: 'CONFIRMED',
        paymentMethod: body.paymentMethod || 'WALLET',
        totalAmount,
        isWaitingServing: false,
        createdAt: new Date().toISOString(),
        canteen: state.canteens.find((c) => c.id === body.canteenId) || state.canteens[0],
        items,
      };
      state.orders.unshift(newOrder);
      return ok(config, newOrder, 201);
    }

    const orderEditMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderEditMatch && (method === 'put' || method === 'patch')) {
      const id = orderEditMatch[1];
      const dishIds: string[] = Array.isArray(body.dishIds)
        ? body.dishIds
        : Array.isArray(body.items)
        ? body.items.map((it: any) => it.dishId || it.id).filter(Boolean)
        : [];
      state.orders = state.orders.map((o) => {
        if (o.id !== id) return o;
        const updatedItems =
          dishIds.length > 0
            ? dishIds.map((dId) => {
                const dish = state.dishes.find((d) => d.id === dId) || state.dishes[0];
                return { dishId: dish.id, quantity: 1, dish };
              })
            : o.items;
        return { ...o, ...body, items: updatedItems };
      });
      return ok(config, state.orders.find((o) => o.id === id) || {});
    }

    const orderCancelMatch = path.match(/^\/orders\/([^/]+)(?:\/cancel)?$/);
    if (
      orderCancelMatch &&
      (method === 'delete' || method === 'post' || method === 'put' || method === 'patch')
    ) {
      const id = orderCancelMatch[1];
      const target = state.orders.find((o) => o.id === id);
      if (!target) {
        return fail(config, 404, 'Không tìm thấy đơn hàng.');
      }
      if (target.status !== 'CANCELLED') {
        state.orders = state.orders.map((o) => (o.id === id ? { ...o, status: 'CANCELLED' } : o));
        if (target.paymentMethod === 'PACKAGE' || target.paymentMethod === 'MEAL_PASS') {
          state.remainingMeals += Number((target as any).quantity || 1);
        } else if (target.paymentMethod === 'WALLET' && Number(target.totalAmount) > 0) {
          const refundAmount = Number(target.totalAmount);
          state.walletBalance += refundAmount;
          state.transactions.unshift({
            id: `tx-refund-${Date.now()}`,
            type: 'TOPUP',
            amount: refundAmount,
            description: `Hoàn tiền hủy đơn #${target.orderCode || id}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
      return ok(config, {
        success: true,
        message: 'Hủy đơn hàng thành công! Số tiền/lượt ăn đã được hoàn trả lại tài khoản.',
      });
    }

    if (path === '/pickup/token' && method === 'post') {
      const orderId = body.orderId || 'ord-today-pending-01';
      return ok(config, {
        qrToken: `cheero://pass/${orderId}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    // 6. PARENT ROLE
    if (path === '/parent/children' && method === 'get') {
      return ok(config, state.children);
    }

    if (path === '/parent/link' && method === 'post') {
      const identifier = String(body.identifier || body.studentIdentifier || '').trim();
      if (!identifier) {
        return fail(config, 400, 'Vui lòng nhập mã học sinh hoặc email');
      }
      return ok(config, { message: `Đã liên kết thành công với học sinh (${identifier})!` });
    }

    const topupChildMatch = path.match(/^\/parent\/children\/([^/]+)\/topup$/);
    if (topupChildMatch && method === 'post') {
      const studentId = topupChildMatch[1];
      const amount = Number(body.amount || 0);
      state.children = state.children.map((c) =>
        c.studentId === studentId ? { ...c, balance: c.balance + amount } : c
      );
      if (studentId === 'mock_student_id') {
        state.walletBalance += amount;
      }
      return ok(config, { success: true });
    }

    if (path === '/parent/requests' && method === 'get') {
      return ok(config, state.parentRequests);
    }

    if (path === '/parent/requests' && method === 'post') {
      const current = getCurrentUser(config);
      const created = {
        id: `req-${Date.now()}`,
        type: body.type || 'TOPUP',
        amount: Number(body.amount || 0),
        packageId: body.packageId,
        packageName: body.packageName,
        note: body.note || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        student: {
          id: current.id,
          fullName: current.fullName,
          studentCode: (current as any).studentCode || 'HS-2026-0098',
        },
      };
      state.parentRequests.unshift(created);
      return ok(config, created, 201);
    }

    const reqPayMatch = path.match(/^\/parent\/requests\/([^/]+)\/pay$/);
    if (reqPayMatch && method === 'post') {
      const id = reqPayMatch[1];
      const reqItem = state.parentRequests.find((r) => r.id === id);
      if (reqItem) {
        reqItem.status = 'PAID';
        if (reqItem.type === 'TOPUP') {
          state.children = state.children.map((c) =>
            c.studentId === reqItem.student.id ? { ...c, balance: c.balance + reqItem.amount } : c
          );
        }
      }
      return ok(config, { message: 'Đã duyệt thanh toán thành công cho con!' });
    }

    const reqRejectMatch = path.match(/^\/parent\/requests\/([^/]+)\/reject$/);
    if (reqRejectMatch && method === 'post') {
      const id = reqRejectMatch[1];
      state.parentRequests = state.parentRequests.map((r) =>
        r.id === id ? { ...r, status: 'REJECTED' } : r
      );
      return ok(config, { success: true });
    }

    // 7. FEEDBACKS (STUDENT / PARENT / STAFF)
    if ((path === '/feedbacks/me' || path === '/feedbacks') && method === 'get') {
      return ok(config, state.feedbacks);
    }

    if (path === '/feedbacks' && method === 'post') {
      const fb = {
        id: `fb-${Date.now()}`,
        rating: body.rating || 5,
        comment: body.comment || '',
        status: 'NEW',
        reply: '',
        user: {
          fullName: getCurrentUser(config).fullName,
          studentCode: (getCurrentUser(config) as any).studentCode || '',
        },
        dish: null,
        createdAt: new Date().toISOString(),
      };
      state.feedbacks.unshift(fb);
      return ok(config, fb, 201);
    }

    const fbReplyMatch = path.match(/^\/feedbacks\/([^/]+)\/replies$/);
    if (fbReplyMatch && method === 'post') {
      const id = fbReplyMatch[1];
      state.feedbacks = state.feedbacks.map((f) =>
        f.id === id ? { ...f, status: 'RESOLVED', reply: body.reply } : f
      );
      return ok(config, { success: true });
    }

    // 8. STAFF REPORTS, FORECAST, SERVING DISPLAY & CHECKIN
    if (path === '/reports/dashboard/admin' && method === 'get') {
      return ok(config, {
        totalUsers: 428,
        todayCheckins: 356,
        todayOrders: 161,
        todayRevenue: 8677000,
      });
    }

    if (path === '/reports/balance' && method === 'get') {
      return ok(config, {
        totalRevenue: 185400000,
        totalWithdrawn: 125000000,
        availableBalance: 60400000,
        recentWithdrawals: [
          {
            id: 'w-01',
            amount: 32500000,
            description: 'Đối soát doanh thu tuần 1 tháng 11 về VietinBank CS1',
            createdAt: '2026-11-08T10:15:00.000Z',
          },
          {
            id: 'w-02',
            amount: 25000000,
            description: 'Đối soát doanh thu cuối tháng 10 về VietinBank CS1',
            createdAt: '2026-11-01T14:20:00.000Z',
          },
        ],
      });
    }

    if (path === '/reports/time-series' && method === 'get') {
      return ok(config, {
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        data: [6200000, 7100000, 8450000, 7800000, 8677000, 3100000, 1950000],
      });
    }

    if (path.startsWith('/inventory/forecast/') && method === 'get') {
      return ok(config, {
        date: params.date || todayVnDate(),
        mealType: params.mealType || 'LUNCH',
        totalSingleOrders: 161,
        packageServingEstimate: 240,
        totalEstimatedServings: 401,
        bufferMarginPercent: 10,
        ingredientsForecast: [
          {
            ingredientId: 'ing-1',
            name: 'Thịt sườn heo cốt lết',
            category: 'Thịt tươi sống',
            unit: 'kg',
            requiredQty: 48.5,
            currentStock: 55,
            shortageQty: 0,
            isShortage: false,
          },
          {
            ingredientId: 'ing-2',
            name: 'Gạo tấm thơm ST25',
            category: 'Lương thực khô',
            unit: 'kg',
            requiredQty: 62,
            currentStock: 40,
            shortageQty: 22,
            isShortage: true,
          },
          {
            ingredientId: 'ing-5',
            name: 'Rau cải thìa Đà Lạt',
            category: 'Rau củ quả',
            unit: 'kg',
            requiredQty: 32,
            currentStock: 18,
            shortageQty: 14,
            isShortage: true,
          },
        ],
      });
    }

    if (path.startsWith('/menu/display/') && path.endsWith('/action') && method === 'post') {
      const { action, checkinId } = body;
      const q = state.servingQueue;
      let waiting = [...q.waitingQueue];
      let current = q.currentServing;
      let completed = [...q.completedQueue];

      if (action === 'START_SERVING') {
        const target = waiting.find((w) => w.id === checkinId);
        if (target) {
          waiting = waiting.filter((w) => w.id !== checkinId);
          if (current) waiting.unshift(current);
          current = { ...target, status: 'SERVING' };
        }
      } else if (action === 'COMPLETE_SERVING') {
        if (current && current.id === checkinId) {
          completed.unshift({
            ...current,
            status: 'SERVED',
            completedTimeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          });
          current = waiting.length > 0 ? { ...waiting.shift()!, status: 'SERVING' } : null;
        }
      } else if (action === 'UNDO_COMPLETED') {
        const target = completed.find((c) => c.id === checkinId);
        if (target) {
          completed = completed.filter((c) => c.id !== checkinId);
          waiting.unshift({ ...target, status: 'SUCCESS' });
        }
      }

      state.servingQueue = {
        ...q,
        waitingQueue: waiting,
        currentServing: current,
        completedQueue: completed,
        stats: {
          ...q.stats,
          waitingCount: waiting.length,
          servingCount: current ? 1 : 0,
          completedCount: q.stats.completedCount + (action === 'COMPLETE_SERVING' ? 1 : 0),
        },
      };
      return ok(config, { success: true, data: state.servingQueue });
    }

    if (path.startsWith('/menu/display/') && method === 'get') {
      return ok(config, state.servingQueue);
    }

    if (path.startsWith('/checkin/') && method === 'post') {
      return ok(config, {
        message: 'Check-in suất ăn thành công (Mock)!',
        checkin: { mealType: body.mealType || 'LUNCH' },
      });
    }

    return ok(config, method === 'get' ? [] : { success: true });
  };
}
