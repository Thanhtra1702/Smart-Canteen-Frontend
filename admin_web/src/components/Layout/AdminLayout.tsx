import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import type { TabType } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lowStockCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setCurrentTab,
  title,
  onRefresh,
  isRefreshing,
  lowStockCount = 0,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary-light selection:text-primary">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen bg-background w-full min-w-0">
        <Header
          title={title}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto bg-slate-50/60 w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
