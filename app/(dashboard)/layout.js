import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { SidebarProvider } from '@/components/SidebarContext';

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-[260px] ml-0 min-w-0 overflow-hidden transition-all duration-300">
          <TopBar />
          <main className="p-4 md:p-6 overflow-x-hidden pb-24 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
