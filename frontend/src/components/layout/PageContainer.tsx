import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PortalSidebar } from './PortalSidebar';
import { useAuthStore } from '../../store/authStore';

interface PageContainerProps {
  children: React.ReactNode;
  isPublic?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, isPublic = false }) => {
  const { isAuthenticated, currentRole } = useAuthStore();
  const showPortalLayout = !isPublic && isAuthenticated && currentRole !== 'PUBLIC';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-600 selection:text-white font-sans">
      {/* Public Navbar */}
      <PublicNavbar />

      {showPortalLayout ? (
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          <PortalSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <div className="p-6 flex-1 space-y-6">{children}</div>
          </main>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">{children}</main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 font-mono mt-auto">
        <p className="font-semibold text-slate-700">Obhoy Protocol — Permissioned Claims-Integrity Network</p>
        <p className="text-[11px] text-slate-400 mt-1">
          BCOLBD 2026 • Permissioned Network Architecture Claims Engine
        </p>
      </footer>
    </div>
  );
};
