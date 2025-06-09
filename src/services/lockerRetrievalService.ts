import { databaseService } from './databaseService';
import { duitkuService } from './duitkuService';
import { localStorageService, LocalBooking } from './localStorage';

export interface LockerRetrievalData {
  lockerId: string;
  backendLockerId: number;
  accessCode: string;
  userId: string;
  bookingId: string;
}

export const lockerRetrievalService = {
  // Handle item retrieval - increase locker availability and set status to available
  async handleItemRetrieval(retrievalData: LockerRetrievalData): Promise<boolean> {
    console.log('🔄 Handling item retrieval for locker:', retrievalData.lockerId);
    
    try {
      // 1. Update backend locker availability (increase by 1)
      console.log('🔄 Increasing backend locker availability...');
      const backendSuccess = await duitkuService.handleLockerRetrieval(retrievalData.backendLockerId);
      
      if (!backendSuccess) {
        console.error('❌ Failed to update backend locker availability');
        // Continue with Firebase update even if backend fails
      } else {
        console.log('✅ Backend locker availability increased successfully');
      }

      // 2. Update Firebase locker availability and set status to available
      console.log('🔄 Updating locker to AVAILABLE status after item retrieval...');
      try {
        const locker = await databaseService.getLocker(retrievalData.lockerId);
        if (locker) {
          const currentAvailable = parseInt(String(locker.available || 0), 10);
          const total = parseInt(String(locker.total || 1), 10);
          
          // Increase availability but don't exceed total capacity
          const newAvailable = Math.min(currentAvailable + 1, total);
          
          console.log(`Updating Firebase locker ${retrievalData.lockerId}:`);
          console.log(`- Availability: ${currentAvailable} -> ${newAvailable}`);
          console.log(`- Status: ${locker.status} -> available`);
          
          // Force update to available status
          await databaseService.updateLocker(retrievalData.lockerId, {
            available: newAvailable,
            status: 'available',
            updatedAt: new Date().toISOString()
          });
          
          console.log('✅ Firebase locker updated: availability increased and status set to AVAILABLE');
          
          // Double check the update worked
          const updatedLocker = await databaseService.getLocker(retrievalData.lockerId);
          console.log('Updated locker status:', updatedLocker?.status);
          console.log('Updated locker availability:', updatedLocker?.available);
        } else {
          console.error('❌ Locker not found for update:', retrievalData.lockerId);
        }
      } catch (firebaseError) {
        console.error('❌ Failed to update Firebase locker:', firebaseError);
      }

      // 3. Update booking status to completed/checked_out
      console.log('🔄 Updating booking status to checked out...');
      try {
        const bookings = await databaseService.getBookings();
        const booking = bookings.find(b => b.id === retrievalData.bookingId);
        
        if (booking) {
          await databaseService.updateBooking(retrievalData.bookingId, {
            checkedOut: true
          });
          console.log('✅ Booking marked as checked out');
        }
        
        // Also update localStorage booking
        const localBookings = localStorageService.getAllBookings();
        const updatedLocalBookings = localBookings.map(b => 
          b.id === retrievalData.bookingId 
            ? { ...b, checkedOut: true, checkedOutAt: new Date().toISOString() }
            : b
        );
        localStorage.setItem('feebox_bookings', JSON.stringify(updatedLocalBookings));
        console.log('✅ Local booking marked as checked out');
        
      } catch (bookingError) {
        console.error('❌ Failed to update booking status:', bookingError);
      }

      // 4. Set device status to offline
      console.log('🔄 Setting device status to OFFLINE after retrieval...');
      try {
        const lockerData = await databaseService.getLocker(retrievalData.lockerId);
        if (lockerData?.lockerId) {
          await databaseService.updateDeviceStatusByLockerId(lockerData.lockerId, 'offline');
          console.log('✅ Device status set to OFFLINE after item retrieval');
        }
      } catch (deviceError) {
        console.error('❌ Failed to update device status:', deviceError);
      }

      console.log('✅ Item retrieval completed - locker is now AVAILABLE');
      return true;

    } catch (error) {
      console.error('❌ Error handling item retrieval:', error);
      return false;
    }
  },

  // Get locker retrieval data from booking - improved to check both Firebase and localStorage
  async getRetrievalDataFromBooking(bookingId: string): Promise<LockerRetrievalData | null> {
    try {
      console.log('🔄 Looking for booking:', bookingId);
      
      let booking = null;
      
      // First try to get from Firebase
      try {
        const firebaseBookings = await databaseService.getBookings();
        booking = firebaseBookings.find(b => b.id === bookingId);
        console.log('Firebase booking search result:', booking ? 'Found' : 'Not found');
      } catch (firebaseError) {
        console.warn('⚠️ Failed to get bookings from Firebase:', firebaseError);
      }
      
      // If not found in Firebase, try localStorage
      if (!booking) {
        console.log('🔄 Searching in localStorage...');
        const localBookings = localStorageService.getAllBookings();
        const localBooking = localBookings.find(b => b.id === bookingId);
        
        if (localBooking) {
          console.log('✅ Found booking in localStorage');
          // Convert LocalBooking to Firebase booking format
          booking = {
            id: localBooking.id,
            userId: localBooking.userId,
            customerName: localBooking.customerName,
            customerPhone: localBooking.customerPhone,
            lockerId: localBooking.lockerId,
            lockerName: localBooking.lockerName,
            lockerSize: localBooking.lockerSize,
            duration: localBooking.duration,
            totalPrice: localBooking.totalPrice,
            paymentMethod: localBooking.paymentMethod || 'QRIS',
            paymentStatus: localBooking.paymentStatus,
            merchantOrderId: localBooking.merchantOrderId || '',
            duitkuReference: localBooking.duitkuReference,
            createdAt: localBooking.createdAt,
            expiresAt: localBooking.expiresAt,
            checkedOut: localBooking.checkedOut || false,
            checkedOutAt: localBooking.checkedOutAt,
            accessCode: localBooking.accessCode
          };
        }
      }

      if (!booking) {
        console.error('❌ Booking not found in both Firebase and localStorage:', bookingId);
        return null;
      }

      // Try to get locker data with fallback to localStorage
      let locker = null;
      try {
        locker = await databaseService.getLocker(booking.lockerId);
      } catch (error) {
        console.warn('⚠️ Failed to get locker from Firebase, using fallback data:', error);
        // Create fallback locker data
        locker = {
          id: booking.lockerId,
          lockerId: booking.lockerId,
          locker_code: `L${Math.abs(booking.lockerId.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 1000) + 1}`,
          name: booking.lockerName || 'Default Locker',
          available: 1,
          total: 1,
          status: 'occupied'
        };
      }

      if (!locker) {
        console.error('❌ Locker not found:', booking.lockerId);
        return null;
      }

      // Extract numeric locker ID for backend
      const getNumericLockerId = (locker: any): number => {
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

      const retrievalData = {
        lockerId: booking.lockerId,
        backendLockerId: getNumericLockerId(locker),
        accessCode: booking.accessCode || '',
        userId: booking.userId,
        bookingId: bookingId
      };

      console.log('✅ Retrieval data prepared:', retrievalData);
      return retrievalData;

    } catch (error) {
      console.error('❌ Error getting retrieval data from booking:', error);
      return null;
    }
  },

  // New method to create retrieval data directly from LocalBooking
  async getRetrievalDataFromLocalBooking(localBooking: LocalBooking): Promise<LockerRetrievalData | null> {
    try {
      console.log('🔄 Creating retrieval data from local booking:', localBooking.id);
      
      // Try to get locker data with fallback
      let locker = null;
      try {
        locker = await databaseService.getLocker(localBooking.lockerId);
      } catch (error) {
        console.warn('⚠️ Failed to get locker from Firebase, using fallback data:', error);
        // Create fallback locker data
        locker = {
          id: localBooking.lockerId,
          lockerId: localBooking.lockerId,
          locker_code: `L${Math.abs(localBooking.lockerId.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) % 1000) + 1}`,
          name: localBooking.lockerName || 'Default Locker',
          available: 1,
          total: 1,
          status: 'occupied'
        };
      }

      if (!locker) {
        console.error('❌ Locker not found:', localBooking.lockerId);
        return null;
      }

      // Extract numeric locker ID for backend
      const getNumericLockerId = (locker: any): number => {
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

      const retrievalData = {
        lockerId: localBooking.lockerId,
        backendLockerId: getNumericLockerId(locker),
        accessCode: localBooking.accessCode || '',
        userId: localBooking.userId,
        bookingId: localBooking.id
      };

      console.log('✅ Retrieval data prepared from local booking:', retrievalData);
      return retrievalData;

    } catch (error) {
      console.error('❌ Error creating retrieval data from local booking:', error);
      return null;
    }
  }
};
