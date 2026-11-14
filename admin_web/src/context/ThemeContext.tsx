import React, { createContext, useContext, useEffect } from 'react';

export interface ThemeClasses {
  name: string;
  primaryBtn: string;
  activeNav: string;
  activeTab: string;
  brandBg: string;
  chartFill: string;
  accentText: string;
  badgeActive: string;
  tag: string;
}

const blueTheme: ThemeClasses = {
  name: 'Xanh Chuẩn DESIGN.md (#0057b8)',
  primaryBtn: 'bg-[#0057b8] hover:bg-[#004593] text-white font-medium shadow-1 transition-all duration-200 rounded-xl',
  activeNav: 'bg-blue-50/80 text-[#0057b8] font-semibold',
  activeTab: 'bg-[#0057b8] text-white shadow-1 font-semibold',
  brandBg: 'bg-[#0057b8] text-white shadow-1',
  chartFill: '#0057b8',
  accentText: 'text-[#0057b8]',
  badgeActive: 'bg-blue-50 text-[#0057b8] border border-blue-200',
  tag: 'text-[#0057b8] bg-blue-50/80 border border-blue-200',
};

interface ThemeContextType {
  classes: ThemeClasses;
}

const ThemeContext = createContext<ThemeContextType>({
  classes: blueTheme,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Clear any previous theme overrides
    localStorage.removeItem('admin_muted_theme');

    // Ensure DESIGN.md Blue (#0057b8) variables on root
    const root = document.documentElement;
    root.style.setProperty('--primary', '#0057b8');
    root.style.setProperty('--primary-hover', '#004593');
    root.style.setProperty('--primary-light', 'rgba(0, 87, 184, 0.08)');
    root.style.setProperty('--chart-fill', '#0057b8');
    root.style.setProperty('--border-focus', '#0057b8');
    root.style.setProperty('--ring-focus', 'rgba(0, 87, 184, 0.22)');
  }, []);

  return (
    <ThemeContext.Provider value={{ classes: blueTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
