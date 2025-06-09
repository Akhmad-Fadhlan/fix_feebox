import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Keyboard, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { localStorageService, LocalBooking } from '@/services/localStorage';
import { databaseService } from '@/services/databaseService';
import { lockerRetrievalService } from '@/services/lockerRetrievalService';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onBack: () => void;
}

const QRScannerComponent: React.FC<QRScannerProps> = ({ onBack }) => {
  const [inputMethod, setInputMethod] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [booking, setBooking] = useState<LocalBooking | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner when component unmounts
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setCameraError('');
      setError('');

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      // Check if QR Scanner is supported
      if (!QrScanner.hasCamera()) {
        throw new Error('No camera found on this device');
      }

      // Stop existing scanner if any
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }

      // Create new QR scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          handleQRResult(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera if available
        }
      );

      await qrScannerRef.current.start();
      console.log('QR Scanner started successfully');
      
      toast({
        title: "Kamera Aktif",
        description: "Arahkan kamera ke QR code untuk memindai",
      });

    } catch (error) {
      console.error('Camera error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengakses kamera';
      setCameraError(errorMessage);
      setIsScanning(false);
      
      toast({
        title: "Error Kamera",
        description: errorMessage + ". Gunakan input manual sebagai alternatif.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    console.log('QR Scanner stopped');
  };

  const handleQRResult = async (qrData: string) => {
    console.log('Processing QR result:', qrData);
    
    try {
      // Stop scanning to prevent multiple scans
      stopCamera();
      
      let accessCode = '';
      
      // Try to parse as JSON first (for structured QR codes)
      try {
        const parsedData = JSON.parse(qrData);
        if (parsedData.type === 'LOCKER_ACCESS' && parsedData.accessCode) {
          accessCode = parsedData.accessCode;
          console.log('Extracted access code from structured QR:', accessCode);
        }
      } catch (parseError) {
        // If not JSON, treat as plain access code
        accessCode = qrData.trim().toUpperCase();
        console.log('Using QR data as plain access code:', accessCode);
      }
      
      if (!accessCode) {
        throw new Error('QR code tidak mengandung kode akses yang valid');
      }
      
      setScanResult(accessCode);
      await validateAccessCode(accessCode);
      
    } catch (error) {
      console.error('QR processing error:', error);
      setError(error instanceof Error ? error.message : 'Gagal memproses QR code');
      
      toast({
        title: "QR Code Tidak Valid",
        description: error instanceof Error ? error.message : 'Gagal memproses QR code',
        variant: "destructive",
      });
      
      // Restart scanning after error
      setTimeout(() => {
        if (inputMethod === 'camera') {
          startCamera();
        }
      }, 2000);
    }
  };

  const validateAccessCode = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Validating access code:', code);
      
      // Get all bookings for debugging
      const allBookings = localStorageService.getAllBookings();
      console.log('All bookings in localStorage:', allBookings);
      
      // Normalize the input code
      const normalizedCode = code.trim().toUpperCase();
      console.log('Normalized access code:', normalizedCode);
      
      // Try different search methods
      let foundBooking: LocalBooking | null = null;
      
      // 1. Exact match
      foundBooking = allBookings.find(b => 
        b.accessCode && b.accessCode.toUpperCase() === normalizedCode
      ) || null;
      
      if (!foundBooking) {
        // 2. Partial match (in case of extra characters)
        foundBooking = allBookings.find(b => 
          b.accessCode && (
            b.accessCode.toUpperCase().includes(normalizedCode) ||
            normalizedCode.includes(b.accessCode.toUpperCase())
          )
        ) || null;
      }
      
      console.log('Found booking:', foundBooking);
      
      if (!foundBooking) {
        // Try to get from database as fallback
        console.log('Trying to find booking in Firebase database...');
        const allFirebaseBookings = await databaseService.getBookings();
        console.log('Firebase bookings:', allFirebaseBookings);
        
        const firebaseBooking = allFirebaseBookings.find(b => 
          b.accessCode && b.accessCode.toUpperCase() === normalizedCode
        ) || null;
        
        if (firebaseBooking && firebaseBooking.id) {
          console.log('Found booking in Firebase:', firebaseBooking);
          // Convert Firebase booking to LocalBooking format
          foundBooking = {
            id: firebaseBooking.id,
            userId: firebaseBooking.userId,
            userEmail: `${firebaseBooking.userId}@guest.com`,
            customerName: firebaseBooking.customerName,
            customerPhone: firebaseBooking.customerPhone,
            lockerId: firebaseBooking.lockerId,
            lockerName: firebaseBooking.lockerName,
            lockerSize: firebaseBooking.lockerSize,
            duration: firebaseBooking.duration,
            totalPrice: firebaseBooking.totalPrice,
            paymentMethod: firebaseBooking.paymentMethod || 'QRIS',
            paymentStatus: firebaseBooking.paymentStatus,
            merchantOrderId: firebaseBooking.merchantOrderId || '',
            duitkuReference: firebaseBooking.duitkuReference,
            createdAt: firebaseBooking.createdAt,
            expiresAt: firebaseBooking.expiresAt,
            checkedIn: false,
            checkedOut: firebaseBooking.checkedOut || false,
            checkedOutAt: firebaseBooking.checkedOutAt,
            accessCode: firebaseBooking.accessCode,
            qrCodeDataURL: undefined
          };
        }
      }
      
      if (!foundBooking) {
        throw new Error(`Kode akses "${normalizedCode}" tidak ditemukan. Pastikan kode akses benar dan booking sudah dibayar.`);
      }
      
      // Validate booking status
      if (foundBooking.paymentStatus !== 'paid') {
        throw new Error(`Booking belum dibayar. Status: ${foundBooking.paymentStatus}`);
      }
      
      if (foundBooking.checkedOut) {
        throw new Error('Barang sudah pernah diambil sebelumnya');
      }
      
      // Check expiration
      const now = new Date();
      const expiryDate = new Date(foundBooking.expiresAt);
      
      console.log('Current time:', now.toISOString());
      console.log('Booking expires at:', foundBooking.expiresAt);
      console.log('Is expired?', now > expiryDate);
      
      if (now > expiryDate) {
        throw new Error(`Booking sudah kadaluarsa pada ${expiryDate.toLocaleString('id-ID')}`);
      }
      
      // Success - booking is valid
      setBooking(foundBooking);
      setShowSuccessModal(true);
      
      toast({
        title: "Kode Akses Valid!",
        description: `Loker ${foundBooking.lockerName} siap dibuka`,
      });
      
    } catch (error) {
      console.error('Access code validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memvalidasi kode akses';
      setError(errorMessage);
      
      toast({
        title: "Kode Akses Tidak Valid",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim()) {
      setError('Masukkan kode akses');
      return;
    }
    
    await validateAccessCode(manualCode);
  };

  const handleConfirmPickup = async () => {
    if (!booking) return;
    
    try {
      setLoading(true);
      
      console.log('🔄 Starting item retrieval process...');
      
      // Use the new method to create retrieval data directly from the booking object
      const retrievalData = await lockerRetrievalService.getRetrievalDataFromLocalBooking(booking);
      
      if (!retrievalData) {
        throw new Error('Gagal mendapatkan data retrieval');
      }
      
      // Handle the complete retrieval process
      const success = await lockerRetrievalService.handleItemRetrieval(retrievalData);
      
      if (!success) {
        throw new Error('Gagal memproses pengambilan barang');
      }
      
      // Update booking in localStorage
      const updatedBooking = {
        ...booking,
        checkedOut: true
      };
      
      const allBookings = localStorageService.getAllBookings();
      const updatedBookings = allBookings.map(b => 
        b.id === booking.id ? updatedBooking : b
      );
      localStorage.setItem('feebox_bookings', JSON.stringify(updatedBookings));
      
      toast({
        title: "Berhasil!",
        description: "Barang berhasil diambil. Loker sekarang tersedia kembali.",
      });
      
      setShowSuccessModal(false);
      
      // Simulate locker opening
      setTimeout(() => {
        toast({
          title: "Loker Terbuka",
          description: "Silakan ambil barang Anda dan tutup loker kembali.",
        });
      }, 1000);
      
      // Go back to home after successful pickup
      setTimeout(() => {
        onBack();
      }, 3000);
      
    } catch (error) {
      console.error('Pickup confirmation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengkonfirmasi pengambilan barang",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchToManual = () => {
    stopCamera();
    setInputMethod('manual');
    setError('');
    setCameraError('');
  };

  const switchToCamera = () => {
    setInputMethod('camera');
    setManualCode('');
    setError('');
    setCameraError('');
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4">
        {/* Back Button - Responsive */}
        <Button onClick={onBack} variant="outline" className="mb-4 md:mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>

        <div className="max-w-2xl mx-auto">
          {/* Header Card - Responsive */}
          <Card className="mb-4 md:mb-6">
            <CardHeader className="text-center px-4 md:px-6 py-4 md:py-8">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ambil Barang
              </CardTitle>
              <p className="text-gray-600 mt-2 text-sm md:text-base">
                Scan QR code atau masukkan kode akses untuk mengambil barang
              </p>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              {/* Method Selection - Responsive */}
              <div className="flex gap-2 md:gap-4 mb-4 md:mb-6">
                <Button
                  onClick={switchToCamera}
                  variant={inputMethod === 'camera' ? 'default' : 'outline'}
                  className="flex-1 text-sm md:text-base py-2 md:py-3"
                  disabled={loading}
                >
                  <Camera className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Scan QR Code</span>
                  <span className="sm:hidden">Scan QR</span>
                </Button>
                <Button
                  onClick={switchToManual}
                  variant={inputMethod === 'manual' ? 'default' : 'outline'}
                  className="flex-1 text-sm md:text-base py-2 md:py-3"
                  disabled={loading}
                >
                  <Keyboard className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Input Manual</span>
                  <span className="sm:hidden">Manual</span>
                </Button>
              </div>

              {/* Camera Scanner - Responsive */}
              {inputMethod === 'camera' && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-center text-white px-4">
                          <Camera className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-base md:text-lg mb-4">Kamera belum aktif</p>
                          <Button onClick={startCamera} disabled={loading} size="sm" className="text-sm">
                            {loading ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Memulai...
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                Mulai Scan
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {isScanning && (
                      <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none">
                        <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 text-center">
                          <p className="text-white bg-black bg-opacity-50 px-2 md:px-3 py-1 rounded text-sm md:text-base">
                            Arahkan kamera ke QR code
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-red-700 text-sm md:text-base break-words">{cameraError}</p>
                          <Button 
                            onClick={switchToManual} 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 text-xs md:text-sm"
                          >
                            Gunakan Input Manual
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <div className="text-center">
                      <Button onClick={stopCamera} variant="outline" size="sm">
                        Berhenti Scan
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Input - Responsive */}
              {inputMethod === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="accessCode" className="text-sm md:text-base">Kode Akses</Label>
                    <Input
                      id="accessCode"
                      type="text"
                      placeholder="Masukkan kode akses (contoh: ABC123)"
                      value={manualCode}
                      onChange={(e) => {
                        setManualCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      className="text-center font-mono text-base md:text-lg py-3 md:py-4"
                      disabled={loading}
                      maxLength={8}
                    />
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                      Masukkan 4-8 karakter kode akses yang Anda terima
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full py-3 md:py-4 text-sm md:text-base" 
                    disabled={loading || !manualCode.trim()}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Memvalidasi...
                      </>
                    ) : (
                      'Validasi Kode Akses'
                    )}
                  </Button>
                </form>
              )}

              {/* Error Display - Responsive */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm md:text-base break-words">{error}</p>
                  </div>
                </div>
              )}

              {/* Scan Result Display - Responsive */}
              {scanResult && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-700 text-sm md:text-base break-words">
                      QR Code terdeteksi: <span className="font-mono font-bold">{scanResult}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions - Responsive */}
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Petunjuk Penggunaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 md:px-6">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">1</span>
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  <strong>Scan QR Code:</strong> Gunakan kamera untuk memindai QR code yang Anda terima via WhatsApp
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">2</span>
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  <strong>Input Manual:</strong> Atau masukkan kode akses 6 digit secara manual
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-bold">3</span>
                </div>
                <p className="text-gray-600 text-sm md:text-base">
                  <strong>Konfirmasi:</strong> Sistem akan memvalidasi dan membuka loker secara otomatis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal - Responsive */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-sm md:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-center text-xl md:text-2xl font-bold text-green-600">
              Kode Akses Valid!
            </DialogTitle>
          </DialogHeader>
          
          {booking && (
            <div className="space-y-4 md:space-y-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 md:w-16 md:h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 text-sm md:text-base">
                  Barang Anda siap diambil dari loker berikut:
                </p>
              </div>

              <Card>
                <CardContent className="p-3 md:p-4">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Loker:</span>
                      <span className="font-semibold text-sm md:text-base">{booking.lockerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Nama:</span>
                      <span className="font-semibold text-sm md:text-base truncate ml-2">{booking.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Kode Akses:</span>
                      <span className="font-mono font-bold text-blue-600 text-sm md:text-base">{booking.accessCode}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600 text-sm">Berlaku Hingga:</span>
                      <span className="text-xs md:text-sm text-right ml-2">{new Date(booking.expiresAt).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 md:space-y-3">
                <Button 
                  onClick={handleConfirmPickup}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 py-3 md:py-4 text-sm md:text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Membuka Loker...
                    </>
                  ) : (
                    'Konfirmasi & Buka Loker'
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3 md:py-4 text-sm md:text-base"
                  disabled={loading}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRScannerComponent;
