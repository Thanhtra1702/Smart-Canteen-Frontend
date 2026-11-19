import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  MOCK_AUDIT_LOGS,
  MOCK_BRAND,
  MOCK_CANTEENS,
  MOCK_DISHES,
  MOCK_FEEDBACKS,
  MOCK_INGREDIENTS,
  MOCK_INVENTORY_TRANSACTIONS,
  MOCK_PACKAGES,
  MOCK_USERS,
  MOCK_WALLET_TRANSACTIONS,
  MOCK_WITHDRAWALS,
  buildMockDashboard,
  buildMockServingDisplay,
  buildMockWeeklyMenus,
} from './mockData';

// Mutable in-memory stores for interactive UI/UX testing
const state: {
  brand: Record<string, any>;
  canteens: any[];
  users: any[];
  dishes: any[];
  ingredients: any[];
  inventoryTx: any[];
  packages: any[];
  withdrawals: any[];
  walletTx: any[];
  feedbacks: any[];
  auditLogs: any[];
  servingByCanteen: Map<string, any>;
} = {
  brand: { ...MOCK_BRAND },
  canteens: [...MOCK_CANTEENS],
  users: [...MOCK_USERS],
  dishes: [...MOCK_DISHES],
  ingredients: [...MOCK_INGREDIENTS],
  inventoryTx: [...MOCK_INVENTORY_TRANSACTIONS],
  packages: [...MOCK_PACKAGES],
  withdrawals: [...MOCK_WITHDRAWALS],
  walletTx: [...MOCK_WALLET_TRANSACTIONS],
  feedbacks: [...MOCK_FEEDBACKS],
  auditLogs: [...MOCK_AUDIT_LOGS],
  servingByCanteen: new Map<string, any>(),
};

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

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
  err.response = {
    status,
    statusText: status === 401 ? 'Unauthorized' : status === 404 ? 'Not Found' : 'Bad Request',
    data: { message },
    headers: {},
    config,
  };
  return Promise.reject(err);
};

function getCurrentUserFromAuth(config: InternalAxiosRequestConfig) {
  const authHeader = config.headers?.Authorization || config.headers?.authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (token.startsWith('mock-token:')) {
    const userId = token.slice('mock-token:'.length);
    return state.users.find((u) => u.id === userId) || state.users[0];
  }
  return state.users[0];
}

export function setupMockAdapter(api: AxiosInstance) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await delay(100);

    const method = (config.method || 'get').toLowerCase();
    const rawUrl = (config.url || '/').split('?')[0];
    const path = rawUrl.replace(/^\/api/, '') || '/';
    const params = (config.params || {}) as Record<string, any>;
    const body = parseBody(config.data);

    // 1. AUTH & PROFILE
    if (path === '/auth/login' && method === 'post') {
      const email = String(body.email || '').trim().toLowerCase();
      const found = state.users.find((u) => u.email.toLowerCase() === email);
      if (!found) {
        return fail(config, 401, 'Email hoặc mật khẩu không chính xác (Mock Mode).');
      }
      return ok(config, {
        token: `mock-token:${found.id}`,
        user: found,
      });
    }

    if (path === '/users/me' && method === 'get') {
      return ok(config, getCurrentUserFromAuth(config));
    }

    // 2. BRAND
    if (path === '/brand' && method === 'get') {
      return ok(config, state.brand);
    }
    if (path === '/brand' && method === 'put') {
      state.brand = {
        ...state.brand,
        ...body,
        updatedAt: new Date().toISOString(),
      };
      return ok(config, state.brand);
    }

    // 3. DASHBOARD
    if (path === '/admin-hq/dashboard' && method === 'get') {
      return ok(config, buildMockDashboard(params.canteenId));
    }

    // 4. CANTEENS & STAFF
    if ((path === '/canteens' || path === '/admin-hq/canteens') && method === 'get') {
      return ok(config, state.canteens);
    }
    if ((path === '/canteens' || path === '/admin-hq/canteens') && method === 'post') {
      const created = {
        id: `cs-${Date.now()}`,
        isActive: true,
        ...body,
      };
      state.canteens.unshift(created);
      return ok(config, created, 201);
    }
    const canteenMatch = path.match(/^\/(?:admin-hq\/)?canteens\/([^/]+)(?:\/config|\/status)?$/);
    if (canteenMatch && (method === 'put' || method === 'patch')) {
      const id = canteenMatch[1];
      state.canteens = state.canteens.map((c) => (c.id === id ? { ...c, ...body } : c));
      return ok(config, state.canteens.find((c) => c.id === id) || {});
    }

    if (path === '/admin-hq/staff' && method === 'get') {
      return ok(
        config,
        state.users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
      );
    }
    if (path === '/admin-hq/staff' && method === 'post') {
      const canteen = state.canteens.find((c) => c.id === body.canteenId) || state.canteens[0];
      const newStaff = {
        id: `user-${Date.now()}`,
        email: body.email,
        fullName: body.fullName || 'Nhân viên mới',
        phone: body.phone,
        role: 'ADMIN' as const,
        canteenId: canteen?.id || 'cs1',
        canteen: canteen ? { id: canteen.id, name: canteen.name } : null,
        permissions: body.permissions || ['MENU_MANAGEMENT', 'SERVING_OPERATION'],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      state.users.unshift(newStaff);
      return ok(config, newStaff, 201);
    }

    // 5. MENUS & DISHES
    if (path === '/menu' && method === 'get') {
      return ok(config, buildMockWeeklyMenus(params.canteenId, params.startDate));
    }
    if ((path === '/dishes' || path === '/menu/dishes') && method === 'get') {
      return ok(config, state.dishes);
    }
    if ((path === '/dishes' || path === '/menu/dishes') && method === 'post') {
      const newDish = {
        id: `dish-${Date.now()}`,
        recipes: [],
        ...body,
      };
      state.dishes.unshift(newDish);
      return ok(config, newDish, 201);
    }
    const dishMatch = path.match(/^\/(?:menu\/)?dishes\/([^/]+)$/);
    if (dishMatch && (method === 'put' || method === 'patch')) {
      const id = dishMatch[1];
      state.dishes = state.dishes.map((d) => (d.id === id ? { ...d, ...body } : d));
      return ok(config, state.dishes.find((d) => d.id === id) || {});
    }

    // 6. SERVING DISPLAY & CHECK-IN
    const displayMatch = path.match(/^\/menu\/display\/([^/]+)$/);
    if (displayMatch && method === 'get') {
      const canteenId = displayMatch[1];
      const mealType = params.mealType || 'LUNCH';
      const key = `${canteenId}_${mealType}`;
      if (!state.servingByCanteen.has(key)) {
        state.servingByCanteen.set(key, buildMockServingDisplay(canteenId, mealType));
      }
      return ok(config, state.servingByCanteen.get(key));
    }
    const displayActionMatch = path.match(/^\/menu\/display\/([^/]+)\/action$/);
    if (displayActionMatch && method === 'post') {
      const canteenId = displayActionMatch[1];
      const mealKeys = Array.from(state.servingByCanteen.keys()).filter((k) =>
        k.startsWith(`${canteenId}_`)
      );
      mealKeys.forEach((key) => {
        const current = state.servingByCanteen.get(key);
        if (!current) return;

        if (body.action === 'COMPLETE_SERVING' || body.action === 'NEXT') {
          if (current.currentServing) {
            current.completedQueue.unshift({
              ...current.currentServing,
              status: 'COMPLETED',
              servedAt: new Date().toISOString(),
            });
            current.stats.completedCount += 1;
          }
          const nextItem = current.waitingQueue.shift() || null;
          current.currentServing = nextItem ? { ...nextItem, status: 'SERVING' } : null;
        } else if (body.action === 'START_SERVING' && body.checkinId) {
          const idx = current.waitingQueue.findIndex((item: any) => item.id === body.checkinId);
          if (idx !== -1) {
            const [picked] = current.waitingQueue.splice(idx, 1);
            if (current.currentServing) {
              current.waitingQueue.unshift({ ...current.currentServing, status: 'WAITING' });
            }
            current.currentServing = { ...picked, status: 'SERVING' };
          }
        } else if (body.action === 'UNDO_COMPLETED' && body.checkinId) {
          const idx = current.completedQueue.findIndex((item: any) => item.id === body.checkinId);
          if (idx !== -1) {
            const [reverted] = current.completedQueue.splice(idx, 1);
            if (current.currentServing) {
              current.waitingQueue.unshift({ ...current.currentServing, status: 'WAITING' });
            }
            current.currentServing = { ...reverted, status: 'SERVING' };
            current.stats.completedCount = Math.max(0, current.stats.completedCount - 1);
          }
        }

        current.stats.waitingCount = current.waitingQueue.length;
        current.stats.servingCount = current.currentServing ? 1 : 0;
      });

      const first = mealKeys[0] ? state.servingByCanteen.get(mealKeys[0]) : null;
      return ok(config, { success: true, data: first });
    }
    if ((path === '/checkin/order' || path === '/checkin/qr') && method === 'post') {
      const targetCanteen = body.canteenId || 'cs1';
      const mealType = body.mealType || 'LUNCH';
      const key = `${targetCanteen}_${mealType}`;
      if (!state.servingByCanteen.has(key)) {
        state.servingByCanteen.set(key, buildMockServingDisplay(targetCanteen, mealType));
      }
      const display = state.servingByCanteen.get(key)!;
      const code = String(body.orderId || body.qrToken || 'HS-2026-0199').replace(/^STUDENT:/, '');
      const matchedUser = state.users.find(
        (u) => u.studentCode?.toLowerCase() === code.toLowerCase()
      );
      const newEntry = {
        id: `chk-${Date.now()}`,
        queueNumber: 149 + display.waitingQueue.length,
        studentName: matchedUser?.fullName || `Học sinh (${code})`,
        studentCode: matchedUser?.studentCode || code,
        mealType,
        status: 'WAITING',
        dishes: ['Cơm tấm sườn cốt lết nướng mật ong', 'Canh cải thìa thịt băm'],
        checkedInAt: new Date().toISOString(),
      };
      display.waitingQueue.push(newEntry);
      display.stats.waitingCount = display.waitingQueue.length;
      return ok(config, {
        message: `Check-in ${newEntry.studentName} thành công!`,
        checkin: newEntry,
      });
    }

    // 7. INVENTORY & KITCHEN FORECAST
    if (path === '/inventory' && method === 'get') {
      let list = [...state.ingredients];
      if (params.canteenId && params.canteenId !== 'ALL') {
        list = list.filter((i) => i.canteenId === params.canteenId);
      }
      if (params.isLowStock === 'true') {
        list = list.filter((i) => i.isLowStock);
      }
      if (params.search) {
        const q = String(params.search).toLowerCase();
        list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
      }
      return ok(config, list);
    }
    if (path === '/inventory/transactions' && method === 'get') {
      return ok(config, state.inventoryTx);
    }
    if (path === '/inventory/transactions' && method === 'post') {
      const ing = state.ingredients.find((i) => i.id === body.ingredientId);
      const txType = body.type || 'IMPORT';
      const qty = Number(body.quantity);

      if (!Number.isFinite(qty)) {
        return fail(config, 400, 'Số lượng không hợp lệ');
      }
      if (txType === 'IMPORT' && qty <= 0) {
        return fail(config, 400, 'Nhập kho chỉ được cộng thêm, số lượng phải lớn hơn 0');
      }
      if ((txType === 'EXPORT' || txType === 'WASTE') && qty <= 0) {
        return fail(config, 400, 'Xuất kho chỉ được trừ đi, số lượng phải lớn hơn 0');
      }
      if ((txType === 'EXPORT' || txType === 'WASTE') && ing && qty > Number(ing.currentQty || 0)) {
        return fail(
          config,
          400,
          `Số lượng xuất vượt quá tồn kho hiện tại (${ing.currentQty} ${ing.unit})`
        );
      }
      if (txType === 'ADJUSTMENT' && qty < 0) {
        return fail(config, 400, 'Số lượng tồn kho thực tế không được âm');
      }

      if (ing) {
        if (txType === 'IMPORT') {
          ing.currentQty = Number((Number(ing.currentQty || 0) + qty).toFixed(2));
        } else if (txType === 'EXPORT' || txType === 'WASTE') {
          ing.currentQty = Number(Math.max(0, Number(ing.currentQty || 0) - qty).toFixed(2));
        } else if (txType === 'ADJUSTMENT') {
          ing.currentQty = Number(qty.toFixed(2));
        }
        ing.isLowStock = ing.currentQty <= ing.minThreshold;
        ing.updatedAt = new Date().toISOString();
      }
      const tx = {
        id: `inv-tx-${Date.now()}`,
        type: txType,
        quantity: qty,
        unitPrice: Number(body.unitPrice || ing?.unitPrice || 0),
        note: body.note || '',
        createdAt: new Date().toISOString(),
        ingredient: ing ? { id: ing.id, name: ing.name, unit: ing.unit } : { name: 'Nguyên liệu', unit: 'kg' },
        actor: { fullName: 'Admin Demo' },
      };
      state.inventoryTx.unshift(tx);
      return ok(config, tx, 201);
    }

    const forecastMatch = path.match(/^\/inventory\/forecast\/([^/]+)$/);
    if (forecastMatch && method === 'get') {
      const canteenId = forecastMatch[1];
      const canteen = state.canteens.find((c) => c.id === canteenId) || state.canteens[0];
      const ingredientsForecast = state.ingredients
        .filter((i) => !canteenId || canteenId === 'ALL' || i.canteenId === canteenId || i.canteenId === 'cs1')
        .map((i, idx) => {
          const requiredQty = Number((i.minThreshold * (0.9 + idx * 0.25)).toFixed(1));
          return {
            ingredientId: i.id,
            name: i.name,
            category: i.category,
            unit: i.unit,
            requiredQty,
            currentStock: i.currentQty,
            shortageQty: Math.max(0, Number((requiredQty - i.currentQty).toFixed(1))),
            isShortage: requiredQty > i.currentQty,
          };
        });
      return ok(config, {
        canteenId,
        canteenName: canteen?.name,
        date: params.date,
        mealType: params.mealType || 'LUNCH',
        totalSingleOrders: 185,
        packageServingEstimate: 260,
        totalEstimatedServings: 445,
        bufferMarginPercent: canteen?.bufferMarginPercent || 10,
        ingredientsForecast,
      });
    }

    // 8. PACKAGES
    if (path === '/packages' && method === 'get') {
      const list =
        params.canteenId && params.canteenId !== 'ALL'
          ? state.packages.filter((p) => p.canteenId === params.canteenId)
          : state.packages;
      return ok(config, list);
    }
    if (path === '/packages' && method === 'post') {
      const canteen = state.canteens.find((c) => c.id === body.canteenId) || state.canteens[0];
      const created = {
        id: `pkg-${Date.now()}`,
        activeSubscribers: 0,
        isActive: true,
        ...body,
        canteen: canteen ? { id: canteen.id, name: canteen.name } : null,
      };
      state.packages.unshift(created);
      return ok(config, created, 201);
    }
    const pkgMatch = path.match(/^\/packages\/([^/]+)$/);
    if (pkgMatch && (method === 'put' || method === 'patch')) {
      const id = pkgMatch[1];
      state.packages = state.packages.map((p) => (p.id === id ? { ...p, ...body } : p));
      return ok(config, state.packages.find((p) => p.id === id) || {});
    }
    if (pkgMatch && method === 'delete') {
      state.packages = state.packages.filter((p) => p.id !== pkgMatch[1]);
      return ok(config, { success: true });
    }

    // 9. USERS & RBAC
    if (path === '/users' && method === 'get') {
      let list = [...state.users];
      if (params.canteenId && params.canteenId !== 'ALL') {
        list = list.filter((u) => u.canteenId === params.canteenId);
      }
      if (params.role) {
        list = list.filter((u) => u.role === params.role);
      }
      if (params.search) {
        const q = String(params.search).toLowerCase();
        list = list.filter(
          (u) =>
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.studentCode && u.studentCode.toLowerCase().includes(q))
        );
      }
      return ok(config, list);
    }
    if (path === '/users' && method === 'post') {
      const canteen = state.canteens.find((c) => c.id === body.canteenId);
      const newUser = {
        id: `user-${Date.now()}`,
        isActive: true,
        balance: 0,
        createdAt: new Date().toISOString(),
        ...body,
        canteen: canteen ? { id: canteen.id, name: canteen.name } : null,
      };
      state.users.unshift(newUser);
      return ok(config, newUser, 201);
    }
    const userPermMatch = path.match(/^\/(?:admin-hq\/)?users\/([^/]+)\/permissions$/);
    if (userPermMatch && method === 'patch') {
      const id = userPermMatch[1];
      state.users = state.users.map((u) => (u.id === id ? { ...u, permissions: body.permissions || [] } : u));
      return ok(config, state.users.find((u) => u.id === id) || {});
    }
    const userMatch = path.match(/^\/(?:admin-hq\/)?users\/([^/]+)(?:\/status|\/role)?$/);
    if (userMatch && (method === 'patch' || method === 'put')) {
      const id = userMatch[1];
      state.users = state.users.map((u) => {
        if (u.id !== id) return u;
        const nextRole = body.role ?? u.role;
        const nextCanteenId =
          body.canteenId !== undefined
            ? body.canteenId
            : nextRole === 'SUPER_ADMIN'
              ? null
              : u.canteenId;
        const matchedCanteen = nextCanteenId
          ? state.canteens.find((c) => c.id === nextCanteenId)
          : null;
        return {
          ...u,
          ...body,
          role: nextRole,
          canteenId: nextCanteenId,
          canteen: matchedCanteen ? { id: matchedCanteen.id, name: matchedCanteen.name } : null,
          permissions:
            body.permissions !== undefined
              ? body.permissions
              : nextRole !== 'ADMIN'
                ? []
                : u.permissions,
        };
      });
      return ok(config, state.users.find((u) => u.id === id) || {});
    }

    // 10. FINANCE
    if (path === '/reports/balance' && method === 'get') {
      const isFiltered = params.canteenId && params.canteenId !== 'ALL';
      return ok(config, {
        totalRevenue: isFiltered ? 385000000 : 642500000,
        totalWithdrawn: isFiltered ? 210000000 : 390000000,
        availableBalance: isFiltered ? 175000000 : 252500000,
      });
    }
    if (path === '/wallet/withdrawals' && method === 'get') {
      return ok(config, state.withdrawals);
    }
    if (path === '/wallet/withdrawals' && method === 'post') {
      const canteen = state.canteens.find((c) => c.id === body.canteenId) || state.canteens[0];
      const created = {
        id: `wd-${Date.now()}`,
        code: `DS-202611-${String(state.withdrawals.length + 1).padStart(2, '0')}`,
        canteenId: canteen?.id || 'cs1',
        canteen: canteen ? { id: canteen.id, name: canteen.name } : null,
        amount: Number(body.amount || 0),
        status: 'PENDING',
        description: body.description || 'Yêu cầu đối soát doanh thu',
        createdAt: new Date().toISOString(),
        processedAt: null,
      };
      state.withdrawals.unshift(created);
      return ok(config, created, 201);
    }
    if (path === '/wallet/all' && method === 'get') {
      const list =
        params.canteenId && params.canteenId !== 'ALL'
          ? state.walletTx.filter((t) => t.canteenId === params.canteenId)
          : state.walletTx;
      return ok(config, {
        transactions: list,
        pagination: {
          currentPage: Number(params.page || 1),
          totalPages: 1,
          totalItems: list.length,
        },
      });
    }

    // 11. FEEDBACKS
    if (path === '/feedbacks' && method === 'get') {
      const list =
        params.canteenId && params.canteenId !== 'ALL'
          ? state.feedbacks.filter((f) => f.canteenId === params.canteenId)
          : state.feedbacks;
      return ok(config, list);
    }
    const fbMatch = path.match(/^\/feedbacks\/([^/]+)(?:\/replies|\/reply|\/assignments|\/assign)?$/);
    if (fbMatch && (method === 'patch' || method === 'post' || method === 'put')) {
      const id = fbMatch[1];
      const assignedStaff = body.staffId ? state.users.find((u) => u.id === body.staffId) : null;
      state.feedbacks = state.feedbacks.map((f) => {
        if (f.id !== id) return f;
        const nextStatus =
          body.status ||
          (body.reply || body.resolve ? 'RESOLVED' : body.staffId || body.assignedToId ? 'ASSIGNED' : f.status);
        return {
          ...f,
          ...body,
          assignedTo: assignedStaff || f.assignedTo,
          status: nextStatus,
          resolvedAt: nextStatus === 'RESOLVED' ? f.resolvedAt || new Date().toISOString() : f.resolvedAt,
        };
      });
      return ok(config, state.feedbacks.find((f) => f.id === id) || {});
    }

    // 12. AUDIT LOGS
    if (path === '/audit-logs' && method === 'get') {
      let list = [...state.auditLogs];
      if (params.canteenId && params.canteenId !== 'ALL') {
        list = list.filter((l) => l.canteenId === params.canteenId);
      }
      if (params.entityType && params.entityType !== 'ALL') {
        list = list.filter((l) => l.entityType === params.entityType);
      }
      if (params.from || params.to) {
        const fromStr = params.from ? String(params.from).slice(0, 10) : '';
        const toStr = params.to ? String(params.to).slice(0, 10) : '';
        list = list.filter((l) => {
          const logDate = new Date(l.createdAt).toLocaleDateString('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
          });
          if (fromStr && logDate < fromStr) return false;
          if (toStr && logDate > toStr) return false;
          return true;
        });
      }
      const page = Math.max(1, Number(params.page || 1));
      const pageSize = Math.max(1, Number(params.pageSize || 15));
      const total = list.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const paged = list.slice((page - 1) * pageSize, page * pageSize);
      return ok(config, {
        data: paged,
        pagination: {
          page,
          totalPages,
          total,
        },
      });
    }

    // Fallback for any unhandled endpoint so UI doesn't crash
    console.info(`[Mock API] Unhandled ${method.toUpperCase()} ${path}, returning empty object.`);
    return ok(config, method === 'get' ? [] : { success: true });
  };
}
