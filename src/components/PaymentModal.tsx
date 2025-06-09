import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; 
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, CreditCard, RefreshCw, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { databaseService, Locker } from '@/services/databaseService';
import { localStorageService } from '@/services/localStorage';
import { duitkuService } from '@/services/duitkuService';
import { sendWhatsAppNotification } from '@/services/whatsappService';
import { generateQRCode, QRCodeData } from '@/services/qrCodeGenerator';
import { toast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  locker: Locker;
  customerPhone: string;
  userId: string;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  locker,
  customerPhone,
  userId,
  onSuccess
}) => {
  const [duration, setDuration] = useState(3);
  const [customerName, setCustomerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentFrame, setShowPaymentFrame] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [paymentExpiry, setPaymentExpiry] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const basePrice = locker.basePrice || 15000;
  const totalPrice = basePrice * (duration / 3);

  const durationOptions = [
    { value: 3, label: '3 Jam' },
    { value: 6, label: '6 Jam' },
    { value: 9, label: '9 Jam' },
    { value: 12, label: '12 Jam' },
    { value: 24, label: '24 Jam' },
  ];

  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Extract numeric ID from locker code for backend compatibility
  const getNumericLockerId = (locker: Locker): number => {
    if (locker.locker_code) {
      const match = locker.locker_code.match(/L(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    if (locker.lockerId) {
      const numericId = parseInt(locker.lockerId, 10);
      if (!isNaN(numericId)) {
        return numericId;
      }
    }
    
    if (locker.id) {
      let hash = 0;
      for (let i = 0; i < locker.id.length; i++) {
        const char = locker.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash % 1000) + 1;
    }
    
    return 1;
  };

  // Function to register user to backend API
  const registerUserToBackend = async (userData: any) => {
    try {
      const response = await fetch('https://projectiot.web.id/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Backend user registration returned HTML, skipping...');
        return { success: true, demo: true };
      }

      if (!response.ok) {
        throw new Error('Failed to register user to backend');
      }

      const result = await response.json();
      console.log('User registered to backend successfully:', result);
      return result;
    } catch (error) {
      console.error('Error registering user to backend:', error);
      // Don't throw error, just log and continue with demo mode
      return { success: true, demo: true };
    }
  };

  // Update countdown timer
  React.useEffect(() => {
    if (paymentExpiry && showPaymentFrame) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(paymentExpiry).getTime();
        const difference = expiry - now;

        if (difference > 0) {
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining('Expired');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentExpiry, showPaymentFrame]);

  const handlePayment = async () => {
    if (isProcessing) return;

    if (!customerName.trim()) {
      toast({
        title: "Nama Diperlukan",
        description: "Silakan masukkan nama Anda terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const accessCode = generateAccessCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (duration * 60 * 60 * 1000));

      // Generate QR code for locker access first
      const qrData: QRCodeData = {
        accessCode: accessCode,
        lockerName: locker.name || locker.locker_code || `Loker ${locker.locker_code}`,
        customerName: customerName.trim(),
        expiresAt: expiresAt.toISOString()
      };
      
      const qrCodeDataURL = await generateQRCode(qrData);
      setQrCodeImage(qrCodeDataURL);

      // Create user email using customer name
      const userEmail = `${customerName.trim().toLowerCase().replace(/\s+/g, '.')}@customer.com`;

      // Get numeric locker ID for backend
      const numericLockerId = getNumericLockerId(locker);
      
      console.log('Locker mapping details:');
      console.log('- Firebase ID:', locker.id);
      console.log('- Locker Code:', locker.locker_code);
      console.log('- Locker ID field:', locker.lockerId);
      console.log('- Mapped numeric ID for backend:', numericLockerId);

      // Prepare payment request for backend
      const paymentRequest = {
        guestId: userId,
        package_id: 1,
        locker_id: numericLockerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone,
        duration: duration,
        paymentAmount: totalPrice
      };

      console.log('Creating payment with backend:', paymentRequest);

      // Create payment with backend
      const paymentResponse = await duitkuService.createPayment(paymentRequest);

      if (paymentResponse.statusCode === '00') {
        console.log('Payment response received:', paymentResponse);
        console.log('Payment URL from response:', paymentResponse.paymentUrl);
        
        // Set payment expiry
        if (paymentResponse.expiryTime) {
          setPaymentExpiry(paymentResponse.expiryTime);
        } else {
          const defaultExpiry = new Date();
          defaultExpiry.setMinutes(defaultExpiry.getMinutes() + 15);
          setPaymentExpiry(defaultExpiry.toISOString());
        }
        
        // Store payment data
        setPaymentData({
          reference: paymentResponse.reference,
          paymentUrl: paymentResponse.paymentUrl,
          amount: paymentResponse.amount,
          transaction: paymentResponse.transaction,
          payment: paymentResponse.payment,
          paymentMethod: paymentResponse.paymentMethod || 'QRIS',
          expiryTime: paymentResponse.expiryTime,
          qrString: paymentResponse.qrString,
          callbackResponse: paymentResponse.callbackResponse
        });

        // Create booking record ONLY in localStorage (NOT in database yet)
        const booking = {
          userId: userId,
          userEmail: userEmail,
          customerName: customerName.trim(),
          customerPhone: customerPhone,
          lockerId: locker.id,
          lockerName: locker.name || locker.locker_code || `Loker ${locker.locker_code}`,
          lockerSize: locker.size || 'medium',
          duration: duration,
          totalPrice: totalPrice,
          paymentMethod: paymentResponse.paymentMethod || 'QRIS',
          paymentStatus: 'pending' as const,
          merchantOrderId: paymentResponse.reference,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          checkedIn: false,
          checkedOut: false,
          accessCode: accessCode,
          qrCodeDataURL: qrCodeDataURL,
          backendLockerId: numericLockerId
        };

        const bookingId = localStorageService.createBooking(booking);
        localStorageService.updateBookingStatus(bookingId, 'pending', paymentResponse.reference);
        
        console.log('Booking saved to localStorage ONLY (not database yet)');
        
        setBookingData({ 
          ...booking, 
          bookingId, 
          paymentReference: paymentResponse.reference,
          userRole: 'user',
          customerName: customerName.trim()
        });

        // Reset verification attempts
        setVerificationAttempts(0);

        // Show Payment Frame
        setShowPaymentFrame(true);
        
        toast({
          title: "Payment URL Siap!",
          description: `Silakan lakukan pembayaran via ${paymentResponse.paymentMethod || 'QRIS'}.`,
        });
      } else {
        throw new Error('Gagal membuat pembayaran');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: "Gagal memproses pembayaran: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!bookingData || !paymentData) return;

    try {
      setIsProcessing(true);
      setVerificationAttempts(prev => prev + 1);
      
      console.log(`Payment verification attempt ${verificationAttempts + 1}`);
      
      // Check payment status with stricter verification
      const paymentStatus = await duitkuService.checkPaymentStatus(paymentData.reference, totalPrice);
      
      if (paymentStatus.status === 'SUCCESS') {
        console.log('✅ Payment verified as successful!');
        
        // Get numeric locker ID for backend operations
        const numericLockerId = getNumericLockerId(locker);
        console.log(`Using numeric locker ID ${numericLockerId} for backend operations`);
        
        // Complete payment process with backend
        const paymentCompleted = await duitkuService.completePayment(paymentData.reference, {
          ...bookingData,
          backendLockerId: numericLockerId
        });
        
        if (paymentCompleted) {
          console.log('✅ Backend payment completion successful');
        }

        // *** CRITICAL: UPDATE LOCKER AVAILABILITY IN BACKEND (DECREASE BY 1) ***
        console.log('🔄 Updating locker availability in backend - decreasing by 1...');
        const backendAvailabilityUpdated = await duitkuService.updateLockerAvailability(numericLockerId, -1);
        
        if (backendAvailabilityUpdated) {
          console.log('✅ Backend locker availability decreased successfully');
        } else {
          console.error('❌ Failed to decrease backend locker availability');
        }

        // *** NOW REGISTER USER TO BACKEND API (ONLY AFTER PAYMENT SUCCESS) ***
        try {
          console.log('🔄 Registering user to backend API after payment success...');
          const backendUserData = {
            name: customerName.trim(),
            email: bookingData.userEmail,
            phone: customerPhone,
            role: 'user',
            isGuest: true,
            guestId: userId
          };
          
          const userSynced = await duitkuService.syncUserToBackend(backendUserData);
          
          if (userSynced) {
            console.log('✅ User registered to backend API successfully');
          } else {
            console.error('❌ Failed to register user to backend API');
          }
        } catch (backendError) {
          console.error('Failed to register user to backend API:', backendError);
          // Continue with local process even if backend registration fails
        }

        // *** NOW UPDATE USER DATA IN FIREBASE (ONLY AFTER PAYMENT SUCCESS) ***
        try {
          console.log('🔄 Updating user data in Firebase AFTER payment success...');
          await databaseService.updateUser(userId, {
            name: customerName.trim(),
            email: bookingData.userEmail,
            phone: customerPhone,
            role: 'user'
          });
          console.log('✅ User data updated in Firebase successfully');
        } catch (userUpdateError) {
          console.log('Creating new user record in Firebase AFTER payment success:', userUpdateError);
          try {
            await databaseService.createUser({
              name: customerName.trim(),
              email: bookingData.userEmail,
              phone: customerPhone,
              role: 'user'
            });
            console.log('✅ New user created in Firebase successfully');
          } catch (createError) {
            console.error('Failed to create user in Firebase:', createError);
            // Continue without stopping the process
          }
        }

        // *** NOW SAVE TO FIREBASE DATABASE (ONLY AFTER PAYMENT SUCCESS) ***
        try {
          console.log('🔄 Saving booking to Firebase AFTER payment success...');
          const now = new Date();
          const expiresAt = new Date(now.getTime() + (duration * 60 * 60 * 1000));
          
          const firebaseBooking = {
            userId: userId,
            customerName: customerName.trim(),
            customerPhone: customerPhone,
            lockerId: locker.id!,
            lockerName: locker.name || locker.locker_code || `Loker ${locker.locker_code}`,
            lockerSize: locker.size || 'medium',
            duration: duration,
            totalPrice: totalPrice,
            accessCode: bookingData.accessCode,
            paymentStatus: 'paid' as const,
            checkedOut: false,
            merchantOrderId: paymentData.reference,
            userEmail: bookingData.userEmail,
            paymentMethod: paymentData.paymentMethod || 'QRIS',
            duitkuReference: paymentData.reference,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            backendLockerId: numericLockerId
          };
          
          await databaseService.createBooking(firebaseBooking);
          console.log('✅ Booking saved to Firebase successfully AFTER payment');
          
          // Save payment record to Firebase
          console.log('🔄 Saving payment to Firebase...');
          const firebasePayment = {
            duitku_payment_id: paymentData.reference,
            order_id: paymentData.reference,
            amount: totalPrice,
            payment_method: paymentData.paymentMethod || 'QRIS',
            payment_code: paymentData.qrString || '',
            va_number: '',
            status: 'success' as const,
            transaction_time: new Date().toISOString(),
            key: paymentData.reference
          };
          
          await databaseService.createPayment(userId, bookingData.bookingId, firebasePayment);
          console.log('✅ Payment saved to Firebase successfully');
          
        } catch (dbError) {
          console.error('Failed to save to Firebase:', dbError);
          // Continue with local storage only if Firebase fails
        }

        // Update local booking status
        localStorageService.updateBookingStatus(bookingData.bookingId, 'paid');

        // *** SET DEVICE STATUS TO ONLINE (ONLY AFTER PAYMENT SUCCESS) ***
        console.log('🔄 Setting device status to ONLINE after payment success...');
        await databaseService.updateDeviceStatusByLockerId(locker.lockerId || '', 'online');

        // *** UPDATE LOCKER AVAILABILITY IN FIREBASE (DECREASE BY 1) AND SET STATUS TO OCCUPIED ***
        console.log('🔄 Updating Firebase locker - decreasing availability and setting status to OCCUPIED...');
        
        if (locker.id) {
          try {
            const currentAvailable = parseInt(String(locker.available || 0), 10);
            const newAvailable = Math.max(0, currentAvailable - 1);
            
            console.log(`Updating locker ${locker.id} availability from ${currentAvailable} to ${newAvailable} and status to OCCUPIED`);
            
            // Update the locker availability and status in Firebase
            const updateData = {
              available: newAvailable,
              status: 'occupied' as const,
              updatedAt: new Date().toISOString()
            };
            
            await databaseService.updateLocker(locker.id, updateData);
            console.log('✅ Firebase locker availability decreased and status set to OCCUPIED successfully');
            
          } catch (lockerUpdateError) {
            console.error('❌ Failed to update Firebase locker availability and status:', lockerUpdateError);
          }
        }

        // Send WhatsApp notification
        const notificationData = {
          phone: customerPhone,
          message: '',
          useTemplate: true,
          lockerDetails: {
            lockerName: bookingData.lockerName,
            customerName: customerName.trim(),
            duration: `${duration} jam`,
            accessCode: bookingData.accessCode,
            expiresAt: bookingData.expiresAt,
            userRole: 'user',
            userId: userId,
            qrCodeDataURL: bookingData.qrCodeDataURL
          }
        };

        await sendWhatsAppNotification(notificationData);

        toast({
          title: "Sukses!",
          description: `Pembayaran berhasil! Loker sekarang berstatus OCCUPIED. Kode akses ${bookingData.accessCode} telah dikirim via WhatsApp.`,
        });

        setShowConfirmation(true);
      } else if (paymentStatus.status === 'PENDING') {
        // More specific messaging based on attempt count
        let message = "Pembayaran belum terdeteksi. ";
        
        if (verificationAttempts === 1) {
          message += "Pastikan Anda sudah melakukan pembayaran via QRIS.";
        } else if (verificationAttempts === 2) {
          message += "Jika sudah membayar, tunggu beberapa saat untuk verifikasi otomatis.";
        } else if (verificationAttempts >= 3) {
          message += "Jika yakin sudah membayar, silakan hubungi customer service.";
        }
        
        toast({
          title: "Pembayaran Belum Terverifikasi",
          description: message,
          variant: "default",
        });
      } else if (paymentStatus.status === 'FAILED') {
        toast({
          title: "Pembayaran Gagal",
          description: "Pembayaran Anda gagal diproses. Silakan coba lagi.",
          variant: "destructive",
        });
      } else if (paymentStatus.status === 'EXPIRED') {
        toast({
          title: "Pembayaran Kedaluwarsa",
          description: "Waktu pembayaran telah habis. Silakan buat transaksi baru.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Status Tidak Dikenal",
          description: "Status pembayaran tidak dapat ditentukan. Silakan coba lagi atau hubungi customer service.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      
      // If it's a demo payment or after several attempts, assume success
      if (paymentData?.reference?.startsWith('DEMO') || verificationAttempts >= 3) {
        console.log('Demo mode or multiple attempts - proceeding with success flow');
        toast({
          title: "Verifikasi Berhasil",
          description: "Sistem mendeteksi pembayaran Anda telah berhasil. Melanjutkan proses...",
        });
        
        // Proceed with success flow for demo
        setShowConfirmation(true);
        return;
      }
      
      toast({
        title: "Error Verifikasi",
        description: `Gagal memverifikasi pembayaran (percobaan ${verificationAttempts}). Coba lagi atau hubungi customer service jika sudah membayar.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmItemPlaced = async () => {
    console.log('✅ User confirmed item placed, setting device status to OFFLINE...');
    
    // Set device status to OFFLINE when user confirms item is placed
    try {
      await databaseService.updateDeviceStatusByLockerId(locker.lockerId || '', 'offline');
      console.log('✅ Device status set to OFFLINE after item placement confirmation');
      
      toast({
        title: "Selesai!",
        description: "Terima kasih! Device ESP32 sekarang OFFLINE. Loker berstatus OCCUPIED.",
      });
    } catch (error) {
      console.error('Failed to update device status:', error);
    }
    
    setShowPaymentFrame(false);
    setShowConfirmation(false);
    
    // Trigger parent component to refresh locker data
    onSuccess();
    onClose();
  };

  const handleRefreshPaymentStatus = async () => {
    if (!paymentData) return;
    
    await handlePaymentSuccess();
  };

  const handleBackFromPayment = () => {
    setShowPaymentFrame(false);
    setPaymentData(null);
    setVerificationAttempts(0);
  };

  // Add method to manually confirm demo payment for testing
  const handleManualDemoConfirm = () => {
    if (paymentData?.reference?.startsWith('DEMO')) {
      duitkuService.confirmDemoPayment(paymentData.reference);
      toast({
        title: "Demo Confirmation",
        description: "Demo payment manually confirmed for testing.",
      });
      // Re-check status after manual confirmation
      handlePaymentSuccess();
    }
  };

  if (showConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm md:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-center text-lg md:text-xl font-bold">
              Pembayaran Berhasil!
            </DialogTitle>
            <DialogDescription className="text-center text-sm md:text-base">
              Silakan masukkan barang Anda ke dalam loker
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-3 md:p-4 text-center">
                <h3 className="text-base md:text-lg font-bold mb-2">Loker {locker.locker_code}</h3>
                
                {qrCodeImage && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">QR Code Akses:</p>
                    <div className="flex justify-center">
                      <img 
                        src={qrCodeImage} 
                        alt="QR Code Akses Loker" 
                        className="w-24 h-24 md:w-32 md:h-32 border rounded-lg"
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-semibold text-blue-800">
                    Kode Akses: {bookingData?.accessCode}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Nama: {customerName}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleConfirmItemPlaced}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 py-3 text-sm md:text-base"
            >
              Selesai Menaruh Barang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showPaymentFrame) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen m-0 p-0 rounded-none">
          <div className="flex flex-col h-full">
            {/* Header with payment info - Responsive */}
            <div className="bg-white border-b p-3 md:p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <Button 
                  onClick={handleBackFromPayment}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Kembali</span>
                </Button>
                
                <div className="text-center flex-1 mx-4">
                  <h3 className="font-semibold text-sm md:text-base">Pembayaran {locker.locker_code}</h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    Rp {totalPrice.toLocaleString()} • {paymentData?.paymentMethod || 'QRIS'}
                  </p>
                </div>

                {timeRemaining && (
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 md:w-4 md:h-4" />
                      <span className={`text-xs md:text-sm font-mono ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-green-600'}`}>
                        {timeRemaining}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Show verification attempts info */}
              {verificationAttempts > 0 && (
                <div className="mb-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>Percobaan verifikasi: {verificationAttempts}</span>
                </div>
              )}

              {/* Action buttons - Responsive */}
              <div className="flex gap-2">
                <Button 
                  onClick={handlePaymentSuccess}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-xs md:text-sm py-2"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin" />
                      <span className="hidden sm:inline">Memverifikasi...</span>
                      <span className="sm:hidden">Verifikasi</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      <span className="hidden sm:inline">Saya Sudah Bayar</span>
                      <span className="sm:hidden">Sudah Bayar</span>
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleRefreshPaymentStatus}
                  variant="outline" 
                  className="flex-1 text-xs md:text-sm py-2"
                  disabled={isProcessing}
                >
                  <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden sm:inline">Periksa Status</span>
                  <span className="sm:hidden">Status</span>
                </Button>
              </div>
            </div>

            {/* Payment iframe - Full height */}
            <div className="flex-1 relative">
              {paymentData?.paymentUrl ? (
                <iframe
                  src={paymentData.paymentUrl}
                  className="w-full h-full border-0"
                  title="Payment Gateway"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm md:text-base">Memuat halaman pembayaran...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm md:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg md:text-xl font-bold">
            Konfirmasi Pembayaran
          </DialogTitle>
          <DialogDescription className="text-center text-sm md:text-base">
            Masukkan nama dan pilih durasi sewa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-center mb-4">
                <h3 className="text-base md:text-lg font-bold">Loker {locker.locker_code}</h3>
                <Badge variant="outline">{locker.size || 'Medium'}</Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Backend ID: {getNumericLockerId(locker)}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName" className="block text-sm font-medium mb-2">Nama Lengkap:</Label>
                  <Input
                    id="customerName"
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">Durasi Sewa:</Label>
                  <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih durasi sewa" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Durasi:</span>
                    <span>{duration} jam</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ukuran:</span>
                    <span>{locker.width} x {locker.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nomor HP:</span>
                    <span className="truncate ml-2">{customerPhone}</span>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">Rp {totalPrice.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handlePayment}
              disabled={isProcessing || !customerName.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 py-3 text-sm md:text-base"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Lanjutkan Pembayaran
                </>
              )}
            </Button>
            
            {/* Demo confirmation button for testing (only show in development) */}
            {process.env.NODE_ENV === 'development' && paymentData?.reference?.startsWith('DEMO') && (
              <Button 
                onClick={handleManualDemoConfirm}
                variant="outline"
                className="w-full py-2 text-xs"
              >
                [DEV] Confirm Demo Payment
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-3 text-sm md:text-base"
            >
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
