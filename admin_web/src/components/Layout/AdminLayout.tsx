import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import type { TabType } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  title: string;
  lowStockCount?: number;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setCurrentTab,
  title,
  lowStockCount = 0,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary-light selection:text-primary">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lowStockCount={lowStockCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div
        className={`flex-1 flex flex-col min-h-screen bg-background w-full min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'
        }`}
      >
        <Header
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto bg-[#F7FAFE] w-full">
          <div className="max-w-7xl mx-auto w-full space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
