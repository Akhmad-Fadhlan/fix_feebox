import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Package, 
  Box, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Booking, Locker, User, Package as PackageType, ESP32Device, Payment } from '@/services/databaseService';

interface DashboardOverviewProps {
  bookings: Booking[];
  lockers: Locker[];
  users: User[];
  packages: PackageType[];
  devices: ESP32Device[];
  payments: Payment[];
}

export function DashboardOverview({ 
  bookings, 
  lockers, 
  users, 
  packages, 
  devices, 
  payments 
}: DashboardOverviewProps) {
  // Safe calculation functions with null checks
  const safeToLocaleString = (value: any): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '0';
    }
    return Number(value).toLocaleString();
  };

  const safeSum = (array: any[], field: string): number => {
    if (!Array.isArray(array)) return 0;
    return array
      .filter(item => item && typeof item[field] === 'number')
      .reduce((sum, item) => sum + item[field], 0);
  };

  const safeFilter = (array: any[], condition: (item: any) => boolean): any[] => {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item && condition(item));
  };

  const safeLength = (array: any[]): number => {
    return Array.isArray(array) ? array.length : 0;
  };

  // Calculate statistics with safe operations
  const totalRevenue = safeSum(
    safeFilter(payments, p => p.status === 'success'), 
    'amount'
  );

  const activeBookings = safeFilter(bookings, b => 
    b.paymentStatus === 'paid' && !b.checkedOut
  ).length;

  const pendingBookings = safeFilter(bookings, b => 
    b.paymentStatus === 'pending'
  ).length;

  const availableLockers = safeFilter(lockers, l => 
    l.status === 'available'
  ).length;

  const onlineDevices = safeFilter(devices, d => 
    d.status === 'online'
  ).length;

  const totalUsers = safeFilter(users, u => 
    !u.isDeleted
  ).length;

  const activePackages = safeFilter(packages, p => 
    !p.isDeleted
  ).length;

  const recentBookings = Array.isArray(bookings) ? bookings.slice(0, 5) : [];

  const stats = [
    {
      title: 'Total Pengguna',
      value: totalUsers.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Paket Aktif',
      value: activePackages.toString(),
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Loker Tersedia',
      value: `${availableLockers}/${safeLength(lockers)}`,
      icon: Box,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Booking Aktif',
      value: activeBookings.toString(),
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Device Online',
      value: `${onlineDevices}/${safeLength(devices)}`,
      icon: Cpu,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Total Revenue',
      value: `Rp ${safeToLocaleString(totalRevenue)}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Lunas', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Gagal', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Statistics Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                </div>
                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0 ml-2`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Bookings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Booking Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <Clock className="w-8 h-8 md:w-12 md:h-12 text-gray-300 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-500 text-sm md:text-base">Belum ada booking</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{booking.customerName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{booking.lockerName || 'Unknown Locker'}</p>
                      <p className="text-xs text-gray-400">
                        {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('id-ID') : 'Unknown Date'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-medium text-sm">Rp {safeToLocaleString(booking.totalPrice)}</p>
                      {getStatusBadge(booking.paymentStatus || 'pending')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
              Status Sistem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Connection</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment Gateway</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Aktif</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ESP32 Devices</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${onlineDevices > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${onlineDevices > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {onlineDevices}/{safeLength(devices)} Online
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Orders</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${pendingBookings === 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className={`text-sm font-medium ${pendingBookings === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {pendingBookings} Orders
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            Ringkasan Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
              <p className="text-xl md:text-2xl font-bold text-blue-600">
                {safeFilter(bookings, b => 
                  b.createdAt && new Date(b.createdAt).toDateString() === new Date().toDateString()
                ).length}
              </p>
              <p className="text-xs md:text-sm text-blue-600">Booking Hari Ini</p>
            </div>
            
            <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
              <p className="text-xl md:text-2xl font-bold text-green-600">
                Rp {safeToLocaleString(
                  safeSum(
                    safeFilter(payments, p => 
                      p.status === 'success' && 
                      p.transaction_time && 
                      new Date(p.transaction_time).toDateString() === new Date().toDateString()
                    ), 
                    'amount'
                  )
                )}
              </p>
              <p className="text-xs md:text-sm text-green-600">Revenue Hari Ini</p>
            </div>
            
            <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg">
              <p className="text-xl md:text-2xl font-bold text-orange-600">{availableLockers}</p>
              <p className="text-xs md:text-sm text-orange-600">Loker Tersedia</p>
            </div>
            
            <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
              <p className="text-xl md:text-2xl font-bold text-purple-600">{activeBookings}</p>
              <p className="text-xs md:text-sm text-purple-600">Booking Aktif</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}