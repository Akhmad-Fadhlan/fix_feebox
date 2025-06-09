import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PaymentModal from './PaymentModal';
import ResponsiveContainer from './ResponsiveContainer';
import ResponsiveGrid from './ResponsiveGrid';
import { databaseService, Locker, BoxCategory } from '@/services/databaseService';
import { toast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';

interface LockerSelectionProps {
  onBack: () => void;
  customerPhone: string;
  guestId: string;
}

const LockerSelection: React.FC<LockerSelectionProps> = ({ onBack, customerPhone, guestId }) => {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [boxCategories, setBoxCategories] = useState<BoxCategory[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key to force re-render
  
  const { isMobile, isTablet, getResponsiveValue } = useResponsive();

  useEffect(() => {
    loadData();
  }, [refreshKey]); // Add refreshKey as dependency

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading lockers and categories data...');
      
      const [lockersData, categoriesData] = await Promise.all([
        databaseService.getLockers(),
        databaseService.getBoxCategories()
      ]);
      
      console.log('Loaded lockers with availability:', lockersData.map(l => ({ 
        code: l.locker_code, 
        available: l.available,
        status: l.status 
      })));
      console.log('Loaded categories:', categoriesData);
      
      // Debug: Check category matching
      lockersData.forEach(locker => {
        const category = categoriesData.find(cat => cat.id === locker.box_category_id);
        console.log(`Locker ${locker.locker_code}: category_id="${locker.box_category_id}" -> category found:`, category ? 'YES' : 'NO');
        if (!category) {
          console.log('Available category IDs:', categoriesData.map(c => c.id));
        }
      });
      
      setLockers(lockersData);
      setBoxCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data loker. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLockerSelect = async (locker: Locker) => {
    console.log('Selecting locker:', locker);
    
    // Refresh data before selecting to ensure latest status
    await loadData();
    
    // Find the updated locker data
    const updatedLocker = lockers.find(l => l.id === locker.id);
    if (!updatedLocker) {
      toast({
        title: "Error",
        description: "Loker tidak ditemukan. Silakan refresh halaman.",
        variant: "destructive",
      });
      return;
    }
    
    const availableCount = parseInt(String(updatedLocker.available || 0), 10);
    
    if (updatedLocker.status === 'available' && availableCount > 0) {
      console.log('Locker is available, opening payment modal');
      setSelectedLocker(updatedLocker);
      setShowPaymentModal(true);
    } else if (availableCount === 0) {
      toast({
        title: "Loker Tidak Tersedia",
        description: "Maaf, loker ini sudah habis. Silakan pilih loker lain.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Loker Tidak Tersedia",
        description: "Maaf, loker ini sedang tidak tersedia. Silakan pilih loker lain.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment successful, refreshing data...');
    
    setShowPaymentModal(false);
    setSelectedLocker(null);
    
    // Force refresh by incrementing refresh key
    setRefreshKey(prev => prev + 1);
    
    toast({
      title: "Sukses",
      description: "Pembayaran berhasil! Loker telah dipesan dan ketersediaan diperbarui.",
    });
    
    // Navigate back to home after successful booking
    setTimeout(() => {
      onBack();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    console.log('Payment cancelled');
    setShowPaymentModal(false);
    setSelectedLocker(null);
  };

  const getBoxCategory = (categoryId: string) => {
    return boxCategories.find(cat => cat.id === categoryId);
  };

  const isLockerAvailable = (locker: Locker) => {
    const availableCount = parseInt(String(locker.available || 0), 10);
    return locker.status === 'available' && availableCount > 0;
  };

  const getLockerStatus = (locker: Locker) => {
    const availableCount = parseInt(String(locker.available || 0), 10);
    
    if (availableCount === 0) {
      return { variant: "destructive" as const, text: "Habis" };
    } else if (locker.status === 'available') {
      return { variant: "default" as const, text: `Tersedia (${availableCount})` };
    } else if (locker.status === 'occupied') {
      return { variant: "destructive" as const, text: "Terisi" };
    } else {
      return { variant: "destructive" as const, text: "Maintenance" };
    }
  };

  // Modified grouping logic to handle missing categories
  const groupedLockers = lockers.reduce((acc, locker) => {
    const category = getBoxCategory(locker.box_category_id);
    
    // If no category found, create a fallback category
    if (!category) {
      console.warn(`No category found for locker ${locker.locker_code} with category_id: ${locker.box_category_id}`);
      
      // Create a fallback category name based on locker dimensions or use default
      const fallbackCategoryType = `${locker.width}x${locker.height}` || 'uncategorized';
      
      if (!acc[fallbackCategoryType]) {
        acc[fallbackCategoryType] = [];
      }
      acc[fallbackCategoryType].push(locker);
      return acc;
    }
    
    if (!acc[category.type]) {
      acc[category.type] = [];
    }
    acc[category.type].push(locker);
    return acc;
  }, {} as Record<string, Locker[]>);

  console.log('Grouped lockers:', groupedLockers);

  // Responsive grid configuration
  const gridCols = getResponsiveValue({
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  }, 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <ResponsiveContainer className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-responsive">Memuat data loker...</p>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 section-spacing">
      <ResponsiveContainer size="xl">
        <div className="content-spacing">
          <div className="fade-in">
            <div className="flex justify-between items-center mb-4">
              <Button 
                onClick={onBack} 
                variant="outline" 
                className="btn-responsive"
              >
                ← Kembali
              </Button>
              
              <Button 
                onClick={() => setRefreshKey(prev => prev + 1)} 
                variant="outline" 
                className="btn-responsive"
                disabled={loading}
              >
                🔄 Refresh
              </Button>
            </div>
            
            <div className="text-center space-y-4">
              <h1 className="heading-responsive bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pilih Loker
              </h1>
              
              <div className="space-y-2">
                <p className="text-responsive text-gray-600">
                  User ID: <span className="font-mono font-bold text-sm">{guestId}</span>
                </p>
                <p className="text-responsive text-gray-600">
                  Pilih ukuran loker sesuai dengan kebutuhan Anda
                </p>
              </div>
            </div>
          </div>

          <div className="content-spacing">
            {Object.entries(groupedLockers).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-4">Belum ada loker tersedia saat ini.</p>
                
                <Button 
                  onClick={() => setRefreshKey(prev => prev + 1)} 
                  className="mt-4"
                  disabled={loading}
                >
                  {loading ? 'Memuat...' : 'Coba Lagi'}
                </Button>
              </div>
            ) : (
              Object.entries(groupedLockers).map(([categoryType, categoryLockers]) => {
                // Try to find the actual category, or create fallback info
                const category = boxCategories.find(cat => cat.type === categoryType);
                const categoryName = category ? category.name : `Kategori ${categoryType}`;
                const categoryDimensions = category ? `${category.width} x ${category.height}` : categoryType;

                return (
                  <div key={categoryType} className="space-y-6 slide-in-bottom">
                    <h2 className="subheading-responsive text-gray-800 text-center">
                      {categoryName} ({categoryDimensions})
                    </h2>
                    
                    <ResponsiveGrid
                      cols={{
                        default: 1,
                        sm: isMobile ? 1 : 2,
                        md: 2,
                        lg: 3,
                        xl: 4
                      }}
                      gap={isMobile ? 'sm' : 'md'}
                    >
                      {categoryLockers.map((locker) => {
                        const isAvailable = isLockerAvailable(locker);
                        const status = getLockerStatus(locker);
                        
                        return (
                          <Card 
                            key={locker.id} 
                            className={`card-responsive card-hover cursor-pointer transition-all duration-300 ${
                              isAvailable ? 'hover:scale-105 hover:shadow-lg' : 'opacity-50 cursor-not-allowed'
                            }`}
                            onClick={() => handleLockerSelect(locker)}
                          >
                            <CardHeader className="text-center pb-3">
                              <div className="flex justify-between items-start mb-2">
                                <CardTitle className="text-responsive font-bold">
                                  Loker {locker.locker_code || locker.lockerId}
                                </CardTitle>
                                <Badge variant={status.variant} className="text-xs">
                                  {status.text}
                                </Badge>
                              </div>
                              <p className="text-muted-responsive">
                                {locker.width} x {locker.height}
                              </p>
                            </CardHeader>
                            
                            <CardContent className="text-center space-y-4 pt-0">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-muted-responsive mb-1">Harga per 3 jam</p>
                                <p className="text-lg sm:text-xl font-bold text-green-600">
                                  Rp {(locker.basePrice || 0).toLocaleString()}
                                </p>
                              </div>
                              
                              <p className="text-muted-responsive line-clamp-2">
                                {locker.description || 'Tidak ada deskripsi'}
                              </p>
                              
                              <Button 
                                className="btn-responsive btn-responsive-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                disabled={!isAvailable}
                              >
                                {isAvailable ? 'Pilih Loker' : 'Tidak Tersedia'}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </ResponsiveGrid>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ResponsiveContainer>

      {selectedLocker && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          locker={selectedLocker}
          customerPhone={customerPhone}
          userId={guestId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default LockerSelection;
