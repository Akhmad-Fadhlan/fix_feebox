import { databaseService } from './databaseService';

export interface LockerBookingData {
  lockerId: string;
  userId: string;
  bookingId: string;
}

export const lockerBookingService = {
  // Handle booking creation - decrease locker availability and set status to occupied
  async handleLockerBooking(bookingData: LockerBookingData): Promise<boolean> {
    console.log('🔄 Handling locker booking for locker:', bookingData.lockerId);
    
    try {
      // 1. Get current locker data
      console.log('🔄 Fetching current locker data...');
      const locker = await databaseService.getLocker(bookingData.lockerId);
      
      if (!locker) {
        console.error('❌ Locker not found:', bookingData.lockerId);
        return false;
      }

      const currentAvailable = parseInt(String(locker.available || 0), 10);
      const total = parseInt(String(locker.total || 1), 10);

      // 2. Check if locker is available
      if (currentAvailable <= 0) {
        console.error('❌ Locker not available for booking');
        return false;
      }

      // 3. Calculate new availability (decrease by 1)
      const newAvailable = Math.max(currentAvailable - 1, 0);
      
      // 4. Determine new status
      let newStatus: 'available' | 'occupied' | 'maintenance' = 'available';
      if (newAvailable === 0) {
        newStatus = 'occupied'; // All units are booked
      } else if (newAvailable < total) {
        newStatus = 'available'; // Some units still available
      }

      console.log(`Updating locker ${bookingData.lockerId}:`);
      console.log(`- Availability: ${currentAvailable} -> ${newAvailable}`);
      console.log(`- Status: ${locker.status} -> ${newStatus}`);

      // 5. Update locker with new availability and status
      await databaseService.updateLocker(bookingData.lockerId, {
        available: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Locker updated successfully after booking');

      // 6. Create locker log for booking action
      try {
        const logData = {
          locker_id: bookingData.lockerId,
          esp32_device_id: locker.esp32_device_id || '',
          action: 'booking_created',
          action_time: new Date().toISOString(),
          key: Date.now(),
          userId: bookingData.userId
        };

        await databaseService.createLockerLog(logData);
        console.log('✅ Locker log created for booking');
      } catch (logError) {
        console.warn('⚠️ Failed to create locker log:', logError);
        // Don't fail the booking if log creation fails
      }

      // 7. Double check the update worked
      const updatedLocker = await databaseService.getLocker(bookingData.lockerId);
      console.log('Updated locker status:', updatedLocker?.status);
      console.log('Updated locker availability:', updatedLocker?.available);

      return true;
    } catch (error) {
      console.error('❌ Failed to handle locker booking:', error);
      return false;
    }
  },

  // Handle booking cancellation - increase locker availability and update status
  async handleBookingCancellation(bookingData: LockerBookingData): Promise<boolean> {
    console.log('🔄 Handling booking cancellation for locker:', bookingData.lockerId);
    
    try {
      // 1. Get current locker data
      const locker = await databaseService.getLocker(bookingData.lockerId);
      
      if (!locker) {
        console.error('❌ Locker not found:', bookingData.lockerId);
        return false;
      }

      const currentAvailable = parseInt(String(locker.available || 0), 10);
      const total = parseInt(String(locker.total || 1), 10);

      // 2. Calculate new availability (increase by 1)
      const newAvailable = Math.min(currentAvailable + 1, total);
      
      // 3. Update status to available since we're adding availability
      const newStatus: 'available' | 'occupied' | 'maintenance' = 'available';

      console.log(`Updating locker ${bookingData.lockerId} after cancellation:`);
      console.log(`- Availability: ${currentAvailable} -> ${newAvailable}`);
      console.log(`- Status: ${locker.status} -> ${newStatus}`);

      // 4. Update locker
      await databaseService.updateLocker(bookingData.lockerId, {
        available: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Locker updated successfully after cancellation');

      // 5. Create locker log for cancellation action
      try {
        const logData = {
          locker_id: bookingData.lockerId,
          esp32_device_id: locker.esp32_device_id || '',
          action: 'booking_cancelled',
          action_time: new Date().toISOString(),
          key: Date.now(),
          userId: bookingData.userId
        };

        await databaseService.createLockerLog(logData);
        console.log('✅ Locker log created for cancellation');
      } catch (logError) {
        console.warn('⚠️ Failed to create locker log:', logError);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to handle booking cancellation:', error);
      return false;
    }
  }
};
