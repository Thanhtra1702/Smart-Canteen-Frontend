import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileCode,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

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

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  // Client-side action search filter
  const displayedLogs = searchAction.trim()
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(searchAction.toLowerCase()) ||
          l.entityId?.toLowerCase().includes(searchAction.toLowerCase()) ||
          l.actor?.fullName?.toLowerCase().includes(searchAction.toLowerCase()) ||
          l.actor?.email?.toLowerCase().includes(searchAction.toLowerCase())
      )
    : logs;

  const getActionBadge = (action: string) => {
    if (action.startsWith('CREATE')) {
      return <Badge variant="success" size="sm">{action}</Badge>;
    }
    if (action.startsWith('UPDATE') || action.startsWith('STOCK_ADJUSTMENT')) {
      return <Badge variant="brand" size="sm">{action}</Badge>;
    }
    if (action.startsWith('DELETE') || action.startsWith('ARCHIVE') || action.startsWith('STOCK_WASTE')) {
      return <Badge variant="error" size="sm">{action}</Badge>;
    }
    if (action.startsWith('STOCK')) {
      return <Badge variant="warning" size="sm">{action}</Badge>;
    }
    return <Badge variant="neutral" size="sm">{action}</Badge>;
  };

  const parseJson = (str: any) => {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Scope Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Ghi vết bất biến
          </Badge>
          <span className="text-xs text-muted">
            • Lưu vết toàn bộ hành động bảo mật, phân quyền và giao dịch
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card flush className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search action */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Tìm hành động, người thực hiện..."
              value={searchAction}
              onChange={(e) => setSearchAction(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground placeholder:text-muted focus:border-focus focus:ring-1 focus:ring-focus outline-hidden"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-1 focus:ring-focus outline-hidden cursor-pointer"
            >
              <option value="ALL">-- Tất cả loại đối tượng --</option>
              <option value="CANTEEN">Cơ sở (CANTEEN)</option>
              <option value="USER">Người dùng (USER)</option>
              <option value="MENU">Thực đơn (MENU)</option>
              <option value="DISH">Món ăn & BOM (DISH)</option>
              <option value="STOCK_TRANSACTION">Giao dịch kho (STOCK)</option>
              <option value="FEEDBACK">Đánh giá (FEEDBACK)</option>
              <option value="WALLET">Ví điện tử (WALLET)</option>
            </select>
          </div>

          {/* From date */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted whitespace-nowrap">Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-1 focus:ring-focus outline-hidden"
            />
          </div>

          {/* To date */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted whitespace-nowrap">Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-3 bg-surface border border-border-strong rounded-xl text-xs text-foreground focus:border-focus focus:ring-1 focus:ring-focus outline-hidden"
            />
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card flush>
        {error ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-xs text-rose-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase text-[11px] font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Người thao tác</th>
                  <th className="px-5 py-3">Hành động</th>
                  <th className="px-5 py-3">Đối tượng</th>
                  <th className="px-5 py-3">Cơ sở</th>
                  <th className="px-5 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedLogs.map((log) => {
                  const actorName = log.actor?.fullName || log.actor?.email || 'Hệ thống';
                  const actorInitial = actorName.charAt(0).toUpperCase();

                  return (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 border border-border">
                            {actorInitial}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{actorName}</div>
                            <div className="text-[10px] text-muted">{log.actor?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-foreground">{log.entityType}</span>
                        {log.entityId && (
                          <div className="font-mono text-[10px] text-muted truncate max-w-[140px]" title={log.entityId}>
                            {log.entityId}
                          </div>
                        )}
                      </td>

                      {/* Canteen */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted">
                        {log.canteen?.name || 'Toàn hệ thống'}
                      </td>

                      {/* Details View Button */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        {(log.beforeJson || log.afterJson) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailModal(true);
                            }}
                            icon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Xem Diff
                          </Button>
                        ) : (
                          <span className="text-muted text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {displayedLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs text-muted">
                      {loading ? 'Đang tải dữ liệu kiểm toán...' : 'Không có nhật ký nào phù hợp.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted">
          <div>
            Hiển thị <strong>{displayedLogs.length}</strong> / <strong>{totalRecords}</strong> bản ghi
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Trang trước
            </Button>
            <span className="text-xs font-numeric font-medium px-2">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>

      {/* Before / After Diff Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-3xl w-full p-6 border border-border shadow-modal space-y-4 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  Chi Tiết Biến Động: {selectedLog.action}
                </h3>
                <p className="text-[11px] text-muted">
                  Bản ghi {selectedLog.entityType} ID: {selectedLog.entityId || 'N/A'} • {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pt-1">
              {/* Before State */}
              <div className="space-y-1.5">
                <span className="font-semibold text-rose-700 text-xs block">
                  Trạng thái Trước (Before)
                </span>
                <pre className="p-3 bg-secondary/50 rounded-xl border border-border text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-80">
                  {selectedLog.beforeJson
                    ? JSON.stringify(parseJson(selectedLog.beforeJson), null, 2)
                    : '(Không có dữ liệu trước)'}
                </pre>
              </div>

              {/* After State */}
              <div className="space-y-1.5">
                <span className="font-semibold text-emerald-700 text-xs block">
                  Trạng thái Sau (After)
                </span>
                <pre className="p-3 bg-secondary/50 rounded-xl border border-border text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-80">
                  {selectedLog.afterJson
                    ? JSON.stringify(parseJson(selectedLog.afterJson), null, 2)
                    : '(Không có dữ liệu sau)'}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
