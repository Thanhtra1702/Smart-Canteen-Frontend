import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface BrandSettings {
  brandName: string;
  brandSubtitle: string;
  logoUrl: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BRAND: BrandSettings = {
  brandName: 'Smart Canteen HQ',
  brandSubtitle: 'Hệ thống F&B Chuỗi',
  logoUrl: '',
};

interface BrandContextType {
  brand: BrandSettings;
  isLoading: boolean;
  isBrandModalOpen: boolean;
  openBrandModal: () => void;
  closeBrandModal: () => void;
  updateBrand: (data: { brandName?: string; brandSubtitle?: string; logoUrl?: string }) => Promise<void>;
  refreshBrand: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'smart_canteen_brand_settings';

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<BrandSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            brandName: parsed.brandName || DEFAULT_BRAND.brandName,
            brandSubtitle: parsed.brandSubtitle || DEFAULT_BRAND.brandSubtitle,
            logoUrl: parsed.logoUrl || '',
            updatedAt: parsed.updatedAt,
            updatedBy: parsed.updatedBy,
          };
        }
      } catch (e) {
        console.warn('Lỗi đọc local brand settings:', e);
      }
    }
    return DEFAULT_BRAND;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);

  const openBrandModal = useCallback(() => setIsBrandModalOpen(true), []);
  const closeBrandModal = useCallback(() => setIsBrandModalOpen(false), []);

  const refreshBrand = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/brand');
      if (res.data) {
        const newSettings: BrandSettings = {
          brandName: res.data.brandName || DEFAULT_BRAND.brandName,
          brandSubtitle: res.data.brandSubtitle || DEFAULT_BRAND.brandSubtitle,
          logoUrl: res.data.logoUrl || '',
          updatedAt: res.data.updatedAt,
          updatedBy: res.data.updatedBy,
        };
        setBrand(newSettings);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
        }
      }
    } catch (err) {
      console.warn('Không thể tải cấu hình thương hiệu từ server:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBrand();
  }, [refreshBrand]);

  useEffect(() => {
    if (typeof document !== 'undefined' && brand.brandName) {
      document.title = `${brand.brandName} - Quản trị Canteen`;
      if (brand.logoUrl) {
        let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = brand.logoUrl;
      }
    }
  }, [brand.brandName, brand.logoUrl]);

  const updateBrand = useCallback(
    async (data: { brandName?: string; brandSubtitle?: string; logoUrl?: string }) => {
      const res = await api.put('/brand', data);
      const updated = res.data?.data || res.data;
      if (updated) {
        const nextSettings: BrandSettings = {
          brandName: updated.brandName || DEFAULT_BRAND.brandName,
          brandSubtitle: updated.brandSubtitle || DEFAULT_BRAND.brandSubtitle,
          logoUrl: updated.logoUrl !== undefined ? updated.logoUrl : brand.logoUrl,
          updatedAt: updated.updatedAt,
          updatedBy: updated.updatedBy,
        };
        setBrand(nextSettings);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextSettings));
        }
      }
    },
    [brand.logoUrl]
  );

  return (
    <BrandContext.Provider
      value={{
        brand,
        isLoading,
        isBrandModalOpen,
        openBrandModal,
        closeBrandModal,
        updateBrand,
        refreshBrand,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
