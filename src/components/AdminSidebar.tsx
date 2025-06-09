
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Package,
  Box,
  CreditCard,
  Cpu,
  FileText,
  DollarSign,
  LogOut,
  Shield,
  Activity,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
}

const menuItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Analytics',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    shadowColor: 'shadow-blue-500/25'
  },
  {
    id: 'users',
    title: 'Pengguna',
    icon: Users,
    description: 'Manajemen User',
    gradient: 'from-violet-500 via-purple-600 to-purple-700',
    shadowColor: 'shadow-purple-500/25'
  },
  {
    id: 'packages',
    title: 'Paket Layanan',
    icon: Package,
    description: 'Kelola Paket',
    gradient: 'from-emerald-500 via-green-600 to-green-700',
    shadowColor: 'shadow-green-500/25'
  },
  {
    id: 'lockers',
    title: 'Loker',
    icon: Box,
    description: 'Manajemen Loker',
    gradient: 'from-orange-500 via-amber-600 to-yellow-600',
    shadowColor: 'shadow-orange-500/25'
  },
  {
    id: 'transactions',
    title: 'Transaksi',
    icon: CreditCard,
    description: 'Data Transaksi',
    gradient: 'from-pink-500 via-rose-600 to-red-600',
    shadowColor: 'shadow-pink-500/25'
  },
  {
    id: 'devices',
    title: 'Perangkat ESP32',
    icon: Cpu,
    description: 'Monitor Devices',
    gradient: 'from-indigo-500 via-blue-600 to-cyan-600',
    shadowColor: 'shadow-indigo-500/25'
  },
  {
    id: 'logs',
    title: 'Log Aktivitas',
    icon: FileText,
    description: 'Riwayat Aktivitas',
    gradient: 'from-gray-500 via-slate-600 to-zinc-600',
    shadowColor: 'shadow-gray-500/25'
  },
  {
    id: 'payments',
    title: 'Pembayaran',
    icon: DollarSign,
    description: 'Status Pembayaran',
    gradient: 'from-teal-500 via-cyan-600 to-blue-600',
    shadowColor: 'shadow-teal-500/25'
  }
];

export function AdminSidebar({ currentView, onViewChange, onLogout }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-900/80">
      <SidebarHeader className="border-b border-white/10 px-4 md:px-6 py-6 md:py-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
        
        <div className="relative flex items-center gap-3 md:gap-4">
          <div className="relative group">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
              <Shield className="w-6 h-6 md:w-7 md:h-7 text-white drop-shadow-sm" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-2 border-slate-900 shadow-lg animate-pulse">
              <Activity className="w-3 h-3 text-white mx-auto mt-0.5" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-lg group-hover:blur-xl transition-all duration-300"></div>
          </div>
          
          <div className="min-w-0 flex-1 relative">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-xl md:text-2xl bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent truncate">
                FeeBox Admin
              </h2>
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            </div>
            <p className="text-sm md:text-base text-slate-300 font-medium">Management Dashboard</p>
            <div className="w-20 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2 shadow-sm"></div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 md:px-4 py-6 md:py-8">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 mb-4 md:mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Navigation Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 md:space-y-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={currentView === item.id}
                    className={`group relative w-full justify-start h-14 md:h-16 px-4 md:px-5 text-left rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                      currentView === item.id 
                        ? `bg-gradient-to-r ${item.gradient} shadow-xl ${item.shadowColor} border border-white/20` 
                        : 'hover:bg-white/5 hover:shadow-lg hover:shadow-white/5 border border-transparent hover:border-white/10'
                    }`}
                  >
                    {/* Background glow for active item */}
                    {currentView === item.id && (
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.gradient} blur-xl opacity-30 -z-10`}></div>
                    )}
                    
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mr-4 md:mr-5 flex-shrink-0 transition-all duration-300 ${
                      currentView === item.id 
                        ? 'bg-white/20 shadow-inner backdrop-blur-sm' 
                        : 'bg-white/10 group-hover:bg-white/15 backdrop-blur-sm'
                    }`}>
                      <item.icon className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                        currentView === item.id ? 'text-white drop-shadow-sm' : 'text-slate-300 group-hover:text-white'
                      }`} />
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-sm md:text-base font-semibold truncate transition-colors duration-300 ${
                        currentView === item.id ? 'text-white drop-shadow-sm' : 'text-slate-200 group-hover:text-white'
                      }`}>
                        {item.title}
                      </span>
                      <span className={`text-xs md:text-sm truncate transition-colors duration-300 hidden md:block ${
                        currentView === item.id ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'
                      }`}>
                        {item.description}
                      </span>
                    </div>
                    
                    {currentView === item.id && (
                      <>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm animate-pulse"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-sm"></div>
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="my-6 mx-4 bg-white/10" />

      <SidebarFooter className="p-4 md:p-6">
        <div className="bg-gradient-to-br from-slate-800/50 via-slate-700/30 to-slate-800/50 rounded-2xl p-4 md:p-5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full blur-2xl"></div>
          
          <div className="relative flex items-center gap-3 mb-4 hidden md:flex">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Admin Session</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Authenticated
              </p>
            </div>
          </div>
          
          <Button 
            onClick={onLogout}
            variant="outline" 
            size="sm" 
            className="relative w-full justify-start text-red-400 border-red-500/30 bg-red-950/20 hover:bg-red-950/40 hover:border-red-400/50 hover:text-red-300 h-10 md:h-12 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Keluar</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-500/10 to-red-600/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
