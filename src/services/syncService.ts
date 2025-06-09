
import { ref, get, remove, set } from "firebase/database";
import { realtimeDb } from './databaseService';

const API_BASE_URL = 'https://projectiot.web.id/api/v1';

interface SyncResult {
  synced: number;
  deleted: number;
  errors: string[];
}

export const syncService = {
  // Sync Users
  async syncUsers(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };
    
    try {
      console.log('Syncing users...');
      
      // Get data from backend API
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const apiData = await response.json();
      const backendUsers = apiData.success ? apiData.data : apiData;
      
      // Get data from Firebase
      const firebaseRef = ref(realtimeDb, 'users');
      const firebaseSnapshot = await get(firebaseRef);
      const firebaseUsers = firebaseSnapshot.val() || {};
      
      // Create map of backend user IDs
      const backendUserIds = new Set(backendUsers.map((user: any) => user._id || user.id || user.uid));
      
      // Delete Firebase users that don't exist in backend
      for (const [firebaseUserId, firebaseUser] of Object.entries(firebaseUsers)) {
        if (!backendUserIds.has(firebaseUserId) && !firebaseUserId.startsWith('guest_')) {
          await remove(ref(realtimeDb, `users/${firebaseUserId}`));
          result.deleted++;
          console.log(`Deleted Firebase user: ${firebaseUserId}`);
        }
      }
      
      // Sync backend users to Firebase
      for (const backendUser of backendUsers) {
        const userId = backendUser._id || backendUser.id || backendUser.uid;
        const userRef = ref(realtimeDb, `users/${userId}`);
        
        const syncedUser = {
          uid: userId,
          name: backendUser.name,
          email: backendUser.email,
          phone: backendUser.phone,
          address: backendUser.address,
          role: backendUser.role,
          isDeleted: backendUser.isDeleted || false,
          createdAt: backendUser.created_at || backendUser.createdAt || new Date().toISOString(),
          updatedAt: backendUser.updated_at || backendUser.updatedAt || new Date().toISOString()
        };
        
        await set(userRef, syncedUser);
        result.synced++;
      }
      
      console.log(`Users sync completed: ${result.synced} synced, ${result.deleted} deleted`);
    } catch (error) {
      console.error('Error syncing users:', error);
      result.errors.push(`Users: ${error}`);
    }
    
    return result;
  },

  // Sync Transactions (Bookings)
  async syncTransactions(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };
    
    try {
      console.log('Syncing transactions...');
      
      // Get data from backend API
      const response = await fetch(`${API_BASE_URL}/transactions`);
      if (!response.ok) {
        result.errors.push(`Transactions API not available: ${response.status}`);
        return result;
      }
      
      const apiData = await response.json();
      const backendTransactions = apiData.success ? apiData.data : apiData;
      
      // Get data from Firebase
      const firebaseRef = ref(realtimeDb, 'bookings');
      const firebaseSnapshot = await get(firebaseRef);
      const firebaseBookings = firebaseSnapshot.val() || {};
      
      // Create map of backend transaction IDs
      const backendTransactionIds = new Set(backendTransactions.map((transaction: any) => transaction._id || transaction.id));
      
      // Delete Firebase bookings that don't exist in backend
      for (const [firebaseBookingId] of Object.entries(firebaseBookings)) {
        if (!backendTransactionIds.has(firebaseBookingId)) {
          await remove(ref(realtimeDb, `bookings/${firebaseBookingId}`));
          result.deleted++;
          console.log(`Deleted Firebase booking: ${firebaseBookingId}`);
        }
      }
      
      // Sync backend transactions to Firebase as bookings
      for (const backendTransaction of backendTransactions) {
        const transactionId = backendTransaction._id || backendTransaction.id;
        const bookingRef = ref(realtimeDb, `bookings/${transactionId}`);
        
        const syncedBooking = {
          id: transactionId,
          userId: backendTransaction.userId || backendTransaction.user_id,
          userEmail: backendTransaction.userEmail || backendTransaction.user_email,
          customerName: backendTransaction.customerName || backendTransaction.customer_name,
          customerPhone: backendTransaction.customerPhone || backendTransaction.customer_phone,
          lockerId: backendTransaction.lockerId || backendTransaction.locker_id,
          lockerName: backendTransaction.lockerName || backendTransaction.locker_name,
          lockerSize: backendTransaction.lockerSize || backendTransaction.locker_size,
          duration: backendTransaction.duration,
          totalPrice: backendTransaction.totalPrice || backendTransaction.total_price,
          paymentMethod: backendTransaction.paymentMethod || backendTransaction.payment_method,
          paymentStatus: backendTransaction.paymentStatus || backendTransaction.payment_status || 'pending',
          merchantOrderId: backendTransaction.merchantOrderId || backendTransaction.merchant_order_id,
          duitkuReference: backendTransaction.duitkuReference || backendTransaction.duitku_reference,
          createdAt: backendTransaction.created_at || backendTransaction.createdAt || new Date().toISOString(),
          expiresAt: backendTransaction.expiresAt || backendTransaction.expires_at,
          checkedIn: backendTransaction.checkedIn || backendTransaction.checked_in || false,
          checkedOut: backendTransaction.checkedOut || backendTransaction.checked_out || false,
          checkedOutAt: backendTransaction.checkedOutAt || backendTransaction.checked_out_at,
          accessCode: backendTransaction.accessCode || backendTransaction.access_code,
          qrCodeDataURL: backendTransaction.qrCodeDataURL || backendTransaction.qr_code_data_url
        };
        
        await set(bookingRef, syncedBooking);
        result.synced++;
      }
      
      console.log(`Transactions sync completed: ${result.synced} synced, ${result.deleted} deleted`);
    } catch (error) {
      console.error('Error syncing transactions:', error);
      result.errors.push(`Transactions: ${error}`);
    }
    
    return result;
  },

  // Sync Payments
  async syncPayments(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };
    
    try {
      console.log('Syncing payments...');
      
      // Get data from backend API
      const response = await fetch(`${API_BASE_URL}/payments`);
      if (!response.ok) {
        result.errors.push(`Payments API not available: ${response.status}`);
        return result;
      }
      
      const apiData = await response.json();
      const backendPayments = apiData.success ? apiData.data : apiData;
      
      // Get data from Firebase
      const firebaseRef = ref(realtimeDb, 'payments');
      const firebaseSnapshot = await get(firebaseRef);
      const firebasePayments = firebaseSnapshot.val() || {};
      
      // Create map of backend payment IDs
      const backendPaymentIds = new Set(backendPayments.map((payment: any) => payment._id || payment.id));
      
      // Delete Firebase payments that don't exist in backend
      for (const [firebasePaymentId] of Object.entries(firebasePayments)) {
        if (!backendPaymentIds.has(firebasePaymentId)) {
          await remove(ref(realtimeDb, `payments/${firebasePaymentId}`));
          result.deleted++;
          console.log(`Deleted Firebase payment: ${firebasePaymentId}`);
        }
      }
      
      // Sync backend payments to Firebase
      for (const backendPayment of backendPayments) {
        const paymentId = backendPayment._id || backendPayment.id;
        const paymentRef = ref(realtimeDb, `payments/${paymentId}`);
        
        const syncedPayment = {
          id: paymentId,
          bookingId: backendPayment.bookingId || backendPayment.booking_id || backendPayment.transaction_id,
          amount: backendPayment.amount,
          paymentMethod: backendPayment.paymentMethod || backendPayment.payment_method,
          status: backendPayment.status,
          duitku_payment_id: backendPayment.duitku_payment_id,
          order_id: backendPayment.order_id,
          transaction_time: backendPayment.transaction_time,
          key: backendPayment.key,
          createdAt: backendPayment.created_at || backendPayment.createdAt || new Date().toISOString(),
          updatedAt: backendPayment.updated_at || backendPayment.updatedAt || new Date().toISOString()
        };
        
        await set(paymentRef, syncedPayment);
        result.synced++;
      }
      
      console.log(`Payments sync completed: ${result.synced} synced, ${result.deleted} deleted`);
    } catch (error) {
      console.error('Error syncing payments:', error);
      result.errors.push(`Payments: ${error}`);
    }
    
    return result;
  },

  // Sync ESP32 Devices
  async syncESP32Devices(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };
    
    try {
      console.log('Syncing ESP32 devices...');
      
      // Get data from backend API
      const response = await fetch(`${API_BASE_URL}/esp32-devices`);
      if (!response.ok) {
        result.errors.push(`ESP32 devices API not available: ${response.status}`);
        return result;
      }
      
      const apiData = await response.json();
      const backendDevices = apiData.success ? apiData.data : apiData;
      
      // Get data from Firebase
      const firebaseRef = ref(realtimeDb, 'devices');
      const firebaseSnapshot = await get(firebaseRef);
      const firebaseDevices = firebaseSnapshot.val() || {};
      
      // Create map of backend device IDs
      const backendDeviceIds = new Set(backendDevices.map((device: any) => device._id || device.id));
      
      // Delete Firebase devices that don't exist in backend
      for (const [firebaseDeviceId] of Object.entries(firebaseDevices)) {
        if (!backendDeviceIds.has(firebaseDeviceId)) {
          await remove(ref(realtimeDb, `devices/${firebaseDeviceId}`));
          result.deleted++;
          console.log(`Deleted Firebase device: ${firebaseDeviceId}`);
        }
      }
      
      // Sync backend devices to Firebase
      for (const backendDevice of backendDevices) {
        const deviceId = backendDevice._id || backendDevice.id;
        const deviceRef = ref(realtimeDb, `devices/${deviceId}`);
        
        const syncedDevice = {
          id: deviceId,
          name: backendDevice.name,
          device_identifier: backendDevice.device_identifier,
          locker_id: backendDevice.locker_id,
          status: backendDevice.status || 'offline',
          key: backendDevice.key,
          isDeleted: backendDevice.isDeleted || false,
          last_online: backendDevice.last_online || new Date().toISOString(),
          location: backendDevice.location,
          ip_address: backendDevice.ip_address,
          port: backendDevice.port
        };
        
        await set(deviceRef, syncedDevice);
        result.synced++;
      }
      
      console.log(`ESP32 devices sync completed: ${result.synced} synced, ${result.deleted} deleted`);
    } catch (error) {
      console.error('Error syncing ESP32 devices:', error);
      result.errors.push(`ESP32 devices: ${error}`);
    }
    
    return result;
  },

  // Sync Locker Logs
  async syncLockerLogs(): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };
    
    try {
      console.log('Syncing locker logs...');
      
      // Get data from backend API
      const response = await fetch(`${API_BASE_URL}/locker-logs`);
      if (!response.ok) {
        result.errors.push(`Locker logs API not available: ${response.status}`);
        return result;
      }
      
      const apiData = await response.json();
      const backendLogs = apiData.success ? apiData.data : apiData;
      
      // Get data from Firebase
      const firebaseRef = ref(realtimeDb, 'locker_logs');
      const firebaseSnapshot = await get(firebaseRef);
      const firebaseLogs = firebaseSnapshot.val() || {};
      
      // Create map of backend log IDs
      const backendLogIds = new Set(backendLogs.map((log: any) => log._id || log.id));
      
      // Delete Firebase logs that don't exist in backend
      for (const [firebaseLogId] of Object.entries(firebaseLogs)) {
        if (!backendLogIds.has(firebaseLogId)) {
          await remove(ref(realtimeDb, `locker_logs/${firebaseLogId}`));
          result.deleted++;
          console.log(`Deleted Firebase locker log: ${firebaseLogId}`);
        }
      }
      
      // Sync backend logs to Firebase
      for (const backendLog of backendLogs) {
        const logId = backendLog._id || backendLog.id;
        const logRef = ref(realtimeDb, `locker_logs/${logId}`);
        
        const syncedLog = {
          id: logId,
          locker_id: backendLog.locker_id,
          esp32_device_id: backendLog.esp32_device_id,
          action: backendLog.action,
          action_time: backendLog.action_time,
          key: backendLog.key,
          userId: backendLog.userId || backendLog.user_id
        };
        
        await set(logRef, syncedLog);
        result.synced++;
      }
      
      console.log(`Locker logs sync completed: ${result.synced} synced, ${result.deleted} deleted`);
    } catch (error) {
      console.error('Error syncing locker logs:', error);
      result.errors.push(`Locker logs: ${error}`);
    }
    
    return result;
  },

  // Sync all data
  async syncAll(): Promise<{[key: string]: SyncResult}> {
    console.log('Starting full data synchronization...');
    
    const results = {
      users: await this.syncUsers(),
      transactions: await this.syncTransactions(),
      payments: await this.syncPayments(),
      esp32Devices: await this.syncESP32Devices(),
      lockerLogs: await this.syncLockerLogs()
    };
    
    console.log('Full synchronization completed:', results);
    return results;
  }
};
