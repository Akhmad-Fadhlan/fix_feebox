
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Package, Phone, RefreshCw } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { databaseService, Booking } from '@/services/databaseService';
import { toast } from '@/hooks/use-toast';

const PurchaseHistory = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching bookings for user:', user.uid);
      
      const userBookings = await databaseService.getUserBookings(user.uid);
      console.log('Fetched bookings:', userBookings);
      
      setBookings(userBookings);
      
      if (userBookings.length === 0) {
        console.log('No bookings found for user');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Gagal memuat riwayat pemesanan');
      toast({
        title: "Error",
        description: "Gagal memuat riwayat pemesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, navigate]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Lunas' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Gagal' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Kadaluarsa' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat riwayat pemesanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
          
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Riwayat Pemesanan
              </h1>
              <p className="text-gray-600">
                Kelola dan pantau semua pemesanan loker Anda
              </p>
            </div>
            <Button 
              onClick={fetchBookings} 
              variant="outline" 
              className="flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={fetchBookings} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        )}

        {bookings.length === 0 && !loading && !error ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Belum Ada Pemesanan</h2>
              <p className="text-gray-600 mb-4">
                Anda belum memiliki riwayat pemesanan loker.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Mulai Pesan Loker
              </Button>
            </CardContent>
          </Card>
        ) : bookings.length > 0 ? (
          <div className="space-y-6">
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-600">
                    Debug: Ditemukan {bookings.length} pemesanan untuk user {user?.uid}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Pemesanan ({bookings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Pesanan</TableHead>
                        <TableHead>Loker</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">
                            {booking.merchantOrderId}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{booking.lockerName}</p>
                              <p className="text-sm text-gray-600">{booking.lockerSize}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{booking.customerName}</p>
                              <p className="text-sm text-gray-600">{booking.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{booking.duration} hari</TableCell>
                          <TableCell className="font-semibold">
                            Rp {booking.totalPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(booking.paymentStatus)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(booking.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/checkout-result?orderId=${booking.merchantOrderId}`)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{booking.lockerName}</CardTitle>
                        <p className="text-sm text-gray-600">{booking.lockerSize}</p>
                      </div>
                      {getStatusBadge(booking.paymentStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        {booking.merchantOrderId}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(booking.createdAt)}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {booking.customerName} • {booking.duration} hari
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold text-lg">
                          Rp {booking.totalPrice.toLocaleString()}
                        </span>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/checkout-result?orderId=${booking.merchantOrderId}`)}
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PurchaseHistory;
