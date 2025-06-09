import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, set, update, get, remove } from "firebase/database";
import { firebaseConfig } from './firebaseConfig';
import { firebaseSyncService } from './firebaseSyncService';

// Initialize Firebase (if not already initialized)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Enhanced API configuration with fallback options
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://projectiot.web.id/api/v1';
const API_TIMEOUT = 30000; // 30 seconds timeout

// Define data types (keeping existing interfaces)
export interface User {
  id?: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: 'admin' | 'user';
  password?: string;
  key?: number;
  isDeleted: boolean;
  isGuest?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: 'admin' | 'user';
  password?: string;
  uid?: string;
  key?: number;
  isDeleted?: boolean;
}

export interface Locker {
  id: string;
  lockerId: string;
  locker_code: string;
  name: string;
  size: string;
  width: number;
  height: number;
  total: number;
  box_category_id: string;
  status: 'available' | 'occupied' | 'maintenance';
  description: string;
  basePrice: number;
  available: number;
  key: number;
  isDeleted: boolean;
  location: string;
  esp32_device_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoxCategory {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id?: string;
  userId: string;
  userEmail: string;
  customerName: string;
  customerPhone: string;
  lockerId: string;
  lockerName: string;
  lockerSize: string;
  duration: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired';
  merchantOrderId: string;
  duitkuReference?: string;
  createdAt: string;
  expiresAt: string;
  checkedIn?: boolean;
  checkedOut?: boolean;
  checkedOutAt?: string;
  accessCode?: string;
  qrCodeDataURL?: string;
}

export interface BookingInput {
  userId: string;
  userEmail: string;
  customerName: string;
  customerPhone: string;
  lockerId: string;
  lockerName: string;
  lockerSize: string;
  duration: number;
  totalPrice: number;
  paymentMethod: string;
  checkedOut?: boolean;
}

export interface Device {
  id: string;
  deviceId: string;
  lockerId: string;
  status: 'online' | 'offline';
  lastPing: string;
  createdAt: string;
  updatedAt: string;
}

export interface ESP32Device {
  id?: string;
  name: string;
  device_identifier: string;
  locker_id: string;
  status: 'online' | 'offline';
  key: number;
  isDeleted: boolean;
  last_online: string;
  location: string;
  ip_address: string;
  port: number;
}

export interface ESP32DeviceInput {
  name: string;
  device_identifier: string;
  locker_id: string;
  status?: 'online' | 'offline';
  key?: number;
  isDeleted?: boolean;
  location: string;
  ip_address: string;
  port: number;
}

export interface Package {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  type: 'daily' | 'weekly' | 'monthly' | 'size_based' | 'special' | 'custom';
  box_category_id: string;
  key: number;
  isDeleted: boolean;
  basePrice: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  payment_method?: string;
  status: 'pending' | 'paid' | 'failed' | 'success';
  duitku_payment_id?: string;
  order_id?: string;
  transaction_time?: string;
  key?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInput {
  bookingId: string;
  amount: number;
  paymentMethod: string;
  status?: 'pending' | 'paid' | 'failed' | 'success';
  duitku_payment_id?: string;
  order_id?: string;
  key?: number;
}

export interface LockerLog {
  id: string;
  locker_id: string;
  esp32_device_id: string;
  action: string;
  action_time: string;
  key: number;
  userId?: string;
}

export interface LockerLogInput {
  locker_id: string;
  esp32_device_id: string;
  action: string;
  action_time?: string;
  key?: number;
  userId?: string;
}

// Enhanced fetch function with timeout and better error handling
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - server tidak merespons dalam waktu yang ditentukan');
    }
    throw error;
  }
};

// Enhanced response handler with better error messages and fallback
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    // Check if response is HTML (likely an error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`API endpoint not found: ${response.url} - Server mungkin sedang down atau URL tidak valid`);
    }
    
    try {
      const errorBody = await response.json();
      const errorMessage = errorBody.message || errorBody.error || `HTTP error! status: ${response.status}`;
      
      // Provide more specific error messages based on status codes
      switch (response.status) {
        case 400:
          throw new Error(`Data tidak valid: ${errorMessage}`);
        case 401:
          throw new Error('Tidak memiliki akses - silakan login ulang');
        case 403:
          throw new Error('Akses ditolak - tidak memiliki permission');
        case 404:
          throw new Error('Data tidak ditemukan di server');
        case 409:
          throw new Error(`Konflik data: ${errorMessage}`);
        case 500:
          throw new Error('Server error - silakan coba lagi atau hubungi administrator');
        case 502:
        case 503:
        case 504:
          throw new Error('Server sedang bermasalah - silakan coba lagi nanti');
        default:
          throw new Error(errorMessage);
      }
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message.includes('Data tidak valid')) {
        throw parseError;
      }
      throw new Error(`Server error (${response.status}) - tidak dapat memproses response`);
    }
  }
  
  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server memberikan response yang tidak valid (bukan JSON)');
  }
  
  try {
    const data = await response.json();
    
    // Handle API response format that wraps data in a 'data' property
    if (data.success && data.data !== undefined) {
      return data.data;
    }
    
    // Handle case where data is directly in response
    if (data.data !== undefined) {
      return data.data;
    }
    
    return data;
  } catch (parseError) {
    throw new Error('Server memberikan response JSON yang tidak valid');
  }
};

// Enhanced sync function that syncs specific data types to Firebase after API operations
const syncSpecificDataToFirebase = async (dataType: string) => {
  try {
    console.log(`Syncing ${dataType} to Firebase after backend operation...`);
    
    switch (dataType) {
      case 'lockers':
        await firebaseSyncService.syncLockersToFirebase();
        break;
      case 'users':
        await firebaseSyncService.syncUsersToFirebase();
        break;
      case 'transactions':
      case 'bookings':
        await firebaseSyncService.syncTransactionsToFirebase();
        break;
      case 'payments':
        await firebaseSyncService.syncPaymentsToFirebase();
        break;
      case 'devices':
        await firebaseSyncService.syncDevicesToFirebase();
        break;
      case 'categories':
        await firebaseSyncService.syncBoxCategoriesToFirebase();
        break;
      case 'locker-logs':
        // Note: Add syncLockerLogsToFirebase if it exists in firebaseSyncService
        console.log('Locker logs sync not implemented yet');
        break;
      default:
        console.warn(`Unknown data type for sync: ${dataType}`);
    }
    
    console.log(`Successfully synced ${dataType} to Firebase`);
  } catch (error) {
    console.warn(`Failed to sync ${dataType} to Firebase after backend operation:`, error);
    // Don't throw error here - sync failure shouldn't break the main operation
  }
};

// Generate unique ID with better uniqueness
const generateUniqueId = (prefix: string = 'item') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

// Locker Availability Management System
export class LockerAvailabilityManager {
  /**
   * Update locker status and availability when a booking is created
   */
  static async bookLocker(lockerId: string, userId?: string): Promise<void> {
    try {
      console.log(`Booking locker ${lockerId}...`);
      
      // Get current locker data
      const locker = await enhancedDatabaseService.getLocker(lockerId);
      
      // Validate availability
      if (locker.available <= 0) {
        throw new Error('Locker tidak tersedia');
      }
      
      if (locker.status === 'maintenance') {
        throw new Error('Locker sedang dalam maintenance');
      }

      // Calculate new availability
      const newAvailable = locker.available - 1;
      const newStatus = newAvailable === 0 ? 'occupied' : locker.status;

      // Update locker status and availability
      await enhancedDatabaseService.updateLocker(lockerId, {
        available: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Create locker log
      await enhancedDatabaseService.createLockerLog({
        locker_id: lockerId,
        esp32_device_id: locker.esp32_device_id || '',
        action: 'booked',
        userId: userId
      });

      console.log(`Locker ${lockerId} successfully booked. Available: ${newAvailable}, Status: ${newStatus}`);
    } catch (error) {
      console.error('Error booking locker:', error);
      throw error;
    }
  }

  /**
   * Update locker status and availability when a booking is cancelled or item is retrieved
   */
  static async releaseLocker(lockerId: string, userId?: string, action: 'cancelled' | 'retrieved' = 'retrieved'): Promise<void> {
    try {
      console.log(`Releasing locker ${lockerId} (${action})...`);
      
      // Get current locker data
      const locker = await enhancedDatabaseService.getLocker(lockerId);
      
      // Calculate new availability
      const newAvailable = Math.min(locker.available + 1, locker.total);
      const newStatus = newAvailable > 0 ? 'available' : locker.status;

      // Update locker status and availability
      await enhancedDatabaseService.updateLocker(lockerId, {
        available: newAvailable,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Create locker log
      await enhancedDatabaseService.createLockerLog({
        locker_id: lockerId,
        esp32_device_id: locker.esp32_device_id || '',
        action: action,
        userId: userId
      });

      console.log(`Locker ${lockerId} successfully released. Available: ${newAvailable}, Status: ${newStatus}`);
    } catch (error) {
      console.error('Error releasing locker:', error);
      throw error;
    }
  }

  /**
   * Validate if a locker is available for booking
   */
  static async validateAvailability(lockerId: string): Promise<boolean> {
    try {
      const locker = await enhancedDatabaseService.getLocker(lockerId);
      return locker.available > 0 && locker.status !== 'maintenance';
    } catch (error) {
      console.error('Error validating locker availability:', error);
      return false;
    }
  }
}

// Enhanced user data transformation
const transformUserData = (userData: any): User => {
  return {
    id: userData._id || userData.id,
    uid: userData.uid || userData._id || userData.id,
    name: userData.name || '',
    email: userData.email || '',
    phone: userData.phone || '',
    address: userData.address || '',
    role: userData.role || 'user',
    key: userData.key || Date.now(),
    isDeleted: userData.isDeleted || false,
    isGuest: userData.isGuest || false,
    createdAt: userData.createdAt || userData.created_at || new Date().toISOString(),
    updatedAt: userData.updatedAt || userData.updated_at || new Date().toISOString()
  };
};

// Define enhanced API service object
export const enhancedDatabaseService = {
  // User-related methods (keeping existing implementation)
  async getUsers(): Promise<User[]> {
    try {
      console.log('Fetching users from backend API...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/users`);
      const data = await handleResponse(response);
      
      // Transform and validate data
      if (!Array.isArray(data)) {
        console.warn('API returned non-array data for users, wrapping in array');
        return data ? [transformUserData(data)] : [];
      }
      
      const transformedUsers = data.map(transformUserData);
      console.log(`Successfully fetched ${transformedUsers.length} users from backend`);
      return transformedUsers;
    } catch (error) {
      console.error('Error fetching users from backend:', error);
      throw new Error(`Gagal mengambil data user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  },

  async getUser(userId: string): Promise<User> {
    try {
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('User ID tidak valid');
      }
      
      console.log(`Fetching user ${userId} from backend...`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`);
      const data = await handleResponse(response);
      
      return transformUserData(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error(`Gagal mengambil data user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createUser(userData: UserInput): Promise<string> {
    try {
      // Validate required fields
      if (!userData.name?.trim()) {
        throw new Error('Nama wajib diisi');
      }
      if (!userData.email?.trim()) {
        throw new Error('Email wajib diisi');
      }
      if (!userData.phone?.trim()) {
        throw new Error('Nomor HP wajib diisi');
      }

      console.log('Creating user in backend first:', userData);
      
      // Prepare user data with required fields for backend
      const userDataForBackend = {
        name: userData.name.trim(),
        email: userData.email.trim(),
        phone: userData.phone.trim(),
        address: userData.address?.trim() || '',
        role: userData.role || 'user',
        password: userData.password || 'defaultPassword123',
        key: userData.key || Date.now(),
        isDeleted: false,
        uid: userData.uid || generateUniqueId('user')
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/users`, {
        method: 'POST',
        body: JSON.stringify(userDataForBackend),
      });

      const result = await handleResponse(response);
      
      // Get the created user ID
      const userId = result.uid || result.id || result._id;
      if (!userId) {
        throw new Error('Server tidak mengembalikan ID user yang valid');
      }
      
      // Sync to Firebase AFTER successful backend operation
      try {
        await syncSpecificDataToFirebase('users');
      } catch (syncError) {
        console.warn('Firebase sync failed but user was created successfully:', syncError);
      }

      console.log('User created in backend successfully:', userId);
      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      
      if (error instanceof Error) {
        // Re-throw validation errors as-is
        if (error.message.includes('wajib diisi')) {
          throw error;
        }
        
        // Handle specific API errors
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          throw new Error('Email atau nomor HP sudah terdaftar');
        }
      }
      
      throw new Error(`Gagal membuat user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('User ID tidak valid untuk update');
      }

      // Validate required fields if they're being updated
      if (updates.name !== undefined && !updates.name?.trim()) {
        throw new Error('Nama tidak boleh kosong');
      }
      if (updates.email !== undefined && !updates.email?.trim()) {
        throw new Error('Email tidak boleh kosong');
      }
      if (updates.phone !== undefined && !updates.phone?.trim()) {
        throw new Error('Nomor HP tidak boleh kosong');
      }

      console.log('Updating user in backend first:', userId, updates);
      
      // Prepare clean update data
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      try {
        await syncSpecificDataToFirebase('users');
      } catch (syncError) {
        console.warn('Firebase sync failed but user was updated successfully:', syncError);
      }

      console.log('User updated in backend successfully');
      return transformUserData(result);
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof Error && error.message.includes('tidak boleh kosong')) {
        throw error;
      }
      
      throw new Error(`Gagal mengupdate user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('User ID tidak valid untuk penghapusan');
      }

      console.log('Deleting user from backend first:', userId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend deletion
      try {
        await syncSpecificDataToFirebase('users');
      } catch (syncError) {
        console.warn('Firebase sync failed but user was deleted successfully:', syncError);
      }
      
      console.log('User deleted from backend successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Gagal menghapus user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Locker-related methods with improved backend-first approach
  async getLockers(): Promise<Locker[]> {
    try {
      console.log('Fetching lockers from backend...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/lockers`);
      const data = await handleResponse(response);
      
      // Transform the data to match our Locker interface
      const transformedData = data.map((locker: any) => ({
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
      }));
      
      console.log('Lockers fetched from backend:', transformedData.length);
      return transformedData;
    } catch (error) {
      console.error('Error fetching lockers:', error);
      throw error;
    }
  },

  async getLocker(lockerId: string): Promise<Locker> {
    try {
      console.log(`Fetching locker ${lockerId} from backend...`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/lockers/${lockerId}`);
      const data = await handleResponse(response);
      
      // Transform single locker data
      return {
        id: data._id,
        lockerId: data.locker_code || '',
        locker_code: data.locker_code || '',
        name: data.name || `Locker ${data.locker_code}`,
        size: `${data.width}x${data.height}`,
        width: parseInt(data.width) || 0,
        height: parseInt(data.height) || 0,
        total: data.total || 1,
        box_category_id: data.box_category_id?.toString() || '',
        status: data.status || 'available',
        description: data.description || '',
        basePrice: data.basePrice || 10000,
        available: data.available || data.total || 1,
        key: data.key || Date.now(),
        isDeleted: data.isDeleted || false,
        location: data.location || '',
        esp32_device_id: data.esp32_device_id || '',
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        updatedAt: data.updated_at || data.updatedAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching locker:', error);
      throw error;
    }
  },

  async createLocker(lockerData: Partial<Locker>): Promise<string> {
    try {
      console.log('Creating locker in backend first:', lockerData);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/lockers`, {
        method: 'POST',
        body: JSON.stringify(lockerData),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Locker created in backend and synced to Firebase');
      return result.id || result._id || result;
    } catch (error) {
      console.error('Error creating locker:', error);
      throw error;
    }
  },

  async updateLocker(lockerId: string, updates: Partial<Locker>): Promise<Locker> {
    try {
      console.log('Updating locker in backend first:', lockerId, updates);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/lockers/${lockerId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Locker updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating locker:', error);
      throw error;
    }
  },

  async deleteLocker(lockerId: string): Promise<void> {
    try {
      console.log('Deleting locker from backend first:', lockerId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/lockers/${lockerId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Locker deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting locker:', error);
      throw error;
    }
  },

  // ESP32 Device methods with full CRUD support
  async getDevices(): Promise<ESP32Device[]> {
    try {
      console.log('Fetching ESP32 devices from backend...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices`);
      const data = await handleResponse(response);
      
      // Transform the data to match our ESP32Device interface
      return data.map((device: any) => ({
        id: device._id,
        name: device.name,
        device_identifier: device.device_identifier,
        locker_id: device.locker_id,
        status: device.status || 'offline',
        key: device.key,
        isDeleted: device.isDeleted || false,
        last_online: device.last_online || new Date().toISOString(),
        location: device.location,
        ip_address: device.ip_address,
        port: device.port
      }));
    } catch (error) {
      console.error('Error fetching ESP32 devices:', error);
      throw new Error(`Gagal mengambil data ESP32 devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAllDevices(): Promise<ESP32Device[]> {
    return this.getDevices();
  },

  async getDevice(deviceId: string): Promise<ESP32Device> {
    try {
      console.log(`Fetching ESP32 device ${deviceId} from backend...`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}`);
      const data = await handleResponse(response);
      
      return {
        id: data._id,
        name: data.name,
        device_identifier: data.device_identifier,
        locker_id: data.locker_id,
        status: data.status || 'offline',
        key: data.key,
        isDeleted: data.isDeleted || false,
        last_online: data.last_online || new Date().toISOString(),
        location: data.location,
        ip_address: data.ip_address,
        port: data.port
      };
    } catch (error) {
      console.error('Error fetching ESP32 device:', error);
      throw new Error(`Gagal mengambil data ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createDevice(deviceData: ESP32DeviceInput): Promise<string> {
    try {
      // Validate required fields
      if (!deviceData.name?.trim()) {
        throw new Error('Nama device wajib diisi');
      }
      if (!deviceData.device_identifier?.trim()) {
        throw new Error('Device identifier wajib diisi');
      }
      if (!deviceData.locker_id?.trim()) {
        throw new Error('Locker ID wajib diisi');
      }

      console.log('Creating ESP32 device in backend first:', deviceData);
      
      const deviceDataForBackend = {
        ...deviceData,
        status: deviceData.status || 'offline',
        key: deviceData.key || Date.now(),
        isDeleted: false,
        last_online: new Date().toISOString()
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices`, {
        method: 'POST',
        body: JSON.stringify(deviceDataForBackend),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('devices');
      
      console.log('ESP32 device created in backend and synced to Firebase');
      return result.id || result._id || result;
    } catch (error) {
      console.error('Error creating ESP32 device:', error);
      throw new Error(`Gagal membuat ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateDevice(deviceId: string, updates: Partial<ESP32Device>): Promise<ESP32Device> {
    try {
      if (!deviceId || deviceId === 'undefined' || deviceId === 'null') {
        throw new Error('Device ID tidak valid untuk update');
      }

      console.log('Updating ESP32 device in backend first:', deviceId, updates);
      
      const updateData = {
        ...updates,
        last_online: new Date().toISOString()
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('devices');
      
      console.log('ESP32 device updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating ESP32 device:', error);
      throw new Error(`Gagal mengupdate ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // NEW: ESP32 Device delete method
  async deleteDevice(deviceId: string): Promise<void> {
    try {
      if (!deviceId || deviceId === 'undefined' || deviceId === 'null') {
        throw new Error('Device ID tidak valid untuk penghapusan');
      }

      console.log('Deleting ESP32 device from backend first:', deviceId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('devices');
      
      console.log('ESP32 device deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting ESP32 device:', error);
      throw new Error(`Gagal menghapus ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Transaction methods with integrated locker availability management
  async getTransactions(): Promise<Booking[]> {
    try {
      console.log('Fetching transactions from backend...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`);
      const data = await handleResponse(response);
      
      // Transform transactions to bookings format
      return data.map((transaction: any) => ({
        id: transaction._id,
        userId: transaction.userId || transaction.user_id,
        userEmail: transaction.userEmail || transaction.user_email,
        customerName: transaction.customerName || transaction.customer_name,
        customerPhone: transaction.customerPhone || transaction.customer_phone,
        lockerId: transaction.lockerId || transaction.locker_id,
        lockerName: transaction.lockerName || transaction.locker_name,
        lockerSize: transaction.lockerSize || transaction.locker_size,
        duration: transaction.duration,
        totalPrice: transaction.totalPrice || transaction.total_price,
        paymentMethod: transaction.paymentMethod || transaction.payment_method,
        paymentStatus: transaction.paymentStatus || transaction.payment_status || 'pending',
        merchantOrderId: transaction.merchantOrderId || transaction.merchant_order_id,
        duitkuReference: transaction.duitkuReference || transaction.duitku_reference,
        createdAt: transaction.created_at || transaction.createdAt || new Date().toISOString(),
        expiresAt: transaction.expiresAt || transaction.expires_at,
        checkedIn: transaction.checkedIn || transaction.checked_in || false,
        checkedOut: transaction.checkedOut || transaction.checked_out || false,
        checkedOutAt: transaction.checkedOutAt || transaction.checked_out_at,
        accessCode: transaction.accessCode || transaction.access_code,
        qrCodeDataURL: transaction.qrCodeDataURL || transaction.qr_code_data_url
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Gagal mengambil data transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAllBookings(): Promise<Booking[]> {
    return this.getTransactions();
  },

  async getBookings(): Promise<Booking[]> {
    return this.getTransactions();
  },

  // NEW: Create transaction with locker availability management
  async createTransaction(bookingData: BookingInput): Promise<string> {
    try {
      // Validate required fields
      if (!bookingData.lockerId?.trim()) {
        throw new Error('Locker ID wajib diisi');
      }
      if (!bookingData.userId?.trim()) {
        throw new Error('User ID wajib diisi');
      }

      console.log('Creating transaction with locker availability management:', bookingData);
      
      // First, validate locker availability
      const isAvailable = await LockerAvailabilityManager.validateAvailability(bookingData.lockerId);
      if (!isAvailable) {
        throw new Error('Locker tidak tersedia untuk booking');
      }

      // Create transaction in backend
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          userId: bookingData.userId,
          userEmail: bookingData.userEmail,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone,
          lockerId: bookingData.lockerId,
          lockerName: bookingData.lockerName,
          lockerSize: bookingData.lockerSize,
          duration: bookingData.duration,
          totalPrice: bookingData.totalPrice,
          paymentMethod: bookingData.paymentMethod,
          paymentStatus: 'pending',
          merchantOrderId: generateUniqueId('order'),
          checkedIn: false,
          checkedOut: bookingData.checkedOut || false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (bookingData.duration * 60 * 60 * 1000)).toISOString()
        }),
      });

      const result = await handleResponse(response);
      const transactionId = result.id || result._id || result;

      // Book the locker (update availability and status)
      await LockerAvailabilityManager.bookLocker(bookingData.lockerId, bookingData.userId);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('transactions');
      
      console.log('Transaction created and locker booked successfully:', transactionId);
      return transactionId;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Gagal membuat transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async createBooking(bookingData: BookingInput): Promise<string> {
    return this.createTransaction(bookingData);
  },

  // Enhanced update transaction with locker status management
  async updateTransaction(transactionId: string, updates: Partial<Booking>): Promise<Booking> {
    try {
      if (!transactionId || transactionId === 'undefined' || transactionId === 'null') {
        throw new Error('Transaction ID tidak valid untuk update');
      }

      console.log('Updating transaction in backend first:', transactionId, updates);
      
      // Get current transaction to check for status changes
      const currentTransaction = await this.getTransaction(transactionId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const result = await handleResponse(response);
      
      // Handle locker status changes
      if (updates.checkedOut === true && !currentTransaction.checkedOut) {
        // Item is being retrieved - release the locker
        await LockerAvailabilityManager.releaseLocker(currentTransaction.lockerId, currentTransaction.userId, 'retrieved');
      } else if (updates.paymentStatus === 'failed' || updates.paymentStatus === 'expired') {
        // Payment failed or expired - release the locker
        await LockerAvailabilityManager.releaseLocker(currentTransaction.lockerId, currentTransaction.userId, 'cancelled');
      }
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('transactions');
      
      console.log('Transaction updated in backend and locker status managed');
      return result;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(`Gagal mengupdate transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking> {
    return this.updateTransaction(bookingId, updates);
  },

  async getTransaction(transactionId: string): Promise<Booking> {
    try {
      console.log(`Fetching transaction ${transactionId} from backend...`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${transactionId}`);
      const data = await handleResponse(response);
      
      return {
        id: data._id,
        userId: data.userId || data.user_id,
        userEmail: data.userEmail || data.user_email,
        customerName: data.customerName || data.customer_name,
        customerPhone: data.customerPhone || data.customer_phone,
        lockerId: data.lockerId || data.locker_id,
        lockerName: data.lockerName || data.locker_name,
        lockerSize: data.lockerSize || data.locker_size,
        duration: data.duration,
        totalPrice: data.totalPrice || data.total_price,
        paymentMethod: data.paymentMethod || data.payment_method,
        paymentStatus: data.paymentStatus || data.payment_status || 'pending',
        merchantOrderId: data.merchantOrderId || data.merchant_order_id,
        duitkuReference: data.duitkuReference || data.duitku_reference,
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
        expiresAt: data.expiresAt || data.expires_at,
        checkedIn: data.checkedIn || data.checked_in || false,
        checkedOut: data.checkedOut || data.checked_out || false,
        checkedOutAt: data.checkedOutAt || data.checked_out_at,
        accessCode: data.accessCode || data.access_code,
        qrCodeDataURL: data.qrCodeDataURL || data.qr_code_data_url
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw new Error(`Gagal mengambil data transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    try {
      if (!transactionId || transactionId === 'undefined' || transactionId === 'null') {
        throw new Error('Transaction ID tidak valid untuk penghapusan');
      }

      console.log('Deleting transaction from backend first:', transactionId);
      
      // Get transaction data before deletion to release locker
      const transaction = await this.getTransaction(transactionId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Release the locker if transaction was active
      if (!transaction.checkedOut) {
        await LockerAvailabilityManager.releaseLocker(transaction.lockerId, transaction.userId, 'cancelled');
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('transactions');
      
      console.log('Transaction deleted from backend and locker released');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(`Gagal menghapus transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteBooking(bookingId: string): Promise<void> {
    return this.deleteTransaction(bookingId);
  },

  // Payment methods with full CRUD support
  async getPayments(): Promise<Payment[]> {
    try {
      console.log('Fetching payments from backend...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/payments`);
      const data = await handleResponse(response);
      
      // Transform the data to match our Payment interface
      return data.map((payment: any) => ({
        id: payment._id,
        bookingId: payment.bookingId || payment.booking_id || payment.transaction_id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod || payment.payment_method,
        payment_method: payment.payment_method,
        status: payment.status,
        duitku_payment_id: payment.duitku_payment_id,
        order_id: payment.order_id,
        transaction_time: payment.transaction_time,
        key: payment.key,
        createdAt: payment.created_at || payment.createdAt || new Date().toISOString(),
        updatedAt: payment.updated_at || payment.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw new Error(`Gagal mengambil data pembayaran: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAllPayments(): Promise<Payment[]> {
    return this.getPayments();
  },

  // NEW: Create payment method
  async createPayment(paymentData: PaymentInput): Promise<string> {
    try {
      // Validate required fields
      if (!paymentData.bookingId?.trim()) {
        throw new Error('Booking ID wajib diisi');
      }
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Jumlah pembayaran wajib diisi dan harus lebih dari 0');
      }
      if (!paymentData.paymentMethod?.trim()) {
        throw new Error('Metode pembayaran wajib diisi');
      }

      console.log('Creating payment in backend first:', paymentData);
      
      const paymentDataForBackend = {
        bookingId: paymentData.bookingId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        payment_method: paymentData.paymentMethod,
        status: paymentData.status || 'pending',
        duitku_payment_id: paymentData.duitku_payment_id,
        order_id: paymentData.order_id || generateUniqueId('pay'),
        transaction_time: new Date().toISOString(),
        key: paymentData.key || Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentDataForBackend),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('payments');
      
      console.log('Payment created in backend and synced to Firebase');
      return result.id || result._id || result;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error(`Gagal membuat pembayaran: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
        throw new Error('Payment ID tidak valid untuk update');
      }

      console.log('Updating payment in backend first:', paymentId, updates);
      
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('payments');
      
      console.log('Payment updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw new Error(`Gagal mengupdate pembayaran: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deletePayment(paymentId: string): Promise<void> {
    try {
      if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
        throw new Error('Payment ID tidak valid untuk penghapusan');
      }

      console.log('Deleting payment from backend first:', paymentId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('payments');
      
      console.log('Payment deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw new Error(`Gagal menghapus pembayaran: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Locker Log methods with full CRUD support
  async getLockerLogs(): Promise<LockerLog[]> {
    try {
      console.log('Fetching locker logs from backend...');
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs`);
      const data = await handleResponse(response);
      
      // Transform the data to match our LockerLog interface
      return data.map((log: any) => ({
        id: log._id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id
      }));
    } catch (error) {
      console.error('Error fetching locker logs:', error);
      throw new Error(`Gagal mengambil data locker logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getAllLockerLogs(): Promise<LockerLog[]> {
    return this.getLockerLogs();
  },

  // NEW: Create locker log method
  async createLockerLog(logData: LockerLogInput): Promise<string> {
    try {
      // Validate required fields
      if (!logData.locker_id?.trim()) {
        throw new Error('Locker ID wajib diisi');
      }
      if (!logData.action?.trim()) {
        throw new Error('Action wajib diisi');
      }

      console.log('Creating locker log in backend first:', logData);
      
      const logDataForBackend = {
        locker_id: logData.locker_id,
        esp32_device_id: logData.esp32_device_id || '',
        action: logData.action,
        action_time: logData.action_time || new Date().toISOString(),
        key: logData.key || Date.now(),
        userId: logData.userId
      };
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs`, {
        method: 'POST',
        body: JSON.stringify(logDataForBackend),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('locker-logs');
      
      console.log('Locker log created in backend and synced to Firebase');
      return result.id || result._id || result;
    } catch (error) {
      console.error('Error creating locker log:', error);
      throw new Error(`Gagal membuat locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // NEW: Update locker log method
  async updateLockerLog(logId: string, updates: Partial<LockerLog>): Promise<LockerLog> {
    try {
      if (!logId || logId === 'undefined' || logId === 'null') {
        throw new Error('Locker Log ID tidak valid untuk update');
      }

      console.log('Updating locker log in backend first:', logId, updates);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/${logId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('locker-logs');
      
      console.log('Locker log updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating locker log:', error);
      throw new Error(`Gagal mengupdate locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // NEW: Delete locker log method
  async deleteLockerLog(logId: string): Promise<void> {
    try {
      if (!logId || logId === 'undefined' || logId === 'null') {
        throw new Error('Locker Log ID tidak valid untuk penghapusan');
      }

      console.log('Deleting locker log from backend first:', logId);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/${logId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('locker-logs');
      
      console.log('Locker log deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting locker log:', error);
      throw new Error(`Gagal menghapus locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async deleteAllLockerLogs(): Promise<void> {
    try {
      console.warn('Deleting ALL locker logs from backend first - BE CAREFUL!');
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs`, {
        method: 'DELETE',
      });

      await handleResponse(response);
      
      console.log('All locker logs deleted from backend');
      
      // Also delete all logs from Firebase Realtime Database
      try {
        const logsRef = ref(realtimeDb, 'lockerLogs');
        await remove(logsRef);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('Error deleting all locker logs:', error);
      throw new Error(`Gagal menghapus semua locker logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Box Category methods (keeping existing implementation)
  async getBoxCategories(): Promise<BoxCategory[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/box-categories`);
      const data = await handleResponse(response);
      
      // Transform the data to match our BoxCategory interface
      return data.map((category: any) => ({
        id: category._id,
        name: category.name,
        type: category.type,
        width: parseInt(category.width) || 0,
        height: parseInt(category.height) || 0,
        createdAt: category.created_at || category.createdAt || new Date().toISOString(),
        updatedAt: category.updated_at || category.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching box categories:', error);
      throw error;
    }
  },

  async getBoxCategory(categoryId: string): Promise<BoxCategory> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/box-categories/${categoryId}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching box category:', error);
      throw error;
    }
  },

  async createBoxCategory(categoryData: BoxCategory): Promise<BoxCategory> {
    try {
      console.log('Creating box category in backend first:', categoryData);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/box-categories`, {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('categories');

      console.log('Box category created in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error creating box category:', error);
      throw error;
    }
  },

  async updateBoxCategory(categoryId: string, updates: Partial<BoxCategory>): Promise<BoxCategory> {
    try {
      console.log('Updating box category in backend first:', categoryId, updates);
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/box-categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const result = await handleResponse(response);
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('categories');

      console.log('Box category updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating box category:', error);
      throw error;
    }
  },

  // Initialize default data
  async initializeDefaultData(): Promise<void> {
    try {
      console.log('Initializing default data...');
      // This is a placeholder method for initialization
    } catch (error) {
      console.error('Error initializing default data:', error);
      throw error;
    }
  }
};

// Export the LockerAvailabilityManager for external use
export { LockerAvailabilityManager };

// Export main service as both named and default for compatibility
export const databaseService = enhancedDatabaseService;
export default enhancedDatabaseService;
