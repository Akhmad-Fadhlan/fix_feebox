
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { localStorageService } from '@/services/localStorage';
import { databaseService } from '@/services/databaseService';
import { toast } from '@/hooks/use-toast';

const CheckoutResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed'>('pending');
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        const resultCode = searchParams.get('resultCode');
        const merchantOrderId = searchParams.get('merchantOrderId');
        const reference = searchParams.get('reference');

        console.log('Payment result params:', { resultCode, merchantOrderId, reference });

        if (resultCode === '00' && merchantOrderId) {
          // Payment successful
          setPaymentStatus('success');
          
          // Update booking status in local storage
          const allBookings = localStorageService.getAllBookings();
          const booking = allBookings.find(b => b.merchantOrderId === merchantOrderId);
          
          if (booking) {
            localStorageService.updateBookingStatus(booking.id!, 'paid', reference || '');
            setBookingData(booking);
            
            // Update in database as well
            try {
              await databaseService.updateBookingStatusByOrderId(merchantOrderId, 'paid');
            } catch (dbError) {
              console.warn('Failed to update database, but local storage updated:', dbError);
            }
            
            toast({
              title: "Pembayaran Berhasil!",
              description: "Booking Anda telah dikonfirmasi dan kode akses telah dikirim via WhatsApp.",
            });
          }
        } else {
          // Payment failed or pending
          setPaymentStatus(resultCode === '01' ? 'pending' : 'failed');
          
          toast({
            title: paymentStatus === 'pending' ? "Pembayaran Pending" : "Pembayaran Gagal",
            description: paymentStatus === 'pending' ? 
              "Pembayaran Anda sedang diproses." : 
              "Terjadi kesalahan dalam pembayaran. Silakan coba lagi.",
            variant: paymentStatus === 'failed' ? "destructive" : "default",
          });
        }
      } catch (error) {
        console.error('Error processing payment result:', error);
        setPaymentStatus('failed');
        
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memproses hasil pembayaran.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    processPaymentResult();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Pembayaran Berhasil!';
      case 'pending':
        return 'Pembayaran Pending';
      case 'failed':
        return 'Pembayaran Gagal';
      default:
        return 'Memproses...';
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Booking Anda telah dikonfirmasi. Kode akses telah dikirim via WhatsApp.';
      case 'pending':
        return 'Pembayaran Anda sedang diproses. Silakan tunggu konfirmasi.';
      case 'failed':
        return 'Terjadi kesalahan dalam pembayaran. Silakan coba lagi atau hubungi customer service.';
      default:
        return 'Sedang memproses hasil pembayaran...';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memproses hasil pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl font-bold">
                {getStatusTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-gray-600">
                {getStatusMessage()}
              </p>

              {bookingData && paymentStatus === 'success' && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loker:</span>
                        <span className="font-semibold">{bookingData.lockerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama:</span>
                        <span className="font-semibold">{bookingData.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durasi:</span>
                        <span className="font-semibold">{bookingData.duration} jam</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-green-600">
                          Rp {bookingData.totalPrice?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kode Akses:</span>
                        <span className="font-mono font-bold text-blue-600">
                          {bookingData.accessCode}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Beranda
                  </Link>
                </Button>
                
                {paymentStatus === 'success' && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/pickup">
                      Ambil Barang
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutResult;
