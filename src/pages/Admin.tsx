
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { databaseService, Booking, Locker, User, Package, ESP32Device, LockerLog, Payment } from '@/services/databaseService';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Shield, Lock, Sparkles, Zap, Menu } from 'lucide-react';
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { TransactionsManager } from '@/components/admin/TransactionsManager';
import { LockersManager } from '@/components/admin/LockersManager';
import { UsersManager } from '@/components/admin/UsersManager';
import { PackagesManager } from '@/components/admin/PackagesManager';
import { DevicesManager } from '@/components/admin/DevicesManager';
import { LockerLogsManager } from '@/components/admin/LockerLogsManager';
import { PaymentsManager } from '@/components/admin/PaymentsManager';

type AdminView = 'dashboard' | 'users' | 'packages' | 'lockers' | 'transactions' | 'devices' | 'logs' | 'payments';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [logs, setLogs] = useState<LockerLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Admin credentials
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({
        title: "Login Berhasil",
        description: "Selamat datang Admin FeeBox!",
      });
    } else {
      toast({
        title: "Login Gagal",
        description: "Username atau password salah",
        variant: "destructive",
      });
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('Loading all admin data...');
      
      // Initialize default data first
      await databaseService.initializeDefaultData();
      
      // Load all data with proper error handling and correct type assignments
      const [
        bookingsData,
        lockersData,
        usersData,
        packagesData,
        devicesData,
        logsData,
        paymentsData
      ] = await Promise.all([
        databaseService.getAllBookings().catch(err => {
          console.error('Error loading bookings:', err);
          return [];
        }),
        databaseService.getLockers().catch(err => {
          console.error('Error loading lockers:', err);
          return [];
        }),
        databaseService.getAllUsers().catch(err => {
          console.error('Error loading users:', err);
          return [];
        }),
        databaseService.getAllPackages().catch(err => {
          console.error('Error loading packages:', err);
          return [];
        }),
        databaseService.getAllDevices().catch(err => {
          console.error('Error loading devices:', err);
          return [];
        }),
        databaseService.getAllLockerLogs().catch(err => {
          console.error('Error loading logs:', err);
          return [];
        }),
        databaseService.getAllPayments().catch(err => {
          console.error('Error loading payments:', err);
          return [];
        })
      ]);
      
      // Update all states with correct types
      setBookings(bookingsData);
      setLockers(lockersData);
      setUsers(usersData);
      setPackages(packagesData);
      setDevices(devicesData);
      setLogs(logsData);
      setPayments(paymentsData);
      
      console.log('All data loaded successfully:', {
        bookings: bookingsData.length,
        lockers: lockersData.length,
        users: usersData.length,
        packages: packagesData.length,
        devices: devicesData.length,
        logs: logsData.length,
        payments: paymentsData.length
      });

      // Force re-render after data load
      setTimeout(() => {
        setLoading(false);
      }, 100);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data admin",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setCurrentView('dashboard');
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
        {/* Enhanced background decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0 bg-repeat" 
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23999' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundSize: '60px 60px'
            }} 
          />
        </div>
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 sm:w-72 h-36 sm:h-72 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        
        <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-2xl relative z-10 overflow-hidden">
          {/* Card background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <CardHeader className="text-center pb-6 sm:pb-8 md:pb-10 relative">
            {/* Enhanced header decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20 backdrop-blur-sm">
              <Shield className="w-8 sm:w-10 h-8 sm:h-10 text-white drop-shadow-lg" />
              <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/30 to-purple-600/30 blur-lg"></div>
            </div>
            
            <div className="pt-8 sm:pt-10 relative px-2 sm:px-0">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Sparkles className="w-5 sm:w-6 h-5 sm:h-6 text-yellow-400 animate-pulse" />
                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                  Admin Dashboard
                </CardTitle>
                <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-blue-400 animate-pulse delay-500" />
              </div>
              <p className="text-slate-300 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg font-semibold">FeeBox Management System</p>
              <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full mx-auto mt-3 sm:mt-4 shadow-lg"></div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-8 md:px-10 pb-8 sm:pb-10 relative">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="username" className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-200">
                <div className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full shadow-lg"></div>
                Username
              </Label>
              <Input
                id="username"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 sm:h-14 border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 focus:bg-white/15 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              />
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="password" className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-200">
                <div className="w-2 sm:w-3 h-2 sm:h-3 bg-indigo-500 rounded-full shadow-lg"></div>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="h-12 sm:h-14 border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:ring-indigo-400/20 focus:bg-white/15 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
              />
            </div>
            
            <Button 
              onClick={handleLogin} 
              className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group text-sm sm:text-base"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Lock className="w-4 sm:w-5 h-4 sm:h-5 mr-2 sm:mr-3" />
              <span className="relative z-10">Masuk ke Dashboard</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardOverview bookings={bookings} lockers={lockers} users={users} packages={packages} devices={devices} payments={payments} />;
      case 'users':
        return <UsersManager users={users} setUsers={setUsers} onDataChange={loadAllData} />;
      case 'packages':
        return <PackagesManager packages={packages} setPackages={setPackages} onDataChange={loadAllData} />;
      case 'lockers':
        return <LockersManager lockers={lockers} setLockers={setLockers} onDataChange={loadAllData} />;
      case 'transactions':
        return <TransactionsManager bookings={bookings} setBookings={setBookings} onDataChange={loadAllData} />;
      case 'devices':
        return <DevicesManager devices={devices} setDevices={setDevices} onDataChange={loadAllData} />;
      case 'logs':
        return <LockerLogsManager logs={logs} setLogs={setLogs} onDataChange={loadAllData} />;
      case 'payments':
        return <PaymentsManager payments={payments} setPayments={setPayments} onDataChange={loadAllData} />;
      default:
        return <DashboardOverview bookings={bookings} lockers={lockers} users={users} packages={packages} devices={devices} payments={payments} />;
    }
  };

  const getViewTitle = () => {
    const titles = {
      dashboard: 'Dashboard Overview',
      users: 'Manajemen Pengguna',
      packages: 'Manajemen Paket',
      lockers: 'Manajemen Loker',
      transactions: 'Manajemen Transaksi',
      devices: 'Manajemen Perangkat',
      logs: 'Log Aktivitas',
      payments: 'Manajemen Pembayaran'
    };
    return titles[currentView];
  };

  const getViewIcon = () => {
    const icons = {
      dashboard: '📊',
      users: '👥',
      packages: '📦',
      lockers: '🗃️',
      transactions: '💳',
      devices: '🔧',
      logs: '📋',
      payments: '💰'
    };
    return icons[currentView];
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-50">
          <div 
            className="absolute inset-0 bg-repeat" 
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23999' fill-opacity='0.03'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundSize: '40px 40px'
            }} 
          />
        </div>
        
        <AdminSidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          onLogout={handleLogout}
        />
        
        <SidebarInset className="flex-1">
          {/* Enhanced responsive header */}
          <header className="sticky top-0 z-50 flex h-14 sm:h-16 md:h-20 shrink-0 items-center gap-2 sm:gap-4 md:gap-6 border-b border-white/20 bg-white/80 backdrop-blur-2xl px-3 sm:px-6 md:px-8 shadow-lg shadow-black/5 relative overflow-hidden">
            {/* Header background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <SidebarTrigger className="-ml-1 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 relative z-10 p-2 rounded-md">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            
            <div className="flex flex-1 items-center justify-between min-w-0 relative z-10">
              <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 text-lg sm:text-xl flex-shrink-0">
                  {getViewIcon()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent truncate">
                    {getViewTitle()}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 hidden md:block font-medium">Real-time management dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
                <Button 
                  onClick={loadAllData} 
                  disabled={loading} 
                  variant="outline" 
                  size="sm"
                  className="hidden sm:flex text-xs sm:text-sm px-2 sm:px-4 md:px-6 h-8 sm:h-10 md:h-12 bg-white/70 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <RefreshCw className={`w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
                
                <Button 
                  onClick={loadAllData} 
                  disabled={loading} 
                  variant="outline" 
                  size="sm"
                  className="sm:hidden p-2 bg-white/70 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="sm"
                  className="hidden sm:flex text-xs sm:text-sm px-2 sm:px-4 md:px-6 h-8 sm:h-10 md:h-12 text-red-600 border-red-200 bg-red-50/70 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <LogOut className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                  Logout
                </Button>
                
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="sm"
                  className="sm:hidden p-2 text-red-600 border-red-200 bg-red-50/70 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>
          
          {/* Enhanced responsive main content */}
          <main className="flex-1 overflow-auto p-3 sm:p-6 md:p-8 lg:p-10 relative">
            <div className="max-w-full space-y-4 sm:space-y-6 md:space-y-8 relative z-10">
              {renderContent()}
            </div>
            
            {/* Background decoration for main content */}
            <div className="absolute bottom-5 sm:bottom-10 right-5 sm:right-10 w-16 sm:w-32 h-16 sm:h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
            <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-12 sm:w-24 h-12 sm:h-24 bg-gradient-to-br from-indigo-500/10 to-pink-500/10 rounded-full blur-xl"></div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
