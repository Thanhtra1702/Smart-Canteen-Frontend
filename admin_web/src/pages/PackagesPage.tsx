import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Utensils, Calendar, CreditCard, Building2, Store, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export const PackagesPage: React.FC = () => {
  const { user, selectedCanteenId, setSelectedCanteenId } = useAuth();
  const toast = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [packages, setPackages] = useState<any[]>([]);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [pkgToDelete, setPkgToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1680000');
  const [totalMeals, setTotalMeals] = useState('60');
  const [durationDays, setDurationDays] = useState('30');
  const [includesBreakfast, setIncludesBreakfast] = useState(false);
  const [modalCanteenId, setModalCanteenId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCanteens = async () => {
    try {
      const res = await api.get('/canteens').catch(() => api.get('/admin-hq/canteens'));
      if (Array.isArray(res.data)) {
        setCanteens(res.data);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách cơ sở Canteen', err);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCanteenId && selectedCanteenId !== 'ALL') {
        params.canteenId = selectedCanteenId;
      }
      const res = await api.get('/packages', { params });
      setPackages(res.data);
    } catch (err) {
      console.error('Lỗi lấy gói ăn', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanteens();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [selectedCanteenId]);

  const openCreateModal = () => {
    setEditingPkg(null);
    setName('Gói 60 Suất (Trưa & Tối)');
    setDescription('60 lượt ăn trưa và tối trong tháng. Tặng kèm cơm canh thêm.');
    setPrice('1680000');
    setTotalMeals('60');
    setDurationDays('30');
    setIncludesBreakfast(false);
    setModalCanteenId(
      selectedCanteenId !== 'ALL'
        ? selectedCanteenId
        : (canteens.length > 0 ? canteens[0].id : '')
    );
    setShowModal(true);
  };

  const openEditModal = (pkg: any) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setPrice(String(pkg.price));
    setTotalMeals(String(pkg.totalCredits || pkg.totalMeals || 60));
    setDurationDays(String(pkg.durationDays || 30));
    setIncludesBreakfast(Boolean(pkg.includesBreakfast));
    setModalCanteenId(pkg.canteenId || pkg.canteen?.id || (canteens.length > 0 ? canteens[0].id : ''));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error('Chỉ Super Admin mới có quyền cấu hình gói ăn');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        canteenId: modalCanteenId || undefined,
        name,
        description,
        price: Number(price),
        totalCredits: Number(totalMeals),
        durationDays: Number(durationDays),
        includesBreakfast,
        isActive: true,
      };

      if (editingPkg) {
        await api.put(`/packages/${editingPkg.id}`, payload);
        toast.success('Cập nhật gói ăn thành công');
      } else {
        await api.post('/packages', payload);
        toast.success('Tạo gói ăn mới thành công');
      }
      setShowModal(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi lưu gói ăn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pkgToDelete || !isSuperAdmin) return;
    try {
      setIsDeleting(true);
      await api.delete(`/packages/${pkgToDelete.id}`);
      toast.success('Đã vô hiệu hóa gói ăn thành công');
      setPkgToDelete(null);
      fetchPackages();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xóa gói');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Quick Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            {packages.length} gói đang áp dụng
          </Badge>
          <span className="text-xs text-muted hidden sm:inline">
            • Phân tách gói đăng ký theo từng cơ sở Canteen
          </span>
        </div>

        {isSuperAdmin && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={openCreateModal}
          >
            Tạo gói mới
          </Button>
        )}
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const totalCredits = pkg.totalCredits || pkg.totalMeals || 60;
          const priceNum = Number(pkg.price);
          const perMealPrice = totalCredits > 0 ? Math.round(priceNum / totalCredits) : 0;

          return (
            <Card
              key={pkg.id}
              className="flex flex-col justify-between hover:border-border-strong hover:shadow-xs transition-all duration-200"
            >
              <div className="space-y-3.5">
                {/* Branch attribution badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 max-w-[220px] truncate">
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{pkg.canteen?.name || 'Tất cả cơ sở'}</span>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted hover:text-foreground"
                        title="Chỉnh sửa"
                        onClick={() => openEditModal(pkg)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted hover:text-danger hover:bg-danger/10"
                        title="Vô hiệu hóa"
                        onClick={() => setPkgToDelete(pkg)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Header & Badges */}
                <div className="space-y-1.5">
                  <Badge variant={pkg.includesBreakfast ? 'brand' : 'neutral'} size="sm">
                    {pkg.includesBreakfast ? '90 lượt • Cả 3 ca (Kèm sáng)' : '60 lượt • Trưa & Tối'}
                  </Badge>
                  <h3 className="font-semibold text-foreground text-base tracking-tight leading-snug">
                    {pkg.name}
                  </h3>
                </div>

                {pkg.description && (
                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {pkg.description}
                  </p>
                )}

                {/* Price block */}
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted font-medium">Giá trọn gói</span>
                    <span className="font-numeric text-xl font-bold text-foreground">
                      {formatVND(priceNum)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-1.5 text-muted">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{pkg.durationDays || 30} ngày</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-muted text-right">
                      <Utensils className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-numeric font-medium text-foreground">{totalCredits}</span>
                      <span>suất</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom footer tag */}
              <div className="pt-4 mt-2 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>Giá trung bình/suất</span>
                <span className="font-numeric font-semibold text-foreground">
                  ~{formatVND(perMealPrice)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {packages.length === 0 && (
        <Card className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {loading ? 'Đang tải danh sách gói ăn...' : 'Chưa có gói ăn nào tại cơ sở này'}
          </p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {selectedCanteenId !== 'ALL'
              ? `Cơ sở hiện tại chưa có gói ăn riêng. Tạo gói mới để học sinh cơ sở này có thể mua.`
              : 'Tạo các gói suất ăn định kỳ để học sinh/CBNV có thể đăng ký trực tiếp.'}
          </p>
          {isSuperAdmin && !loading && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
                Tạo gói cho cơ sở này
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Modal Tạo/Sửa Gói */}
      {showModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-modal max-w-md w-full p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground text-base">
                  {editingPkg ? 'Chỉnh sửa gói ăn' : 'Tạo gói ăn mới'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Thiết lập giá, cơ sở áp dụng và số lượng suất ăn cho gói
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted hover:text-foreground"
                onClick={() => setShowModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Canteen selection */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Cơ sở Canteen áp dụng *
                </label>
                <select
                  value={modalCanteenId}
                  onChange={(e) => setModalCanteenId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-strong bg-surface text-foreground text-xs focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors cursor-pointer"
                >
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.address ? `• ${c.address}` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted block mt-1">
                  Mỗi gói ăn được phân định rõ ràng theo từng cơ sở, tránh thất thoát suất ăn.
                </span>
              </div>

              {/* Preset toggle */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface-subtle cursor-pointer hover:border-border-strong transition-colors">
                <input
                  type="checkbox"
                  checked={includesBreakfast}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludesBreakfast(checked);
                    if (checked) {
                      setName('Gói 90 Suất (Bao Gồm Ăn Sáng)');
                      setTotalMeals('90');
                      setPrice('2280000');
                    } else {
                      setName('Gói 60 Suất (Trưa & Tối)');
                      setTotalMeals('60');
                      setPrice('1680000');
                    }
                  }}
                  className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary/20"
                />
                <div className="text-xs">
                  <span className="font-semibold text-foreground block">
                    Bao gồm ăn sáng (Gói 3 ca - 90 lượt)
                  </span>
                  <span className="text-muted text-[11px] mt-0.5 block">
                    Tự động điền mức chuẩn 90 lượt và mức giá khuyến nghị
                  </span>
                </div>
              </label>

              <Input
                label="Tên gói *"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Gói 60 Suất (Trưa & Tối)"
              />

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm về điều kiện áp dụng tại cơ sở..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-strong bg-surface text-foreground text-xs placeholder:text-muted/60 focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Giá gói (VNĐ) *"
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Input
                  label="Tổng lượt ăn *"
                  type="number"
                  required
                  value={totalMeals}
                  onChange={(e) => setTotalMeals(e.target.value)}
                />
              </div>

              <Input
                label="Thời hạn sử dụng (Ngày) *"
                type="number"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                hint="Thông thường là 30 ngày tính từ ngày kích hoạt"
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu gói ăn'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Package Confirmation Modal */}
      {pkgToDelete && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 border border-border shadow-modal space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-danger/10 rounded-xl text-danger border border-danger/20">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Xác nhận vô hiệu hóa
                  </h3>
                  <p className="text-[11px] text-muted">
                    Ngừng phát hành gói suất ăn
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPkgToDelete(null)}
                disabled={isDeleting}
                className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer outline-hidden"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="bg-surface-subtle p-3 rounded-xl border border-border space-y-1.5">
              <p className="text-muted text-[11px]">Tên gói suất ăn:</p>
              <p className="font-semibold text-foreground text-sm">{pkgToDelete.name}</p>
              <p className="font-numeric text-primary font-bold">{formatVND(Number(pkgToDelete.price))}</p>
            </div>

            <p className="text-muted leading-relaxed">
              Bạn có chắc chắn muốn vô hiệu hóa gói suất ăn này? Người dùng sẽ không thể đăng ký mua mới gói này trên Zalo Mini App và Mobile App.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setPkgToDelete(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isDeleting}
                onClick={confirmDelete}
              >
                Vô hiệu hóa gói
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
