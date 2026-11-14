import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  Info,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { ImportStepper } from '../components/ui/ImportStepper';
import { ExcelValidationTable } from '../components/ui/ExcelValidationTable';
import { ExcelCommitModal } from '../components/ui/ExcelCommitModal';

export const InventoryPage: React.FC = () => {
  const { toast } = useToast();
  const { selectedCanteenId } = useAuth();
  const [activeTab, setActiveTab] = useState<'stock' | 'history' | 'import'>('stock');

  // Stock State
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // History State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Quick Transaction Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [txType, setTxType] = useState<'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT'>('IMPORT');
  const [txQty, setTxQty] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txNote, setTxNote] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Excel Import State
  const [importStep, setImportStep] = useState<number>(1);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showCommitConfirmModal, setShowCommitConfirmModal] = useState(false);
  const [allowPartialImport, setAllowPartialImport] = useState(true);

  const fetchIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
          isLowStock: filterLowStock ? 'true' : undefined,
          search: search.trim() || undefined,
        },
      });
      setIngredients(res.data);
    } catch (err) {
      console.error('Failed to load ingredients', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCanteenId, filterLowStock, search]);

  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const res = await api.get('/inventory/transactions', {
        params: {
          canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined,
        },
      });
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setTxLoading(false);
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    if (activeTab === 'stock') {
      fetchIngredients();
    } else if (activeTab === 'history') {
      fetchTransactions();
    }
  }, [activeTab, fetchIngredients, fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIngredients();
  };

  const openTxModal = (ing: any, type: 'IMPORT' | 'EXPORT' | 'WASTE' | 'ADJUSTMENT') => {
    setSelectedIngredient(ing);
    setTxType(type);
    setTxQty(type === 'ADJUSTMENT' ? ing.currentQty?.toString() || '0' : '');
    setTxPrice(ing.unitPrice?.toString() || '');
    setTxNote(
      type === 'IMPORT'
        ? 'Nhập bổ sung kho'
        : type === 'EXPORT'
        ? 'Xuất ca bếp'
        : type === 'ADJUSTMENT'
        ? 'Kiểm kê kho thực tế'
        : 'Hao hụt / Hết hạn'
    );
    setShowTxModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || txQty === '') return;

    if ((txType === 'WASTE' || txType === 'ADJUSTMENT') && !txNote.trim()) {
      toast.error('Vui lòng nhập lý do bắt buộc cho phiếu hủy hoặc điều chỉnh kho');
      return;
    }

    try {
      setIsSubmittingTx(true);
      await api.post('/inventory/transactions', {
        ingredientId: selectedIngredient.id,
        canteenId: selectedIngredient.canteenId,
        type: txType,
        quantity: Number(txQty),
        unitPrice: txPrice ? Number(txPrice) : undefined,
        note: txNote,
      });

      setShowTxModal(false);
      fetchIngredients();
      toast.success('Tạo phiếu kho thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu giao dịch kho');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/excel/template/inventory', {
        params: { canteenId: selectedCanteenId !== 'ALL' ? selectedCanteenId : undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_Ton_Kho_Nguyen_Lieu.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Đã tải file Excel mẫu thành công!');
      setImportStep(2);
    } catch (err) {
      toast.error('Lỗi tải file mẫu: ' + err);
    }
  };

  const handleInventoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      setImportStep(2);
      const res = await api.post('/excel/validate/inventory', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
      setImportStep(3);
      toast.info(`Đã kiểm tra file: ${res.data.validRows?.length || 0} dòng hợp lệ, ${res.data.errors?.length || 0} dòng lỗi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi đọc file Excel');
      setImportStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportErrors = () => {
    if (!previewData?.errors?.length) return;
    const header = 'Dong,Nguyen_nhan_loi,Co_so,Ten_nguyen_lieu,Nhom,DVT,Ton_kho,Don_gia\n';
    const rows = previewData.errors.map((e: any) => {
      const d = e.rawData || {};
      return `"${e.row}","${e.error.replace(/"/g, '""')}","${d.canteenInput || ''}","${d.name || ''}","${d.category || ''}","${d.unit || ''}","${d.currentQty || ''}","${d.unitPrice || ''}"`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Danh_sach_dong_loi_TonKho.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info('Đã tải danh sách các dòng lỗi về máy!');
  };

  const handleCommitInventory = async () => {
    if (!previewData?.validRows?.length) return;

    try {
      setIsCommitting(true);
      const res = await api.post('/excel/import/inventory', {
        rows: previewData.validRows,
      });
      setImportResult(res.data);
      setPreviewData(null);
      setExcelFile(null);
      setShowCommitConfirmModal(false);
      setImportStep(4);
      fetchIngredients();
      toast.success('Đã import tồn kho thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi import');
    } finally {
      setIsCommitting(false);
    }
  };

  const tabItems = [
    { id: 'stock' as const, label: 'Tồn kho nguyên liệu' },
    { id: 'history' as const, label: 'Sổ kho biến động' },
    { id: 'import' as const, label: 'Nhập file Excel' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tab Switcher & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs items={tabItems} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

        {activeTab === 'import' && (
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            icon={Download}
          >
            <span>Tải file Excel mẫu tồn kho</span>
          </Button>
        )}
      </div>

      {/* View 1: Tồn Kho */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-border">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="size-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên nguyên liệu..."
                className="w-full pl-10 pr-3.5 h-10 bg-surface border border-border-strong rounded-xl text-sm text-foreground placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-hidden transition-colors"
              />
            </form>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`h-10 px-3.5 rounded-xl text-xs font-medium transition-colors cursor-pointer outline-hidden border ${
                  filterLowStock
                    ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                    : 'bg-surface border-border-strong text-muted hover:text-foreground hover:bg-button-hover'
                }`}
              >
                Chỉ hiện sắp hết
              </button>
              <button
                onClick={fetchIngredients}
                disabled={loading}
                className="size-10 rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-muted hover:text-foreground transition-colors cursor-pointer flex items-center justify-center outline-hidden disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted uppercase text-[11px] font-medium border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Nguyên liệu</th>
                    <th className="px-5 py-3">Cơ sở</th>
                    <th className="px-5 py-3 text-right">Tồn kho hiện tại</th>
                    <th className="px-5 py-3 text-right">Định mức an toàn</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ingredients.map((ing) => {
                    const isLow = Number(ing.currentQty) <= Number(ing.minQty);
                    return (
                      <tr key={ing.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          <div>{ing.name}</div>
                          <div className="text-[11px] text-muted">{ing.category}</div>
                        </td>
                        <td className="px-5 py-3.5 text-muted">{ing.canteen?.name || 'Toàn chuỗi'}</td>
                        <td
                          className={`px-5 py-3.5 text-right font-semibold tabular-nums font-mono ${
                            isLow ? 'text-rose-700' : 'text-foreground'
                          }`}
                        >
                          {Number(ing.currentQty).toLocaleString()} {ing.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right text-muted tabular-nums font-mono">
                          {Number(ing.minQty).toLocaleString()} {ing.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => openTxModal(ing, 'IMPORT')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer outline-hidden"
                          >
                            Nhập
                          </button>
                          <button
                            onClick={() => openTxModal(ing, 'EXPORT')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer outline-hidden"
                          >
                            Xuất
                          </button>
                          <button
                            onClick={() => openTxModal(ing, 'ADJUSTMENT')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer outline-hidden"
                          >
                            Kiểm kê
                          </button>
                          <button
                            onClick={() => openTxModal(ing, 'WASTE')}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-rose-700 hover:bg-rose-500/10 transition-colors cursor-pointer outline-hidden"
                          >
                            Hủy
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {ingredients.length === 0 && (
              <div className="py-12 text-center text-xs text-muted">
                {loading ? 'Đang tải danh mục kho...' : 'Không có nguyên liệu nào.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Sổ Kho */}
      {activeTab === 'history' && (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase text-[11px] font-medium border-b border-border">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Cơ sở</th>
                  <th className="px-5 py-3">Nguyên liệu</th>
                  <th className="px-5 py-3">Loại phiếu</th>
                  <th className="px-5 py-3 text-right">Số lượng</th>
                  <th className="px-5 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3.5 text-muted font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5 text-foreground">{tx.ingredient?.canteen?.name || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-foreground">{tx.ingredient?.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          tx.type === 'IMPORT'
                            ? 'success'
                            : tx.type === 'EXPORT'
                            ? 'brand'
                            : tx.type === 'ADJUSTMENT'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {tx.type === 'IMPORT'
                          ? 'Nhập hàng'
                          : tx.type === 'EXPORT'
                          ? 'Xuất bếp'
                          : tx.type === 'ADJUSTMENT'
                          ? 'Điều chỉnh'
                          : 'Xuất hủy'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-foreground font-mono tabular-nums">
                      {tx.type === 'IMPORT' ? '+' : tx.type === 'EXPORT' || tx.type === 'WASTE' ? '-' : '='}{tx.quantity} {tx.ingredient?.unit}
                    </td>
                    <td className="px-5 py-3.5 text-muted max-w-xs truncate">{tx.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="py-12 text-center text-xs text-muted">
              {txLoading ? 'Đang tải dữ liệu biến động...' : 'Chưa có biến động kho nào.'}
            </div>
          )}
        </div>
      )}

      {/* View 3: Nhập Excel */}
      {activeTab === 'import' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* 1. Workflow Stepper 4 bước */}
          <ImportStepper
            currentStep={importStep}
            onStepClick={(step) => {
              if (step < importStep) setImportStep(step);
            }}
          />

          {/* 2. Step 1: Hướng dẫn & Tải file mẫu */}
          {importStep <= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface border border-border shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    Tải file mẫu kiểm kê kho
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Download}
                    onClick={handleDownloadTemplate}
                  >
                    Tải mẫu .xlsx
                  </Button>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  File mẫu chuẩn gồm <strong>Sheet 1: Danh mục & Tồn kho</strong> và <strong>Sheet 2: Bảng tra cứu cơ sở & ĐVT</strong>. Hỗ trợ dropdown tự động 500 dòng giúp chống sai chính tả.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface border border-border shadow-2xs space-y-2">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  Kéo thả file kiểm kê tồn kho
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Tên nguyên liệu nên khớp với công thức BOM để hệ thống tự động trừ kho và cảnh báo thiếu hụt cho các ca nấu tiếp theo.
                </p>
              </div>
            </div>
          )}

          {/* 3. Step 2: Upload Dropzone */}
          {importStep <= 2 && (
            <div className="bg-surface p-8 rounded-lg border-2 border-dashed border-border-strong hover:border-primary/50 text-center relative flex flex-col items-center justify-center transition cursor-pointer shadow-2xs">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleInventoryFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                {isUploading ? (
                  <Loader2 className="size-5 text-primary animate-spin" />
                ) : (
                  <UploadCloud className="size-5" />
                )}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {isUploading ? 'Đang đọc và kiểm tra file Excel...' : 'Kéo thả hoặc nhấp để chọn file Excel tồn kho'}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {isUploading ? 'Vui lòng chờ trong giây lát' : 'Chấp nhận định dạng chuẩn .xlsx hoặc .xls (tối đa 10MB)'}
              </p>
              {excelFile && (
                <span className="text-xs font-numeric font-medium text-primary bg-primary/10 px-3 py-1 rounded-lg mt-3 border border-primary/20">
                  {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          )}

          {/* 4. Step 3: Bảng đối soát tiền kiểm Pre-flight */}
          {importStep >= 3 && previewData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Bảng đối soát kiểm kê tồn kho ({previewData.validCount} dòng hợp lệ)
                  </h3>
                  <p className="text-xs text-muted">
                    Phân loại biến động tồn kho và kiểm tra lỗi trước khi lưu vào CSDL
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewData(null);
                      setExcelFile(null);
                      setImportStep(2);
                    }}
                  >
                    Chọn file khác
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isCommitting || previewData.validCount === 0}
                    onClick={() => setShowCommitConfirmModal(true)}
                  >
                    Tiến hành Lưu ({previewData.validCount})
                  </Button>
                </div>
              </div>

              <ExcelValidationTable
                type="inventory"
                previewData={previewData}
                allowPartialImport={allowPartialImport}
                onTogglePartialImport={setAllowPartialImport}
                onExportErrors={handleExportErrors}
              />
            </div>
          )}

          {/* 5. Import Result Notification */}
          {importResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{importResult.message}</span>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('stock')}
                >
                  Xem danh mục kho
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('history')}
                >
                  Kiểm tra Sổ kho
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportResult(null);
                    setImportStep(1);
                  }}
                >
                  Tiếp tục nhập đợt mới
                </Button>
              </div>
            </div>
          )}

          {/* 6. Modal xác nhận lưu 2 lớp */}
          {showCommitConfirmModal && previewData && (
            <ExcelCommitModal
              isOpen={showCommitConfirmModal}
              type="inventory"
              summary={{
                total: previewData.validCount,
                inserts: previewData.validRows?.filter((r: any) => r.status === 'INSERT').length || 0,
                updates: previewData.validRows?.filter((r: any) => r.status === 'UPDATE').length || 0,
                canteenName: previewData.validRows?.[0]?.canteenName
              }}
              isSubmitting={isCommitting}
              onClose={() => setShowCommitConfirmModal(false)}
              onConfirm={handleCommitInventory}
            />
          )}
        </div>
      )}

      {/* Modal Phiếu Kho */}
      {showTxModal && selectedIngredient && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 border border-border shadow-modal space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                {txType === 'IMPORT'
                  ? 'Nhập kho nguyên liệu'
                  : txType === 'EXPORT'
                  ? 'Xuất ca bếp'
                  : txType === 'ADJUSTMENT'
                  ? 'Điều chỉnh tồn kho thực tế'
                  : 'Xuất hủy hao hụt'}
              </h3>
              <button
                onClick={() => setShowTxModal(false)}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="text-muted leading-relaxed">
              Nguyên liệu: <strong className="text-foreground">{selectedIngredient.name}</strong>
              <br />
              Tồn hiện tại: <span className="font-semibold text-foreground font-mono">{selectedIngredient.currentQty} {selectedIngredient.unit}</span>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block font-medium text-foreground">
                  {txType === 'ADJUSTMENT'
                    ? `Số lượng tồn thực tế (${selectedIngredient.unit}) *`
                    : `Số lượng (${selectedIngredient.unit}) *`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={txQty}
                  onChange={(e) => setTxQty(e.target.value)}
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm font-mono text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-foreground">
                  Ghi chú {txType === 'WASTE' || txType === 'ADJUSTMENT' ? '(Bắt buộc lý do) *' : ''}
                </label>
                <input
                  type="text"
                  required={txType === 'WASTE' || txType === 'ADJUSTMENT'}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder={
                    txType === 'WASTE' || txType === 'ADJUSTMENT'
                      ? 'Nhập lý do bắt buộc...'
                      : 'Ghi chú thêm...'
                  }
                  className="w-full h-10 px-3.5 bg-surface border border-border-strong rounded-xl text-sm text-foreground focus:border-focus focus:ring-2 focus:ring-focus outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTxModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingTx}
                >
                  Lưu phiếu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-Step Confirmation Modal for Excel Inventory Import */}
      {showCommitConfirmModal && previewData && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-5 border border-border shadow-modal space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-700 border border-slate-200">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Xác nhận cập nhật tồn kho (Bước 2/2)
                  </h3>
                  <p className="text-[11px] text-muted">
                    Kiểm tra và xác nhận trước khi lưu vào hệ thống
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommitConfirmModal(false)}
                disabled={isCommitting}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="bg-surface-subtle p-3 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted">Tổng số nguyên liệu hợp lệ:</span>
                <span className="font-mono font-bold text-foreground">
                  {previewData.validRows?.length || previewData.validCount || 0} dòng
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Tên file Excel:</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">
                  {excelFile?.name || 'File tồn kho'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 space-y-1">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <Info className="size-3.5 text-slate-600 shrink-0" />
                Cảnh báo tác động hệ thống
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Hành động này sẽ cập nhật số lượng tồn kho đầu kỳ và định mức tối thiểu của các nguyên liệu trong file Excel. Vui lòng đảm bảo các số liệu là chính xác.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isCommitting}
                onClick={() => setShowCommitConfirmModal(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isCommitting}
                onClick={handleCommitInventory}
              >
                Xác nhận lưu vào hệ thống
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
