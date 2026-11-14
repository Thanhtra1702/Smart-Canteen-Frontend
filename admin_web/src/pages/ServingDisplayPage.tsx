import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ScanLine,
  Camera,
  X,
  QrCode,
  Sparkles,
} from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';

interface ServingDisplayPageProps {
  canteenId: string;
  isEmbedded?: boolean;
}

export const ServingDisplayPage: React.FC<ServingDisplayPageProps> = ({ canteenId, isEmbedded }) => {
  const [data, setData] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeMealType, setActiveMealType] = useState<string>('LUNCH');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Manual token input bar
  const [manualToken, setManualToken] = useState('');

  // Camera & Manual input states
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [modalInputCode, setModalInputCode] = useState<string>('');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const handleCheckinTokenRef = useRef<any>(null);

  // Toast notification for serving / check-in events
  const [scannerToast, setScannerToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audio confirmation chime
  const playScanChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, [soundEnabled]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch serving queue data
  const fetchData = useCallback(
    async (meal = activeMealType) => {
      try {
        const res = await api.get(`/menu/display/${canteenId}`, {
          params: { mealType: meal },
        });
        setData(res.data);
        if (res.data?.activeMealType && !data) {
          setActiveMealType(res.data.activeMealType);
        }
      } catch (err: any) {
        console.error('Lỗi tải dữ liệu màn hình quầy gắp món:', err);
      }
    },
    [canteenId, activeMealType, data]
  );

  useEffect(() => {
    fetchData(activeMealType);
    const interval = setInterval(() => {
      fetchData(activeMealType);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeMealType, fetchData]);

  // Actions
  const handleServingAction = useCallback(
    async (action: string, checkinId?: string) => {
      try {
        setActionLoading(true);
        await api.post(`/menu/display/${canteenId}/action`, {
          action,
          checkinId,
        });
        playScanChime();
        await fetchData(activeMealType);
      } catch (err: any) {
        console.error('Lỗi cập nhật phục vụ:', err);
      } finally {
        setActionLoading(false);
      }
    },
    [canteenId, activeMealType, playScanChime, fetchData]
  );

  // Handle Token / Order QR Checkin
  const handleCheckinToken = useCallback(
    async (tokenToUse: string) => {
      const rawClean = tokenToUse.trim();
      const clean = rawClean.replace(/^#/, '').replace(/\s+/g, '').trim();
      if (!clean) return;

      try {
        setActionLoading(true);
        let res: any;

        if (
          rawClean.startsWith('ORDER:') ||
          rawClean.startsWith('cheero://pass/') ||
          rawClean.startsWith('CANTEEN_ORDER:')
        ) {
          const orderId = rawClean
            .replace('cheero://pass/', '')
            .replace('CANTEEN_ORDER:', '')
            .replace('ORDER:', '')
            .replace(/^#/, '')
            .trim();
          res = await api.post('/checkin/order', { orderId, canteenId });
        } else if (/^[0-9a-fA-F-]{6,36}$/.test(clean)) {
          try {
            res = await api.post('/checkin/order', { orderId: clean, canteenId });
          } catch {
            res = await api.post('/checkin/qr', { qrToken: clean, canteenId, mealType: activeMealType });
          }
        } else {
          res = await api.post('/checkin/qr', { qrToken: clean, canteenId, mealType: activeMealType });
        }

        const orderMealType = res.data?.checkin?.mealType || res.data?.order?.mealType;
        const targetMeal = orderMealType || activeMealType;
        if (orderMealType && orderMealType !== activeMealType) {
          setActiveMealType(orderMealType);
        }

        playScanChime();
        setScannerToast({
          type: 'success',
          text: res.data?.message || 'Check-in nhận cơm thành công!',
        });
        setManualToken('');
        await fetchData(targetMeal);
        setTimeout(() => setScannerToast(null), 3500);
      } catch (err: any) {
        setScannerToast({
          type: 'error',
          text: err?.response?.data?.message || err?.message || 'Mã QR không hợp lệ hoặc đã sử dụng',
        });
        setTimeout(() => setScannerToast(null), 3500);
      } finally {
        setActionLoading(false);
      }
    },
    [canteenId, activeMealType, playScanChime, fetchData]
  );

  handleCheckinTokenRef.current = handleCheckinToken;

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
    setCameraError(null);
  }, []);

  const scanQrLoop = useCallback(() => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState >= 2) {
      // 1. Hardware BarcodeDetector API (fastest on modern Chrome/Android)
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          detector
            .detect(video)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue && isScanningRef.current) {
                isScanningRef.current = false;
                stopCamera();
                if (handleCheckinTokenRef.current) {
                  handleCheckinTokenRef.current(barcodes[0].rawValue);
                }
              }
            })
            .catch(() => {});
        } catch {
          // ignore
        }
      }

      // 2. Fallback to jsQR canvas inspection
      if (canvas && isScanningRef.current) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data && isScanningRef.current) {
              isScanningRef.current = false;
              stopCamera();
              if (handleCheckinTokenRef.current) {
                handleCheckinTokenRef.current(code.data);
              }
              return;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanQrLoop);
    }
  }, [stopCamera]);

  const startCamera = () => {
    setCameraError(null);
    setShowCameraModal(true);
  };

  useEffect(() => {
    if (!showCameraModal) {
      isScanningRef.current = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    isScanningRef.current = true;
    let localStream: MediaStream | null = null;
    let isCancelled = false;

    const initCam = async () => {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Trình duyệt không hỗ trợ Camera. Vui lòng sử dụng Chrome hoặc Safari.');
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: cameraFacing },
            },
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: cameraFacing === 'environment' ? 'user' : 'environment',
              },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = stream;
        streamRef.current = stream;

        // Try continuous autofocus on mobile sensor if available
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
            if (caps?.focusMode?.includes('continuous')) {
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
            }
          } catch {
            // ignore
          }
        }

        if (videoRef.current) {
          const video = videoRef.current;
          video.defaultMuted = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          video.srcObject = stream;

          video.onloadedmetadata = () => {
            video
              .play()
              .then(() => {
                if (isScanningRef.current) {
                  scanQrLoop();
                }
              })
              .catch((playErr) => console.warn('Video play warning:', playErr));
          };

          video
            .play()
            .then(() => {
              if (isScanningRef.current) {
                scanQrLoop();
              }
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Lỗi truy cập Camera:', err);
        setCameraError('Không thể mở Camera. Vui lòng cấp quyền truy cập Camera trong cài đặt trình duyệt.');
      }
    };

    const timer = setTimeout(initCam, 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      isScanningRef.current = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCameraModal, cameraFacing, scanQrLoop]);

  useEffect(() => {
    return () => {
      isScanningRef.current = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Keyboard & USB Barcode Gun Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const now = Date.now();

      if (e.code === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          const scannedToken = buffer;
          buffer = '';
          handleCheckinToken(scannedToken);
          return;
        } else if (data?.currentServing?.id && !actionLoading) {
          e.preventDefault();
          handleServingAction('COMPLETE_SERVING', data.currentServing.id);
          return;
        }
      }

      if (e.code === 'Space') {
        if (data?.currentServing?.id && !actionLoading) {
          e.preventDefault();
          handleServingAction('COMPLETE_SERVING', data.currentServing.id);
          return;
        }
      }

      if (e.key && e.key.length === 1) {
        if (now - lastKeyTime > 120) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data?.currentServing, actionLoading, handleServingAction, handleCheckinToken]);

  const currentMenu = data?.todayMenus?.find((m: any) => m.mealType === activeMealType);
  const menuDishes = currentMenu?.items?.map((i: any) => i.dish) || [];

  const mainDishNames = menuDishes.filter((d: any) => d.category === 'MAIN').map((d: any) => d.name);
  const sideDishNames = menuDishes.filter((d: any) => d.category === 'SIDE').map((d: any) => d.name);
  const otherDishNames = menuDishes
    .filter((d: any) => !['MAIN', 'SIDE'].includes(d.category))
    .map((d: any) => d.name);

  const waitingQueue = data?.waitingQueue || [];
  const currentServing = data?.currentServing || null;
  const completedQueue = data?.completedQueue || [];

  // Compose dish list
  const dishesToServe: { name: string; category?: string }[] = [];
  if (currentServing?.preOrderedDishes && currentServing.preOrderedDishes.length > 0) {
    currentServing.preOrderedDishes.forEach((d: any) => {
      dishesToServe.push({ name: d.name, category: d.category || 'MAIN' });
    });
  } else {
    dishesToServe.push({ name: 'Cơm trắng', category: 'BASE' });
    if (mainDishNames.length > 0) {
      mainDishNames.forEach((n: string) => dishesToServe.push({ name: n, category: 'MAIN' }));
    }
    if (sideDishNames.length > 0) {
      sideDishNames.forEach((n: string) => dishesToServe.push({ name: n, category: 'SIDE' }));
    }
    if (otherDishNames.length > 0) {
      otherDishNames.forEach((n: string) => dishesToServe.push({ name: n, category: 'OTHER' }));
    }
    dishesToServe.push({ name: 'Canh nóng trong ngày', category: 'SOUP' });
  }

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'MAIN':
        return 'Món chính';
      case 'SIDE':
        return 'Món phụ';
      case 'SOUP':
        return 'Món canh';
      case 'BASE':
        return 'Cơm';
      case 'DESSERT':
        return 'Tráng miệng';
      case 'DRINK':
        return 'Đồ uống';
      default:
        return 'Kèm theo';
    }
  };

  const getCategoryBadgeClass = (category?: string) => {
    switch (category) {
      case 'MAIN':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      case 'SIDE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      case 'SOUP':
        return 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
      case 'DESSERT':
        return 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
      case 'DRINK':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold';
      case 'BASE':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 font-sans select-none flex flex-col p-4 sm:p-5 gap-3.5 antialiased ${
        isEmbedded ? 'p-0 bg-transparent min-h-full' : ''
      }`}
    >
      {/* Toast Notification */}
      {scannerToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg border shadow-sm flex items-center gap-2.5 text-xs font-medium transition-all ${
            scannerToast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {scannerToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{scannerToast.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. MINIMAL HEADER BAR                                    */}
      {/* ======================================================== */}
      <header className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900">
                {data?.canteen?.name || 'Quầy phục vụ suất ăn'}
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Trực tuyến
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Điều phối thứ tự phục vụ và định lượng suất ăn tại quầy
            </p>
          </div>
        </div>

        {/* Meal Selector Tabs (Minimal Segmented Control) */}
        <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
          {[
            { id: 'BREAKFAST', label: 'Ca Sáng' },
            { id: 'LUNCH', label: 'Ca Trưa' },
            { id: 'DINNER', label: 'Ca Tối' },
          ].map((meal) => {
            const isActive = activeMealType === meal.id;
            return (
              <button
                key={meal.id}
                onClick={() => {
                  setActiveMealType(meal.id);
                  fetchData(meal.id);
                }}
                className={`h-7 px-3 rounded-md text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {meal.label}
              </button>
            );
          })}
        </div>

        {/* QR Scanner Controls: Camera & Quick Demo buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition shadow-xs cursor-pointer"
            title="Mở camera laptop để quét mã QR trên điện thoại học sinh"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>📷 Camera Quét QR</span>
          </button>

          {/* Quick Demo Scan Buttons */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs pl-2 border-l border-slate-200">
            <button
              type="button"
              onClick={() => handleCheckinToken('STUDENT:HS-10A1-01')}
              className="h-7 px-2 rounded-md bg-blue-50 hover:bg-primary hover:text-white text-primary text-[11px] font-medium transition cursor-pointer border border-blue-200"
              title="Quét thử Nguyễn Văn An (HS-10A1-01)"
            >
              ⚡ An (10A1)
            </button>
            <button
              type="button"
              onClick={() => handleCheckinToken('STUDENT:HS-11B2-05')}
              className="h-7 px-2 rounded-md bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 text-[11px] font-medium transition cursor-pointer border border-amber-200"
              title="Quét thử Lê Hoàng Long (HS-11B2-05 - Dị ứng đậu phộng)"
            >
              ⚡ Long (Dị ứng)
            </button>
            <button
              type="button"
              onClick={() => handleCheckinToken('STUDENT:HS-10A1-02')}
              className="h-7 px-2 rounded-md bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-[11px] font-medium transition cursor-pointer border border-emerald-200"
              title="Quét thử Trần Thị Mai (HS-10A1-02)"
            >
              ⚡ Mai (10A1)
            </button>
          </div>
        </div>

        {/* Tools: Sound, Fullscreen, Clock */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title={soundEnabled ? 'Tắt chuông' : 'Bật chuông'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="text-right pl-2.5 border-l border-slate-200">
            <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] text-slate-400 capitalize">{currentDate}</div>
          </div>

          {!isEmbedded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Thoát
            </Button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. SIMPLE INPUT STRIP                                    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <ScanLine className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Quét mã QR hoặc nhập mã học sinh / đơn hàng..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCheckinToken(manualToken);
                }
              }}
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 focus:bg-white transition"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={!manualToken.trim() || actionLoading}
            onClick={() => handleCheckinToken(manualToken)}
          >
            Check-in
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Phím tắt:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">
            Space
          </kbd>
          <span>hoàn tất</span>
          <span className="text-slate-300">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-600">
            Enter
          </kbd>
          <span>check-in</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. THREE CLEAN KDS COLUMNS (3 - 6 - 3 GRID)              */}
      {/* ======================================================== */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch min-h-0">
        {/* COLUMN 1: HÀNG ĐỢI (3 COLS) */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              1. Hàng đợi
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {waitingQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[calc(100vh-20rem)]">
            {waitingQueue.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Hàng đợi trống
              </div>
            ) : (
              waitingQueue.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  onClick={() => handleServingAction('START_SERVING', item.id)}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded bg-slate-100 font-mono text-[11px] font-medium text-slate-700 flex items-center justify-center shrink-0">
                        {item.seqDisplay || `#${idx + 1}`}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {item.userName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.studentCode || 'N/A'} • {item.timeStr || ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 hover:text-slate-700">Gắp →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* COLUMN 2: KHAY ĐANG PHỤC VỤ (6 COLS - CLEAN CENTER) */}
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 flex flex-col justify-between overflow-y-auto p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-700 tracking-wide">
                2. Khay đang gắp tại quầy
              </span>
              {currentServing && (
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {currentServing.seqDisplay}
                </span>
              )}
            </div>

            {currentServing ? (
              <div className="space-y-4">
                {/* Student Info Box */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1.5 tracking-wider">
                      <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Đang phục vụ tại quầy:</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                      <span>{currentServing.userName}</span>
                      {currentServing.seqDisplay && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {currentServing.seqDisplay}
                        </span>
                      )}
                    </div>
                    {currentServing.allergies && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-pulse">
                        <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
                        <span>⚠️ LƯU Ý DỊ ỨNG: {currentServing.allergies}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block tracking-wider">
                      Mã thẻ
                    </span>
                    <span className="font-mono text-xs text-slate-700">
                      {currentServing.studentCode || currentServing.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Dish Items */}
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                    Khay phần ăn ({dishesToServe.length} món)
                  </span>

                  <div className="space-y-1.5">
                    {dishesToServe.map((dish, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded bg-slate-100 font-mono text-[11px] font-medium text-slate-600 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-slate-900 truncate">
                            {dish.name}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${getCategoryBadgeClass(dish.category)}`}>
                          {getCategoryLabel(dish.category)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-xs text-slate-400">
                Quầy hiện đang trống. Quét mã QR hoặc chọn học sinh từ hàng đợi.
              </div>
            )}
          </div>

          {currentServing && (
            <div className="pt-4 border-t border-slate-200 mt-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full h-11 text-xs font-semibold cursor-pointer"
                disabled={actionLoading}
                loading={actionLoading}
                onClick={() => handleServingAction('COMPLETE_SERVING', currentServing.id)}
              >
                {actionLoading ? 'Đang cập nhật...' : 'Hoàn tất khay ăn (Phím Space)'}
              </Button>
            </div>
          )}
        </section>

        {/* COLUMN 3: ĐÃ NHẬN KHAY (3 COLS) */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              3. Đã nhận khay
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {completedQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[calc(100vh-20rem)]">
            {completedQueue.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Chưa có ai nhận cơm
              </div>
            ) : (
              completedQueue.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs flex items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 block truncate">
                      {item.userName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {item.timeStr || 'Vừa xong'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleServingAction('UNDO_COMPLETED', item.id)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer shrink-0"
                    title="Hoàn tác"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Webcam QR Scanner Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border p-5 max-w-md w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Camera Quét Mã QR Quầy</h3>
                  <p className="text-[11px] text-muted">Hướng mã QR trên điện thoại vào khung camera</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-secondary/80 hover:bg-secondary text-foreground rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Đổi camera trước / sau"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đổi Cam</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1 rounded-full text-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-primary/40 shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Graphic */}
              <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-primary/80 animate-pulse" />
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-rose-200 font-bold px-2">{cameraError}</p>
                    <p className="text-[11px] text-slate-300 px-4">
                      👉 Bấm vào icon <strong>ổ khóa 🔒</strong> ở góc trái thanh địa chỉ trình duyệt &rarr; bật <strong>Cho phép Camera (Allow)</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setShowCameraModal(false);
                      setTimeout(() => setShowCameraModal(true), 100);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Thử Mở Lại Camera
                  </button>
                </div>
              )}
            </div>

            {/* Quick manual code input inside camera modal */}
            <div className="pt-2 border-t border-border flex items-center gap-2">
              <input
                type="text"
                placeholder="Hoặc nhập mã đơn 8 số (VD: EE7C392C)..."
                value={modalInputCode}
                onChange={(e) => setModalInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && modalInputCode.trim()) {
                    const code = modalInputCode.trim();
                    setModalInputCode('');
                    stopCamera();
                    handleCheckinToken(code);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-foreground placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => {
                  if (modalInputCode.trim()) {
                    const code = modalInputCode.trim();
                    setModalInputCode('');
                    stopCamera();
                    handleCheckinToken(code);
                  }
                }}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap"
              >
                Nhận Cơm
              </button>
            </div>

            <div className="text-center pt-0.5">
              <p className="text-[11px] text-muted">
                💡 Đưa mã QR trên màn hình điện thoại vào giữa khung vuông để quét tức thì (&lt;0.5s)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
