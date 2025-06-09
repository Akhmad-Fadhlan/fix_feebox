import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, Download, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, Booking } from '@/services/databaseService';

interface TransactionsManagerProps {
  bookings: Booking[];
  setBookings: (bookings: Booking[]) => void;
  onDataChange?: () => void;
}

export function TransactionsManager({ bookings, setBookings, onDataChange }: TransactionsManagerProps) {
  // Safe function to format numbers
  const safeToLocaleString = (value: any): string => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0';
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return '0';
    }
    return numValue.toLocaleString();
  };

  // Function to get transaction details from the actual backend data structure
  const getTransactionDisplay = (booking: any) => {
    console.log('Raw booking data from backend:', booking);
    
    // Extract data from the actual backend structure
    const transactionData = {
      // For customer info - prioritize direct fields from booking
      customerName: booking.customerName || 
                   booking.user?.name || 
                   booking.name || 
                   'Guest User',
      
      customerPhone: booking.customerPhone || 
                    booking.phone || 
                    booking.user?.phone || 
                    'N/A',
      
      // For locker info - map from IDs to actual values
      lockerName: booking.locker?.locker_code ? `Locker ${booking.locker.locker_code}` : 
                  booking.lockerName || 
                  (booking.locker_id ? `Locker ID: ${booking.locker_id}` : 'N/A'),
      
      lockerSize: booking.locker?.width && booking.locker?.height ? 
                  `${booking.locker.width}x${booking.locker.height}cm` :
                  booking.lockerSize || 'N/A',
      
      // For package/duration info - prioritize direct duration field
      duration: booking.duration || 
                (booking.package?.name?.includes('jam') ? 
                 parseInt(booking.package.name.match(/\d+/)?.[0] || '1') : 1),
                
      packageName: booking.package?.name || 
                   booking.packageName || 
                   `Paket ${booking.duration || 1} Jam`,
      
      // For pricing - prioritize direct totalPrice field
      totalPrice: booking.totalPrice || 
                  booking.package?.price || 
                  booking.amount || 
                  0,
      
      // For payment status
      paymentStatus: booking.payment_status || 
                     booking.paymentStatus || 
                     'pending',
      
      // For access code - generate if not exists
      accessCode: booking.accessCode || 
                  booking.access_code || 
                  (booking.id ? booking.id.substring(0, 6).toUpperCase() : 'N/A'),
      
      // For payment/order ID
      paymentId: booking.merchantOrderId || 
                 booking.payment_id || 
                 booking.id || 
                 'N/A',
      
      // For date - use correct property name
      createdAt: booking.createdAt || new Date().toISOString()
    };
    
    console.log('Processed transaction display data:', transactionData);
    return transactionData;
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    
    try {
      console.log('Deleting booking:', bookingId);
      
      // Delete from Firebase
      await databaseService.deleteBooking(bookingId);
      
      // Also try to delete from backend to prevent sync issues
      try {
        await fetch(`https://projectiot.web.id/api/v1/transactions/${bookingId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('Booking also deleted from backend');
      } catch (backendError) {
        console.warn('Could not delete from backend, but Firebase deletion succeeded:', backendError);
      }
      
      setBookings(bookings.filter(b => b.id !== bookingId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Transaksi berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus transaksi",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllBookings = async () => {
    if (bookings.length === 0) {
      toast({
        title: "Info",
        description: "Tidak ada data transaksi untuk dihapus",
      });
      return;
    }

    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA ${bookings.length} transaksi? Tindakan ini tidak dapat dibatalkan!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data transaksi?')) return;
    
    try {
      console.log(`Deleting all ${bookings.length} bookings...`);
      
      // Delete all bookings one by one from Firebase
      for (const booking of bookings) {
        if (booking.id) {
          await databaseService.deleteBooking(booking.id);
          
          // Also try to delete from backend
          try {
            await fetch(`https://projectiot.web.id/api/v1/transactions/${booking.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });
          } catch (backendError) {
            console.warn(`Could not delete booking ${booking.id} from backend:`, backendError);
          }
        }
      }
      
      setBookings([]);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: `Semua ${bookings.length} transaksi berhasil dihapus dari Firebase dan backend`,
      });
    } catch (error) {
      console.error('Error deleting all bookings:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus semua transaksi",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Lunas', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Gagal', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Data Transaksi ({bookings.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {bookings.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAllBookings}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hapus Semua
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Belum ada data transaksi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Loker</TableHead>
                    <TableHead className="font-semibold">Paket</TableHead>
                    <TableHead className="font-semibold">Total</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Kode Akses</TableHead>
                    <TableHead className="font-semibold">Payment ID</TableHead>
                    <TableHead className="font-semibold">Tanggal</TableHead>
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings
                    .sort((a, b) => {
                      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return timeB - timeA;
                    })
                    .map((booking) => {
                      const displayData = getTransactionDisplay(booking);
                      return (
                    <TableRow key={booking.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayData.customerName}</p>
                          <p className="text-sm text-gray-500">{displayData.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayData.lockerName}</p>
                          <p className="text-sm text-gray-500">{displayData.lockerSize}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{displayData.packageName}</p>
                          <Badge variant="outline">{displayData.duration} jam</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        Rp {safeToLocaleString(displayData.totalPrice)}
                      </TableCell>
                      <TableCell>{getStatusBadge(displayData.paymentStatus)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {displayData.accessCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {displayData.paymentId.length > 12 ? 
                            `${displayData.paymentId.substring(0, 12)}...` : 
                            displayData.paymentId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(displayData.createdAt).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => booking.id && handleDeleteBooking(booking.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
