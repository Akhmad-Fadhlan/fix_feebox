
import { databaseService } from './databaseService';
import { localStorageService } from './localStorage';

export const qrCodeAccessService = {
  async handleQRCodeAccess(accessCode: string): Promise<{ success: boolean; message: string; lockerInfo?: any }> {
    try {
      console.log('Handling QR code access for code:', accessCode);
      
      // First check localStorage for the booking
      const localBooking = localStorageService.getBookingByAccessCode(accessCode);
      
      if (!localBooking) {
        console.log('No booking found for access code:', accessCode);
        return {
          success: false,
          message: 'Kode akses tidak valid atau tidak ditemukan'
        };
      }

      // Check if booking is paid
      if (localBooking.paymentStatus !== 'paid') {
        console.log('Booking not paid yet for access code:', accessCode);
        return {
          success: false,
          message: 'Pembayaran belum selesai untuk kode akses ini'
        };
      }

      // Check if booking is still valid (not expired)
      const now = new Date();
      const expiresAt = new Date(localBooking.expiresAt);
      
      if (now > expiresAt) {
        console.log('Booking expired for access code:', accessCode);
        return {
          success: false,
          message: 'Kode akses sudah kedaluwarsa'
        };
      }

      // Valid access code - set device to ONLINE
      console.log('Valid access code! Setting device to ONLINE for locker:', localBooking.lockerId);
      
      try {
        // Find the locker and set its device to online
        const lockers = await databaseService.getLockers();
        const locker = lockers.find(l => l.id === localBooking.lockerId);
        
        if (locker && locker.lockerId) {
          await databaseService.updateDeviceStatusByLockerId(locker.lockerId, 'online');
          console.log('Device status updated to ONLINE for locker access');
        }
      } catch (deviceError) {
        console.error('Failed to update device status:', deviceError);
        // Continue anyway - access is still valid
      }

      return {
        success: true,
        message: 'Akses berhasil! Loker terbuka.',
        lockerInfo: {
          lockerName: localBooking.lockerName,
          customerName: localBooking.customerName,
          expiresAt: localBooking.expiresAt,
          accessCode: accessCode
        }
      };

    } catch (error) {
      console.error('Error handling QR code access:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat memproses akses'
      };
    }
  }
};
