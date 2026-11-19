import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon as Search,
  EyeIcon as Eye,
  XIcon as X,
  ArrowRightIcon as ArrowRight,
  CaretLeftIcon as ChevronLeft,
  CaretRightIcon as ChevronRight,
  CaretUpDownIcon as ChevronsUpDown,
} from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DatePickerButton } from '../components/ui/DatePickerButton';

export const AuditLogsPage: React.FC = () => {
  const { selectedCanteenId } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityType, setEntityType] = useState<string>('ALL');
  const [searchAction, setSearchAction] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Detail Modal & Sorting
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortField, setSortField] = useState<'createdAt' | 'actor' | 'action' | 'entityType'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'createdAt' | 'actor' | 'action' | 'entityType') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/audit-logs', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
          entityType: entityType !== 'ALL' ? entityType : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page,
          pageSize,
        },
      });

      const responseData = res.data;
      setLogs(responseData.data || []);
      setTotalPages(responseData.pagination?.totalPages || 1);
      setTotalRecords(responseData.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
      const msg = err.response?.data?.message || 'Không thể tải nhật ký kiểm toán';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId, entityType, fromDate, toDate, page, pageSize, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side action search, local date range safeguard, and column sorting
  const displayedLogs = logs
    .filter((l) => {
      if (fromDate || toDate) {
        const logDate = new Date(l.createdAt).toLocaleDateString('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        if (fromDate && logDate < fromDate) return false;
        if (toDate && logDate > toDate) return false;
      }
      if (searchAction.trim()) {
        const q = searchAction.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          l.entityId?.toLowerCase().includes(q) ||
          l.actor?.fullName?.toLowerCase().includes(q) ||
          l.actor?.email?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
      }
      if (sortField === 'actor') {
        const nameA = a.actor?.fullName || a.actor?.email || '';
        const nameB = b.actor?.fullName || b.actor?.email || '';
        return nameA.localeCompare(nameB, 'vi') * factor;
      }
      if (sortField === 'action') {
        return String(a.action || '').localeCompare(String(b.action || '')) * factor;
      }
      return String(a.entityType || '').localeCompare(String(b.entityType || '')) * factor;
    });

  const ACTION_LABELS: Record<string, string> = {
    UPDATE_CANTEEN_CONFIG: 'Cập nhật cấu hình cơ sở',
    CREATE_CANTEEN: 'Tạo cơ sở mới',
    UPDATE_CANTEEN: 'Cập nhật thông tin cơ sở',
    STOCK_ADJUSTMENT: 'Điều chỉnh tồn kho',
    STOCK_IMPORT: 'Nhập kho nguyên liệu',
    STOCK_EXPORT: 'Xuất kho chế biến',
    STOCK_WASTE: 'Ghi nhận hao hụt kho',
    CREATE_PACKAGE: 'Tạo gói ăn mới',
    UPDATE_PACKAGE: 'Cập nhật gói ăn',
    DELETE_PACKAGE: 'Ngừng gói ăn',
    ARCHIVE_PACKAGE: 'Ngừng gói ăn',
    CREATE_USER: 'Tạo tài khoản',
    UPDATE_USER: 'Cập nhật tài khoản',
    UPDATE_PERMISSIONS: 'Cập nhật phân quyền',
    CREATE_MENU: 'Cập nhật thực đơn',
    IMPORT_MENU: 'Nhập thực đơn tuần',
    FEEDBACK_REPLY: 'Phản hồi đánh giá',
    FEEDBACK_RESOLVE: 'Giải quyết đánh giá',
  };

  const ENTITY_LABELS: Record<string, string> = {
    CANTEEN: 'Cơ sở',
    INGREDIENT: 'Nguyên liệu',
    STOCK_TRANSACTION: 'Kho hàng',
    PACKAGE: 'Gói ăn',
    USER: 'Tài khoản',
    MENU: 'Thực đơn',
    DISH: 'Món ăn',
    FEEDBACK: 'Đánh giá',
    WALLET: 'Ví điện tử',
  };

  const getActionMeta = (action: string) => {
    const label = ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
    let dotClass = 'bg-slate-400';
    if (action.startsWith('CREATE')) {
      dotClass = 'bg-emerald-500';
    } else if (action.startsWith('UPDATE') || action.startsWith('STOCK_ADJUSTMENT')) {
      dotClass = 'bg-[#0057b8]';
    } else if (action.startsWith('DELETE') || action.startsWith('ARCHIVE') || action.startsWith('STOCK_WASTE')) {
      dotClass = 'bg-rose-500';
    } else if (action.startsWith('STOCK')) {
      dotClass = 'bg-amber-500';
    }
    return { label, dotClass };
  };

  const getEntityLabel = (type: string) => ENTITY_LABELS[type] || type;

  const parseJson = (str: any) => {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    cutoffBreakfast: 'Giờ chốt Ca Sáng',
    cutoffLunch: 'Giờ chốt Ca Trưa',
    cutoffDinner: 'Giờ chốt Ca Tối',
    bufferMarginPercent: 'Tỷ lệ dự phòng',
    maxDishes: 'Số món tối đa / suất',
    standardMealPrice: 'Giá suất chuẩn',
    price: 'Giá bán',
    name: 'Tên',
    ingredient: 'Nguyên liệu',
    currentQty: 'Số lượng tồn kho',
    minThreshold: 'Định mức tối thiểu',
    delta: 'Số lượng thay đổi',
    reason: 'Lý do',
    note: 'Ghi chú',
    totalCredits: 'Số suất ăn',
    totalMeals: 'Số suất ăn',
    durationDays: 'Thời hạn sử dụng',
    includesBreakfast: 'Bao gồm bữa sáng',
    isActive: 'Trạng thái hoạt động',
    role: 'Vai trò',
    permissions: 'Quyền hạn',
    fullName: 'Họ và tên',
    email: 'Email',
    phone: 'Số điện thoại',
    address: 'Địa chỉ',
    status: 'Trạng thái',
    bankAccountNumber: 'Số tài khoản',
    bankAccountName: 'Chủ tài khoản',
  };

  const formatFieldLabel = (key: string) =>
    FIELD_LABELS[key] ||
    key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());

  const formatFieldValue = (key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Có' : 'Không';
    if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'Không có';
    if (typeof val === 'object') return Object.values(val).join(' • ');
    if (key === 'bufferMarginPercent') return `${val}%`;
    if (key === 'maxDishes') return `${val} món`;
    if (key === 'totalCredits' || key === 'totalMeals') return `${val} suất`;
    if (key === 'durationDays') return `${val} ngày`;
    if (key === 'price' || key === 'standardMealPrice') {
      return `${Number(val).toLocaleString('vi-VN')} đ`;
    }
    if (key === 'role') {
      const roleMap: Record<string, string> = {
        SUPER_ADMIN: 'Admin Tổng HQ',
        ADMIN: 'Admin cơ sở',
        STUDENT: 'Học sinh',
        PARENT: 'Phụ huynh',
      };
      return roleMap[String(val)] || String(val);
    }
    if (key === 'delta' && typeof val === 'number') {
      return val > 0 ? `+${val}` : String(val);
    }
    return String(val);
  };

  const buildHumanDetailRows = (log: any) => {
    const before = parseJson(log.beforeJson);
    const after = parseJson(log.afterJson);
    const details = parseJson(log.details);

    const hasBefore = before && typeof before === 'object';
    const hasAfter = after && typeof after === 'object';

    if (hasBefore || hasAfter) {
      const keys = Array.from(
        new Set([...(hasBefore ? Object.keys(before) : []), ...(hasAfter ? Object.keys(after) : [])])
      );
      return {
        isComparison: Boolean(hasBefore && hasAfter),
        rows: keys.map((k) => {
          const oldVal = hasBefore && k in before ? formatFieldValue(k, before[k]) : null;
          const newVal = hasAfter && k in after ? formatFieldValue(k, after[k]) : null;
          return {
            key: k,
            label: formatFieldLabel(k),
            oldVal,
            newVal,
            changed: Boolean(hasBefore && hasAfter && oldVal !== newVal),
          };
        }),
      };
    }

    if (details && typeof details === 'object') {
      return {
        isComparison: false,
        rows: Object.keys(details).map((k) => ({
          key: k,
          label: formatFieldLabel(k),
          oldVal: null,
          newVal: formatFieldValue(k, details[k]),
          changed: false,
        })),
      };
    }

    return {
      isComparison: false,
      rows: details
        ? [{ key: 'info', label: 'Nội dung', oldVal: null, newVal: String(details), changed: false }]
        : [],
    };
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Compact Filter Bar */}
      <Card flush className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search action */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm hành động, người thực hiện..."
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden"
            />
          </div>

          {/* Entity Type Filter */}
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:border-[#0057b8] focus:ring-1 focus:ring-[#0057b8] outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="CANTEEN">Cơ sở</option>
            <option value="USER">Người dùng</option>
            <option value="MENU">Thực đơn</option>
            <option value="DISH">Món ăn &amp; BOM</option>
            <option value="STOCK_TRANSACTION">Kho</option>
            <option value="FEEDBACK">Đánh giá</option>
            <option value="WALLET">Ví điện tử</option>
          </select>

          {/* From date */}
          <DatePickerButton
            value={fromDate}
            onChange={(val) => {
              setFromDate(val);
              setPage(1);
            }}
            placeholder="Từ ngày"
            title="Chọn ngày bắt đầu"
            allowClear
            className="w-full"
          />

          {/* To date */}
          <DatePickerButton
            value={toDate}
            onChange={(val) => {
              setToDate(val);
              setPage(1);
            }}
            placeholder="Đến ngày"
            title="Chọn ngày kết thúc"
            allowClear
            className="w-full"
          />
        </div>
      </Card>

      {/* Floating Row-Card Audit List */}
      {error ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-2xs">
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[680px] space-y-2">
              {/* Transparent Column Header Row */}
              <div className="grid grid-cols-[minmax(220px,1.4fr)_minmax(190px,1.2fr)_minmax(160px,1.1fr)_96px] items-center gap-3 px-4 py-1 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => toggleSort('createdAt')}
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Người thao tác</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort('actor')}
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Email &amp; Cơ sở</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort('action')}
                  className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left"
                >
                  <span>Hành động</span>
                  <ChevronsUpDown className="size-3 text-slate-300" />
                </button>
                <span className="text-right">Chi tiết</span>
              </div>

              {/* Elevated Row Cards */}
              {displayedLogs.map((log) => {
                const actorName = log.actor?.fullName || log.actor?.email || 'Hệ thống';
                const created = new Date(log.createdAt);
                const timeStr = created.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = created.toLocaleDateString('vi-VN');
                const hasDiff = Boolean(log.beforeJson || log.afterJson || log.details);

                return (
                  <div
                    key={log.id}
                    className="group bg-white rounded-xl border border-slate-200/75 hover:border-[#0057b8] hover:shadow-xs px-4 py-3 grid grid-cols-[minmax(220px,1.4fr)_minmax(190px,1.2fr)_minmax(160px,1.1fr)_96px] items-center gap-3 transition-all"
                  >
                    {/* Actor + Timestamp */}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate" title={actorName}>
                        {actorName}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-600">{timeStr}</span>
                        <span className="text-slate-400">{dateStr}</span>
                      </div>
                    </div>

                    {/* Email & Canteen */}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate" title={log.actor?.email || ''}>
                        {log.actor?.email || 'system@smartcanteen.vn'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {log.canteen?.name || 'Toàn hệ thống'}
                      </div>
                    </div>

                    {/* Action + Entity Type */}
                    <div className="min-w-0">
                      {(() => {
                        const meta = getActionMeta(log.action);
                        return (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`size-1.5 rounded-full shrink-0 ${meta.dotClass}`} />
                            <span className="text-xs text-slate-800 truncate" title={meta.label}>
                              {meta.label}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-3.5">
                        {getEntityLabel(log.entityType)}
                      </div>
                    </div>

                    {/* Details button */}
                    <div className="flex justify-end">
                      {hasDiff ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 group-hover:bg-[#0057b8] group-hover:text-white group-hover:border-[#0057b8] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="size-3.5" />
                          <span>Xem</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs font-medium px-2">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {displayedLogs.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200/75 py-12 text-center text-xs text-slate-400">
                  {loading ? 'Đang tải nhật ký...' : 'Không có nhật ký phù hợp.'}
                </div>
              )}
            </div>
          </div>

          {/* Minimal Footer / Pagination */}
          <div className="pt-0.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {displayedLogs.length} / {totalRecords} bản ghi
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Trước
                </Button>
                <span className="text-xs font-numeric font-medium px-2 text-slate-700">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human-Friendly Detail Modal */}
      {showDetailModal && selectedLog && (() => {
        const detailSummary = buildHumanDetailRows(selectedLog);
        const actorName = selectedLog.actor?.fullName || selectedLog.actor?.email || 'Hệ thống';

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDetailModal(false);
            }}
            className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200/80 shadow-modal space-y-4 text-xs max-h-[85vh] flex flex-col">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
                <div className="min-w-0 space-y-0.5">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {getActionMeta(selectedLog.action).label}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {actorName} • {getEntityLabel(selectedLog.entityType)} •{' '}
                    {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="size-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  aria-label="Đóng"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {detailSummary.rows.length > 0 ? (
                  <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-slate-50/40">
                    {detailSummary.rows.map((row) => (
                      <div key={row.key} className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500 shrink-0">{row.label}</span>
                        {detailSummary.isComparison ? (
                          <div className="flex items-center gap-2 min-w-0 justify-end text-right flex-wrap">
                            {row.changed ? (
                              <>
                                <span className="text-xs text-slate-400 line-through">{row.oldVal}</span>
                                <ArrowRight className="size-3 text-slate-400 shrink-0" />
                                <span className="text-xs font-semibold text-[#0057b8]">{row.newVal}</span>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-slate-800">{row.newVal ?? row.oldVal}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-800 text-right">{row.newVal ?? row.oldVal}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">Không có thông tin thay đổi bổ sung.</p>
                )}
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-100 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
