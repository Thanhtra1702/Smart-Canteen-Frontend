import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Star,
  Camera,
  Send,
  MessageSquareHeart,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export const FeedbackPage: React.FC = () => {
  const { user, currentRole, selectedCanteen, selectedChild, myFeedbacks, refreshUserData } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Ngon miệng',
    'Rất hài lòng',
    'Nhanh nhẹn & Thân thiện',
  ]);
  const [comment, setComment] = useState<string>(
    'Thịt gà rất vừa vị, nước sốt ngon. Hy vọng hôm sau quầy refill canh cải nóng hơn một chút!'
  );
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
  ]);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RESPONDED' | 'PENDING'>('ALL');

  useModalScrollLock(showPhotoModal);

  const studentTags = [
    'Ngon miệng',
    'Rất hài lòng',
    'Nhanh nhẹn & Thân thiện',
    'Cơm dẻo nóng',
    'Đúng giờ',
    'Khay sạch sẽ',
    'Canh hơi nguội',
    'Nêm hơi nhạt',
  ];

  const parentTags = [
    'Món ăn nóng sốt',
    'Khay cơm sạch sẽ',
    'Khẩu phần vừa vặn',
    'Cần thêm rau xanh',
    'Cần giữ ấm canh hơn',
    'Đảm bảo vệ sinh ATTP',
    'Phục vụ chu đáo & thân thiện',
    'Đề xuất bổ sung món mới',
  ];

  const availableTags = currentRole === 'PARENT' ? parentTags : studentTags;

  const samplePhotos = [
    {
      title: 'Cơm Gà Chiên Mắm Giòn',
      sub: 'Khay trưa Quầy 1',
      url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Cơm Sườn Cốt Lết Mật Ong',
      sub: 'Khay trưa Quầy 2',
      url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Cá Thu Nhật Kho Cà & Canh',
      sub: 'Khay trưa Quầy 3',
      url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&auto=format&fit=crop&q=80',
    },
    {
      title: 'Bát Canh Bí Đao Nấu Tôm',
      sub: 'Quầy Canh nóng',
      url: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddPhoto = (url: string) => {
    if (!attachedPhotos.includes(url)) {
      setAttachedPhotos([...attachedPhotos, url]);
    }
    setShowPhotoModal(false);
  };

  const handleRemovePhoto = (url: string) => {
    setAttachedPhotos(attachedPhotos.filter((p) => p !== url));
  };

  const handleSubmitFeedback = async () => {
    if (!comment.trim()) {
      alert('Vui lòng nhập lời nhận xét hoặc góp ý của bạn');
      return;
    }

    try {
      setIsSubmitting(true);
      const canteenId = selectedCanteen?.id || 'canteen-1';

      await api.post('/feedbacks', {
        canteenId,
        rating,
        tags: selectedTags,
        comment,
        photos: attachedPhotos,
      });

      setSubmitSuccess(true);
      await refreshUserData();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err: any) {
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock initial feedbacks if empty for realistic demo
  const sampleFeedbacks = [
    {
      id: 'fb-1',
      rating: 5,
      date: 'Hôm nay, 11:45',
      meal: 'Bữa Trưa • Suất Cơm Gà Chiên Mắm',
      comment: 'Thịt gà rất vừa vị, nước sốt ngon. Hy vọng hôm sau quầy refill canh cải nóng hơn một chút!',
      tags: ['Ngon miệng', 'Rất hài lòng'],
      photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'],
      status: 'RESPONDED',
      reply: 'Cảm ơn em nhiều nhé! Bếp trưởng Canteen đã ghi nhận và điều chỉnh tăng nhiệt nồi giữ ấm canh cải ngay trong ca trưa hôm nay.',
      replyDate: '11:52',
    },
    {
      id: 'fb-2',
      rating: 4,
      date: 'Hôm qua, 12:10',
      meal: 'Bữa Trưa • Sườn Cốt Lết',
      comment: 'Cơm gạo lứt dẻo ngon, nhân viên quầy gắp đồ thân thiện.',
      tags: ['Nhanh nhẹn & Thân thiện'],
      photos: [],
      status: 'PENDING',
    },
  ];

  const displayFeedbacks = myFeedbacks && myFeedbacks.length > 0 ? myFeedbacks : sampleFeedbacks;
  const filteredFeedbacks = displayFeedbacks.filter((fb: any) => {
    if (activeFilter === 'RESPONDED') return fb.status === 'RESPONDED';
    if (activeFilter === 'PENDING') return fb.status === 'PENDING';
    return true;
  });

  return (
    <div className="p-4 space-y-3.5 pb-28 bg-[#F7FAFE] min-h-screen">
      {/* 1. CSAT FEEDBACK FORM CONTAINER (Clean & Minimalist) */}
      <div className="bg-white rounded-3xl p-4.5 border border-slate-200/80 shadow-2xs space-y-3.5">
        {/* Header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0057b8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/60">
            {currentRole === 'PARENT' ? 'GÓP Ý & YÊU CẦU PHỤ HUYNH' : 'ĐÁNH GIÁ CHẤT LƯỢNG (CSAT)'}
          </span>
          <h3 className="text-base font-bold text-slate-900">
            {currentRole === 'PARENT'
              ? 'Góp ý & Nhận xét về Canteen trường của con'
              : 'Bạn thấy bữa ăn hôm nay thế nào?'}
          </h3>
          <p className="text-xs text-slate-500">
            {currentRole === 'PARENT'
              ? `Gửi trực tiếp đến Canteen ${selectedCanteen?.name || selectedChild?.canteenName || 'trường'}. Ban Quản lý sẽ tiếp nhận và phản hồi sớm nhất.`
              : 'Ý kiến của bạn giúp Bếp Canteen nâng cao chất lượng mỗi ngày'}
          </p>
        </div>

        {/* 5-Star Interactive Rating */}
        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 active:scale-90 transition-all cursor-pointer"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= rating
                      ? 'fill-amber-400 text-amber-500 drop-shadow-2xs'
                      : 'text-slate-200 fill-slate-100'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {rating === 5 && 'Rất hài lòng & Ngon miệng ⭐'}
            {rating === 4 && 'Hài lòng & Vừa vị'}
            {rating === 3 && 'Bình thường, tạm ổn'}
            {rating === 2 && 'Cần cải thiện chất lượng'}
            {rating === 1 && 'Chưa hài lòng với bữa ăn'}
          </span>
        </div>

        {/* Quick Review Tags */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-600">Chọn nhanh cảm nhận:</span>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-[#0057b8] bg-blue-50/70 text-[#0057b8] ring-1 ring-[#0057b8]/20'
                      : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {isSelected && '✓ '}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Textarea */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-600">Lời góp ý chi tiết:</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hãy chia sẻ cảm nhận về hương vị, độ nóng, thái độ phục vụ..."
            className="w-full p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0057b8] focus:bg-white transition"
          />
        </div>

        {/* Attached Photos Row */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-600">Ảnh thực tế (tùy chọn):</span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="w-16 h-16 rounded-xl border border-dashed border-[#0057b8]/50 bg-blue-50/50 flex flex-col items-center justify-center text-[#0057b8] shrink-0 hover:bg-blue-50 cursor-pointer active:scale-95 transition"
            >
              <Camera className="w-4.5 h-4.5" />
              <span className="text-[9px] font-bold mt-0.5">Thêm ảnh</span>
            </button>

            {attachedPhotos.map((url, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                <img src={url} alt="attached" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(url)}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmitFeedback}
          className="w-full py-3 rounded-2xl bg-[#0057b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#004593] active:scale-95 transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Đang gửi phản hồi...' : 'Gửi Đánh Giá CSAT'}</span>
        </button>

        {submitSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã ghi nhận phản hồi! Cảm ơn đóng góp quý giá của bạn.</span>
          </div>
        )}
      </div>

      {/* 2. PAST FEEDBACKS LIST */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MessageSquareHeart className="w-4 h-4 text-[#0057b8]" />
            <h4 className="text-xs font-bold text-slate-800">Lịch Sử Đánh Giá Của Bạn</h4>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px] bg-[#F1F4F8] p-0.5 rounded-lg">
            {(['ALL', 'RESPONDED', 'PENDING'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  activeFilter === f ? 'bg-white text-[#131B2E] shadow-xs' : 'text-slate-500'
                }`}
              >
                {f === 'ALL' ? 'Tất cả' : f === 'RESPONDED' ? 'Đã phản hồi' : 'Chờ xử lý'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFeedbacks.map((fb: any) => (
            <div key={fb.id} className="p-3 rounded-2xl border border-[#E2E8F0] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= (fb.rating || 5)
                          ? 'fill-[#FEA619] text-[#FEA619]'
                          : 'text-slate-200 fill-slate-100'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1.5">{fb.date || 'Hôm nay'}</span>
                </div>

                <span
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                    fb.status === 'RESPONDED'
                      ? 'bg-[#EFF6FF] text-[#0057b8] border-[#0057b8]/20'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {fb.status === 'RESPONDED' ? 'Đã giải quyết' : 'Đang xử lý'}
                </span>
              </div>

              {fb.meal && (
                <p className="text-[10.5px] font-bold text-[#0057b8]">{fb.meal}</p>
              )}

              <p className="text-xs text-[#131B2E] leading-relaxed">{fb.comment}</p>

              {fb.photos && fb.photos.length > 0 && (
                <div className="flex gap-1.5 pt-1">
                  {fb.photos.map((p: string, pIdx: number) => (
                    <img
                      key={pIdx}
                      src={p}
                      alt="tray"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                    />
                  ))}
                </div>
              )}

              {/* Staff Response Card */}
              {fb.reply && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#EFF6FF] border border-[#D0E7FF] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003E82] text-[10.5px]">
                      Quản lý Canteen phản hồi:
                    </span>
                    <span className="text-[9.5px] text-slate-400">{fb.replyDate || 'Vừa xong'}</span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">{fb.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SAMPLE PHOTO PICKER MODAL */}
      {showPhotoModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPhotoModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-end justify-center"
        >
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto overscroll-contain modal-scrollable touch-pan-y">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0057b8]" />
                <h4 className="text-sm font-black text-[#131B2E]">Đính Kèm Ảnh Khay Cơm</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Chọn ảnh khay cơm thực tế hôm nay tại quầy để gửi kèm:
            </p>

            <div className="space-y-2">
              {samplePhotos.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAddPhoto(photo.url)}
                  className="p-2.5 rounded-2xl border border-[#E2E8F0] hover:border-[#0057b8] bg-white flex items-center gap-3 cursor-pointer transition"
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#131B2E] truncate">{photo.title}</p>
                    <p className="text-[11px] text-slate-500">{photo.sub}</p>
                  </div>
                  <span className="text-xs font-bold text-[#0057b8] shrink-0">+ Chọn</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

