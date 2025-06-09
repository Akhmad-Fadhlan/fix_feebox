
import { ref, set, update, get, remove, push } from "firebase/database";
import { realtimeDb } from './databaseService';

const API_BASE_URL = 'https://projectiot.web.id/api/v1';

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`API endpoint not found: ${response.url}`);
    }
    
    try {
      const errorBody = await response.json();
      throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Expected JSON response but received different content type');
  }
  
  const data = await response.json();
  
  if (data.success && data.data) {
    return data.data;
  }
  
  return data;
};

// Helper function to safely set data to Firebase (avoiding undefined values)
const safeFirebaseSet = async (firebaseRef: any, data: any) => {
  // Clean the data object to remove undefined values
  const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
    return value === undefined ? null : value;
  }));
  
  await set(firebaseRef, cleanData);
};

export const firebaseSyncService = {
  // Sync all backend data to Firebase
  async syncAllToFirebase(): Promise<void> {
    try {
      console.log('Starting full sync from backend to Firebase (backend-first approach)...');
      
      await Promise.all([
        this.syncUsersToFirebase(),
        this.syncLockersToFirebase(),
        this.syncBoxCategoriesToFirebase(),
        this.syncTransactionsToFirebase(),
        this.syncPaymentsToFirebase(),
        this.syncDevicesToFirebase(),
        this.syncPackagesToFirebase(),
        this.syncLockerLogsToFirebase()
      ]);
      
      console.log('Full sync completed successfully - Firebase now reflects backend state');
    } catch (error) {
      console.error('Error during full sync:', error);
      throw error;
    }
  },

  // Sync users from backend to Firebase
  async syncUsersToFirebase(): Promise<void> {
    try {
      console.log('Syncing users to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/users`);
      const users = await handleResponse(response);
      
      const usersRef = ref(realtimeDb, 'users');
      
      // Clear existing non-guest users first
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const existingUsers = snapshot.val();
        for (const userId in existingUsers) {
          if (!userId.startsWith('guest_')) {
            await remove(ref(realtimeDb, `users/${userId}`));
          }
        }
      }
      
      // Add backend users with safe data handling
      for (const user of users) {
        const userRef = ref(realtimeDb, `users/${user._id || user.id}`);
        const userData = {
          uid: user._id || user.id,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          role: user.role || 'user',
          isDeleted: user.isDeleted || false,
          createdAt: user.created_at || user.createdAt || new Date().toISOString(),
          updatedAt: user.updated_at || user.updatedAt || new Date().toISOString()
        };
        
        await safeFirebaseSet(userRef, userData);
      }
      
      console.log(`Synced ${users.length} users to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync users to Firebase:', error);
    }
  },

  // Sync lockers from backend to Firebase
  async syncLockersToFirebase(): Promise<void> {
    try {
      console.log('Syncing lockers to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/lockers`);
      const lockers = await handleResponse(response);
      
      const lockersRef = ref(realtimeDb, 'lockers');
      await remove(lockersRef);
      
      for (const locker of lockers) {
        const lockerRef = ref(realtimeDb, `lockers/${locker._id}`);
        const lockerData = {
          id: locker._id,
          lockerId: locker.locker_code || '',
          locker_code: locker.locker_code || '',
          name: locker.name || `Locker ${locker.locker_code}`,
          size: `${locker.width}x${locker.height}`,
          width: parseInt(locker.width) || 0,
          height: parseInt(locker.height) || 0,
          total: locker.total || 1,
          box_category_id: locker.box_category_id?.toString() || '',
          status: locker.status || 'available',
          description: locker.description || '',
          basePrice: locker.basePrice || 10000,
          available: locker.available || locker.total || 1,
          key: locker.key || Date.now(),
          isDeleted: locker.isDeleted || false,
          location: locker.location || '',
          esp32_device_id: locker.esp32_device_id || '',
          createdAt: locker.created_at || locker.createdAt || new Date().toISOString(),
          updatedAt: locker.updated_at || locker.updatedAt || new Date().toISOString()
        };
        
        await safeFirebaseSet(lockerRef, lockerData);
      }
      
      console.log(`Synced ${lockers.length} lockers to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync lockers to Firebase:', error);
    }
  },

  // Sync box categories from backend to Firebase
  async syncBoxCategoriesToFirebase(): Promise<void> {
    try {
      console.log('Syncing box categories to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/box-categories`);
      const categories = await handleResponse(response);
      
      const categoriesRef = ref(realtimeDb, 'boxCategories');
      await remove(categoriesRef);
      
      for (const category of categories) {
        const categoryRef = ref(realtimeDb, `boxCategories/${category._id}`);
        const categoryData = {
          id: category._id,
          name: category.name || '',
          type: category.type || '',
          width: parseInt(category.width) || 0,
          height: parseInt(category.height) || 0,
          createdAt: category.created_at || category.createdAt || new Date().toISOString(),
          updatedAt: category.updated_at || category.updatedAt || new Date().toISOString()
        };
        
        await safeFirebaseSet(categoryRef, categoryData);
      }
      
      console.log(`Synced ${categories.length} box categories to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync box categories to Firebase:', error);
    }
  },

  // Sync transactions from backend to Firebase
  async syncTransactionsToFirebase(): Promise<void> {
    try {
      console.log('Syncing transactions to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/transactions`);
      const transactions = await handleResponse(response);
      
      const transactionsRef = ref(realtimeDb, 'bookings');
      await remove(transactionsRef);
      
      for (const transaction of transactions) {
        const transactionRef = ref(realtimeDb, `bookings/${transaction._id}`);
        const transactionData = {
          id: transaction._id,
          userId: transaction.userId || transaction.user_id || '',
          userEmail: transaction.userEmail || transaction.user_email || '',
          customerName: transaction.customerName || transaction.customer_name || '',
          customerPhone: transaction.customerPhone || transaction.customer_phone || '',
          lockerId: transaction.lockerId || transaction.locker_id || '',
          lockerName: transaction.lockerName || transaction.locker_name || '',
          lockerSize: transaction.lockerSize || transaction.locker_size || '',
          duration: transaction.duration || 0,
          totalPrice: transaction.totalPrice || transaction.total_price || 0,
          paymentMethod: transaction.paymentMethod || transaction.payment_method || '',
          paymentStatus: transaction.paymentStatus || transaction.payment_status || 'pending',
          merchantOrderId: transaction.merchantOrderId || transaction.merchant_order_id || '',
          duitkuReference: transaction.duitkuReference || transaction.duitku_reference || '',
          createdAt: transaction.created_at || transaction.createdAt || new Date().toISOString(),
          expiresAt: transaction.expiresAt || transaction.expires_at || '',
          checkedIn: transaction.checkedIn || transaction.checked_in || false,
          checkedOut: transaction.checkedOut || transaction.checked_out || false,
          checkedOutAt: transaction.checkedOutAt || transaction.checked_out_at || '',
          accessCode: transaction.accessCode || transaction.access_code || '',
          qrCodeDataURL: transaction.qrCodeDataURL || transaction.qr_code_data_url || ''
        };
        
        await safeFirebaseSet(transactionRef, transactionData);
      }
      
      console.log(`Synced ${transactions.length} transactions to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync transactions to Firebase:', error);
    }
  },

  // Sync payments from backend to Firebase
  async syncPaymentsToFirebase(): Promise<void> {
    try {
      console.log('Syncing payments to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/payments`);
      const payments = await handleResponse(response);
      
      const paymentsRef = ref(realtimeDb, 'payments');
      await remove(paymentsRef);
      
      for (const payment of payments) {
        const paymentRef = ref(realtimeDb, `payments/${payment._id}`);
        const paymentData = {
          id: payment._id,
          bookingId: payment.bookingId || payment.booking_id || payment.transaction_id || '',
          amount: payment.amount || 0,
          paymentMethod: payment.paymentMethod || payment.payment_method || '',
          payment_method: payment.payment_method || '',
          status: payment.status || 'pending',
          duitku_payment_id: payment.duitku_payment_id || '',
          order_id: payment.order_id || '',
          transaction_time: payment.transaction_time || '',
          key: payment.key || 0,
          createdAt: payment.created_at || payment.createdAt || new Date().toISOString(),
          updatedAt: payment.updated_at || payment.updatedAt || new Date().toISOString()
        };
        
        await safeFirebaseSet(paymentRef, paymentData);
      }
      
      console.log(`Synced ${payments.length} payments to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync payments to Firebase:', error);
    }
  },

  // Sync ESP32 devices from backend to Firebase
  async syncDevicesToFirebase(): Promise<void> {
    try {
      console.log('Syncing ESP32 devices to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/esp32-devices`);
      const devices = await handleResponse(response);
      
      const devicesRef = ref(realtimeDb, 'devices');
      await remove(devicesRef);
      
      for (const device of devices) {
        const deviceRef = ref(realtimeDb, `devices/${device._id}`);
        const deviceData = {
          id: device._id,
          name: device.name || '',
          device_identifier: device.device_identifier || '',
          locker_id: device.locker_id || '',
          status: device.status || 'offline',
          key: device.key || 0,
          isDeleted: device.isDeleted || false,
          last_online: device.last_online || new Date().toISOString(),
          location: device.location || '',
          ip_address: device.ip_address || '',
          port: device.port || 0
        };
        
        await safeFirebaseSet(deviceRef, deviceData);
      }
      
      console.log(`Synced ${devices.length} devices to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync devices to Firebase:', error);
    }
  },

  // Sync packages from backend to Firebase
  async syncPackagesToFirebase(): Promise<void> {
    try {
      console.log('Syncing packages to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/packages`);
      const packages = await handleResponse(response);
      
      const packagesRef = ref(realtimeDb, 'packages');
      await remove(packagesRef);
      
      for (const pkg of packages) {
        const packageRef = ref(realtimeDb, `packages/${pkg._id}`);
        const packageData = {
          id: pkg._id,
          name: pkg.name || '',
          description: pkg.description || '',
          imageUrl: pkg.imageUrl || pkg.image_url || '',
          price: pkg.price || 0,
          type: pkg.type || 'custom',
          box_category_id: pkg.box_category_id?.toString() || '',
          key: pkg.key || Date.now(),
          isDeleted: pkg.isDeleted || false,
          basePrice: pkg.basePrice || pkg.price || 0,
          duration: pkg.duration || 24,
          createdAt: pkg.created_at || pkg.createdAt || new Date().toISOString(),
          updatedAt: pkg.updated_at || pkg.updatedAt || new Date().toISOString()
        };
        
        await safeFirebaseSet(packageRef, packageData);
      }
      
      console.log(`Synced ${packages.length} packages to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync packages to Firebase:', error);
    }
  },

  // Sync locker logs from backend to Firebase
  async syncLockerLogsToFirebase(): Promise<void> {
    try {
      console.log('Syncing locker logs to Firebase (backend-first)...');
      
      const response = await fetch(`${API_BASE_URL}/locker-logs`);
      const logs = await handleResponse(response);
      
      const logsRef = ref(realtimeDb, 'lockerLogs');
      await remove(logsRef);
      
      for (const log of logs) {
        const logRef = ref(realtimeDb, `lockerLogs/${log._id}`);
        const logData = {
          id: log._id,
          locker_id: log.locker_id || '',
          esp32_device_id: log.esp32_device_id || '',
          action: log.action || '',
          action_time: log.action_time || new Date().toISOString(),
          key: log.key || 0,
          userId: log.userId || log.user_id || ''
        };
        
        await safeFirebaseSet(logRef, logData);
      }
      
      console.log(`Synced ${logs.length} locker logs to Firebase (backend-first)`);
    } catch (error) {
      console.warn('Failed to sync locker logs to Firebase:', error);
    }
  },

  // Auto-sync function that runs periodically - less frequent since backend is primary
  async startAutoSync(intervalMinutes: number = 10): Promise<void> {
    console.log(`Starting auto-sync every ${intervalMinutes} minutes (backend-first approach)`);
    
    // Initial sync
    await this.syncAllToFirebase();
    
    // Set up periodic sync - less frequent since backend is primary source
    setInterval(async () => {
      try {
        console.log('Running periodic sync (backend-first)...');
        await this.syncAllToFirebase();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
};
