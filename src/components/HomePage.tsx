import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import LockerSelection from './LockerSelection';
import QRScanner from './QRScanner';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const [selectedAction, setSelectedAction] = useState<'deposit' | 'pickup' | null>(null);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [userId, setUserId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleActionSelect = (action: 'deposit' | 'pickup') => {
    if (action === 'deposit') {
      setSelectedAction(action);
      setShowPhoneInput(true);
      setError('');
    } else {
      setSelectedAction(action);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!customerPhone.trim()) {
      setError('Nomor WhatsApp diperlukan');
      return;
    }
    
    if (customerPhone.length < 10) {
      setError('Nomor WhatsApp tidak valid');
      return;
    }
    
    setIsCreatingUser(true);
    setError('');
    
    try {
      console.log('Creating guest with phone:', customerPhone);
      const { databaseService } = await import('@/services/databaseService');
      
      const newUserId = await databaseService.createGuest({ phone: customerPhone });
      console.log('Guest created with ID:', newUserId);
      
      setUserId(newUserId);
      setShowPhoneInput(false);
    } catch (error) {
      console.error('Failed to create user:', error);
      setError('Gagal membuat ID pengguna. Periksa koneksi internet dan coba lagi.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleBackToHome = () => {
    setSelectedAction(null);
    setCustomerPhone('');
    setUserId('');
    setError('');
  };

  const handleClosePhoneInput = () => {
    setShowPhoneInput(false);
    setSelectedAction(null);
    setCustomerPhone('');
    setError('');
  };

  if (selectedAction === 'deposit' && userId && !showPhoneInput) {
    return <LockerSelection onBack={handleBackToHome} customerPhone={customerPhone} guestId={userId} />;
  }

  if (selectedAction === 'pickup') {
    return <QRScanner onBack={handleBackToHome} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section - Fully Responsive */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-12 lg:py-16">
        <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16 slide-in-top">
          <div className="float-animation mb-3 sm:mb-4 md:mb-6 lg:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 lg:mb-6 pulse-glow">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 lg:mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            FeeBox
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-2 sm:mb-3 md:mb-4 max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto px-2 sm:px-4">
            Sistem Penitipan Barang Terpercaya dan Aman
          </p>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 mb-4 sm:mb-6 md:mb-8 lg:mb-12 max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-2 sm:px-4">
            Titipkan barang berharga Anda dengan tenang. Teknologi keamanan terdepan untuk melindungi barang Anda 24/7.
          </p>
        </div>

        {/* Action Cards - Always responsive 2 per row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto slide-in-bottom px-2 sm:px-4">
          <Card className="card-hover cursor-pointer group" onClick={() => handleActionSelect('deposit')}>
            <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 mx-auto bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl font-bold mb-1 sm:mb-2 md:mb-3 lg:mb-4 text-gray-800">Titip Barang</h3>
              <p className="text-xs sm:text-xs md:text-sm lg:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4 lg:mb-6 leading-relaxed hidden sm:block">
                Simpan barang Anda dengan aman di loker yang tersedia. Pilih ukuran sesuai kebutuhan.
              </p>
              <p className="text-xs text-gray-600 mb-2 leading-relaxed sm:hidden">
                Simpan barang dengan aman
              </p>
              <Button className="w-full text-xs sm:text-sm md:text-base bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 py-1.5 sm:py-2 md:py-3">
                <span className="hidden sm:inline">Mulai Titip Barang</span>
                <span className="sm:hidden">Titip Barang</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover cursor-pointer group" onClick={() => handleActionSelect('pickup')}>
            <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 mx-auto bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm md:text-lg lg:text-xl xl:text-2xl font-bold mb-1 sm:mb-2 md:mb-3 lg:mb-4 text-gray-800">Ambil Barang</h3>
              <p className="text-xs sm:text-xs md:text-sm lg:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4 lg:mb-6 leading-relaxed hidden sm:block">
                Scan QR code atau masukkan kode akses untuk mengambil barang yang telah Anda titipkan.
              </p>
              <p className="text-xs text-gray-600 mb-2 leading-relaxed sm:hidden">
                Scan QR atau kode akses
              </p>
              <Button className="w-full text-xs sm:text-sm md:text-base bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 py-1.5 sm:py-2 md:py-3">
                <span className="hidden sm:inline">Ambil Barang</span>
                <span className="sm:hidden">Ambil Barang</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Phone Input Modal - Fully Responsive */}
      <Dialog open={showPhoneInput} onOpenChange={handleClosePhoneInput}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg sm:text-xl md:text-2xl font-bold">
              Masukkan Nomor WhatsApp
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 text-xs sm:text-sm md:text-base">
              Nomor WhatsApp akan digunakan untuk mengirim notifikasi dan QR code akses loker
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-xs sm:text-sm md:text-base">Nomor WhatsApp</Label>
              <Input
                id="customerPhone"
                placeholder="08xxxxxxxxxx"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setError('');
                }}
                required
                disabled={isCreatingUser}
                className="text-sm md:text-base py-2 md:py-3"
              />
              <p className="text-xs md:text-sm text-gray-500">
                Notifikasi dan QR code akan dikirim ke nomor ini
              </p>
              {error && (
                <p className="text-xs md:text-sm text-red-500">{error}</p>
              )}
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handlePhoneSubmit} 
                className="flex-1 text-xs sm:text-sm md:text-base py-2 md:py-3"
                disabled={!customerPhone.trim() || isCreatingUser}
              >
                {isCreatingUser ? 'Membuat ID Pengguna...' : 'Lanjutkan'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleClosePhoneInput}
                disabled={isCreatingUser}
                className="flex-1 text-xs sm:text-sm md:text-base py-2 md:py-3"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
