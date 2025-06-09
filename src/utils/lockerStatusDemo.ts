// Demo utility untuk mendemonstrasikan sistem manajemen status locker
import { databaseService } from '../services/databaseService';
import { lockerBookingService } from '../services/lockerBookingService';
import { lockerRetrievalService } from '../services/lockerRetrievalService';

export const lockerStatusDemo = {
  // Demo flow: Booking -> Retrieval -> Status Management
  async demonstrateCompleteFlow() {
    console.log('🚀 Memulai demo lengkap alur locker...');
    
    try {
      // 1. Buat locker baru dengan status available
      console.log('\n📦 Membuat locker baru...');
      const newLockerData = {
        lockerId: 'DEMO001',
        locker_code: 'DEMO001',
        name: 'Demo Locker 1',
        size: '30x40',
        width: 30,
        height: 40,
        total: 3,
        box_category_id: '1',
        status: 'available' as const,
        description: 'Locker demo untuk testing',
        basePrice: 15000,
        available: 3,
        key: Date.now(),
        isDeleted: false,
        location: 'Demo Area',
        esp32_device_id: 'ESP32_DEMO001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const lockerId = await databaseService.createLocker(newLockerData);
      console.log('✅ Locker dibuat dengan ID:', lockerId);
      
      // 2. Simulasi booking (akan mengurangi available dan update status)
      console.log('\n🛒 Melakukan booking locker...');
      const bookingData = {
        userId: 'user123',
        userEmail: 'user@example.com',
        customerName: 'Demo User',
        customerPhone: '081234567890',
        lockerId: lockerId,
        lockerName: 'Demo Locker 1',
        lockerSize: '30x40',
        duration: 24,
        totalPrice: 15000,
        paymentMethod: 'virtual_account'
      };

      const booking = await databaseService.createBooking(bookingData);
      console.log('✅ Booking dibuat dengan ID:', booking.id);
      
      // 3. Cek status locker setelah booking
      let locker = await databaseService.getLocker(lockerId);
      console.log(`📊 Status setelah booking - Available: ${locker.available}/${locker.total}, Status: ${locker.status}`);
      
      // 4. Simulasi booking kedua
      console.log('\n🛒 Melakukan booking kedua...');
      const booking2 = await databaseService.createBooking({
        ...bookingData,
        customerName: 'Demo User 2',
        customerPhone: '081234567891'
      });
      console.log('✅ Booking kedua dibuat dengan ID:', booking2.id);
      
      // 5. Cek status setelah booking kedua
      locker = await databaseService.getLocker(lockerId);
      console.log(`📊 Status setelah booking kedua - Available: ${locker.available}/${locker.total}, Status: ${locker.status}`);
      
      // 6. Simulasi booking ketiga (akan membuat locker menjadi occupied)
      console.log('\n🛒 Melakukan booking ketiga (akan membuat occupied)...');
      const booking3 = await databaseService.createBooking({
        ...bookingData,
        customerName: 'Demo User 3',
        customerPhone: '081234567892'
      });
      console.log('✅ Booking ketiga dibuat dengan ID:', booking3.id);
      
      // 7. Cek status final setelah semua booking
      locker = await databaseService.getLocker(lockerId);
      console.log(`📊 Status setelah booking ketiga - Available: ${locker.available}/${locker.total}, Status: ${locker.status}`);
      
      // 8. Simulasi pengambilan barang (retrieval)
      console.log('\n📤 Simulasi pengambilan barang...');
      const retrievalData = {
        lockerId: lockerId,
        backendLockerId: 1, // Dummy backend ID
        accessCode: 'ACCESS123',
        userId: 'user123',
        bookingId: booking.id || 'booking123'
      };
      
      await lockerRetrievalService.handleItemRetrieval(retrievalData);
      console.log('✅ Pengambilan barang berhasil');
      
      // 9. Cek status setelah retrieval
      locker = await databaseService.getLocker(lockerId);
      console.log(`📊 Status setelah retrieval - Available: ${locker.available}/${locker.total}, Status: ${locker.status}`);
      
      // 10. Tampilkan log aktivitas
      console.log('\n📋 Log aktivitas locker:');
      const logs = await databaseService.getLockerLogs();
      const lockerLogs = logs.filter(log => log.locker_id === lockerId);
      lockerLogs.forEach(log => {
        console.log(`- ${log.action} pada ${new Date(log.action_time).toLocaleString('id-ID')} oleh ${log.userId || 'system'}`);
      });
      
      console.log('\n🎉 Demo selesai! Sistem manajemen locker bekerja dengan baik.');
      
    } catch (error) {
      console.error('❌ Error dalam demo:', error);
      throw error;
    }
  },

  // Demo untuk testing individual functions
  async testIndividualFunctions() {
    console.log('🧪 Testing fungsi individual...');
    
    try {
      // Test booking service
      console.log('\n📝 Testing booking service...');
      const bookingResult = await lockerBookingService.handleLockerBooking({
        lockerId: 'test123',
        userId: 'user123',
        bookingId: 'booking123'
      });
      console.log('Booking service result:', bookingResult);
      
      // Test retrieval service  
      console.log('\n📝 Testing retrieval service...');
      const retrievalResult = await lockerRetrievalService.handleItemRetrieval({
        lockerId: 'test123',
        backendLockerId: 1,
        accessCode: 'ACCESS123',
        userId: 'user123',
        bookingId: 'booking123'
      });
      console.log('Retrieval service result:', retrievalResult);
      
    } catch (error) {
      console.warn('⚠️ Test error (expected if test data not exists):', error);
    }
  }
};

// Export untuk penggunaan di komponen atau testing
export default lockerStatusDemo;
