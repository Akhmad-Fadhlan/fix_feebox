
import { databaseService } from './databaseService';
import { localStorageService } from './localStorage';

export const userSyncService = {
  // Delete user from both backend and local storage
  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting user from all systems:', userId);
      
      let success = true;
      
      // 1. Delete from backend API
      try {
        await databaseService.deleteUser(userId);
        console.log('✅ User deleted from backend API');
      } catch (apiError) {
        console.error('❌ Failed to delete user from backend API:', apiError);
        success = false;
      }
      
      // 2. Delete from local storage
      try {
        localStorageService.removeUser(userId);
        console.log('✅ User deleted from local storage');
      } catch (localError) {
        console.error('❌ Failed to delete user from local storage:', localError);
      }
      
      // 3. Delete user's bookings
      try {
        const userBookings = localStorageService.getUserBookings(userId);
        for (const booking of userBookings) {
          localStorageService.removeBooking(booking.id);
        }
        console.log(`✅ Deleted ${userBookings.length} user bookings from local storage`);
      } catch (bookingError) {
        console.error('❌ Failed to delete user bookings:', bookingError);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return false;
    }
  },

  // Delete all users
  async deleteAllUsers(): Promise<boolean> {
    try {
      console.log('🗑️ Deleting ALL users - BE CAREFUL!');
      
      let success = true;
      
      // 1. Get all users from backend
      try {
        const backendUsers = await databaseService.getAllUsers();
        
        // Delete each user from backend
        for (const user of backendUsers) {
          try {
            await databaseService.deleteUser(user.uid || user.id || '');
            console.log(`✅ Deleted user ${user.email} from backend`);
          } catch (userError) {
            console.error(`❌ Failed to delete user ${user.email} from backend:`, userError);
            success = false;
          }
        }
      } catch (apiError) {
        console.error('❌ Failed to get/delete users from backend:', apiError);
        success = false;
      }
      
      // 2. Clear local storage
      try {
        localStorage.removeItem('feebox_users');
        localStorage.removeItem('feebox_bookings');
        console.log('✅ Cleared local storage');
      } catch (localError) {
        console.error('❌ Failed to clear local storage:', localError);
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error deleting all users:', error);
      return false;
    }
  },

  // Sync user from backend to local storage
  async syncUserToLocal(backendUser: any): Promise<void> {
    try {
      const localUser = {
        name: backendUser.name || '',
        email: backendUser.email || '',
        phone: backendUser.phone || '',
        role: (backendUser.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        createdAt: backendUser.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Check if user exists in local storage
      const existingUsers = localStorageService.getAllUsers();
      const existingUser = existingUsers.find(u => 
        u.email === backendUser.email || 
        u.id === backendUser.uid || 
        u.id === backendUser.id
      );
      
      if (existingUser) {
        localStorageService.updateUser(existingUser.id, localUser);
      } else {
        localStorageService.createUser(localUser);
      }
      
      console.log('✅ User synced to local storage:', backendUser.email);
    } catch (error) {
      console.error('❌ Failed to sync user to local storage:', error);
    }
  },

  // Sync all users from backend to local storage
  async syncAllUsersToLocal(): Promise<void> {
    try {
      console.log('🔄 Syncing all users from backend to local storage...');
      
      const backendUsers = await databaseService.getAllUsers();
      
      for (const user of backendUsers) {
        await this.syncUserToLocal(user);
      }
      
      console.log(`✅ Synced ${backendUsers.length} users to local storage`);
    } catch (error) {
      console.error('❌ Failed to sync users to local storage:', error);
    }
  },

  // Check if users are properly synced
  async checkUserSync(): Promise<{ backendCount: number; localCount: number; synced: boolean }> {
    try {
      const backendUsers = await databaseService.getAllUsers();
      const localUsers = localStorageService.getAllUsers();
      
      const result = {
        backendCount: backendUsers.length,
        localCount: localUsers.length,
        synced: backendUsers.length === localUsers.length
      };
      
      console.log('User sync status:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to check user sync:', error);
      return { backendCount: 0, localCount: 0, synced: false };
    }
  }
};
