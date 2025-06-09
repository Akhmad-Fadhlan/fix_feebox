import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, set, update, get, remove } from "firebase/database";
import { firebaseConfig } from './firebaseConfig';
import { firebaseSyncService } from './firebaseSyncService';
import esp32DeviceService from './esp32DeviceService';
import lockerLogService from './lockerLogService';

// Initialize Firebase (if not already initialized)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Enhanced API configuration with fallback options
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://projectiot.web.id/api/v1';
const API_TIMEOUT = 30000; // 30 seconds timeout

// Define data types
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

export interface LockerLog {
  id: string;
  locker_id: string;
  esp32_device_id: string;
  action: string;
  action_time: string;
  key: number;
  userId?: string;
}

// Helper function to handle API responses
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
// Enhanced sync function with better error handling
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
const generateUniqueId = (prefix: string = 'user') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

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

// Define API service object
export const databaseService = {
  // User-related methods
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

  async createGuest(data: { phone: string }): Promise<string> {
    try {
      console.log('Creating guest with phone:', data.phone);
      
      // Generate a simple guest ID
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const guestData = {
        name: `Guest ${data.phone.slice(-4)}`,
        email: `${guestId}@guest.com`,
        phone: data.phone,
        role: 'user' as const
      };

      // Try to create in backend API first
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(guestData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Guest created in backend:', result);
          
          // Sync to Firebase after backend success
          await syncSpecificDataToFirebase('users');
          
          return result.uid || guestId;
        }
      } catch (apiError) {
        console.warn('Failed to create guest in backend API:', apiError);
      }

      // Store in Firebase Realtime Database as fallback
      try {
        const userRef = ref(realtimeDb, `users/${guestId}`);
        await set(userRef, {
          uid: guestId,
          ...guestData,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('Guest created in Firebase as fallback:', guestId);
      } catch (firebaseError) {
        console.warn('Failed to save guest to Firebase:', firebaseError);
      }

      return guestId;
    } catch (error) {
      console.error('Error creating guest:', error);
      throw error;
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
      const response = await fetch(`${API_BASE_URL}/lockers/${lockerId}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching locker:', error);
      throw error;
    }
  },

  async createLocker(lockerData: Partial<Locker>): Promise<string> {
    try {
      console.log('Creating locker in backend first:', lockerData);
      
      const response = await fetch(`${API_BASE_URL}/lockers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lockerData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Locker created in backend and synced to Firebase');
      return result.id || result;
    } catch (error) {
      console.error('Error creating locker:', error);
      throw error;
    }
  },

  async updateLocker(lockerId: string, updates: Partial<Locker>): Promise<Locker> {
    try {
      console.log('Updating locker in backend first:', lockerId, updates);
      
      const response = await fetch(`${API_BASE_URL}/lockers/${lockerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
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
      
      const response = await fetch(`${API_BASE_URL}/lockers/${lockerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Locker deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting locker:', error);
      throw error;
    }
  },

  // Box Category-related methods
  async getBoxCategories(): Promise<BoxCategory[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/box-categories`);
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
      const response = await fetch(`${API_BASE_URL}/box-categories/${categoryId}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching box category:', error);
      throw error;
    }
  },

  async createBoxCategory(categoryData: BoxCategory): Promise<BoxCategory> {
    try {
      console.log('Creating box category in backend first:', categoryData);
      
      const response = await fetch(`${API_BASE_URL}/box-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
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
      
      const response = await fetch(`${API_BASE_URL}/box-categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('categories');
      
      console.log('Box category updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating box category:', error);
      throw error;
    }
  },

  async deleteBoxCategory(categoryId: string): Promise<void> {
    try {
      console.log('Deleting box category from backend first:', categoryId);
      
      const response = await fetch(`${API_BASE_URL}/box-categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('categories');
      
      console.log('Box category deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting box category:', error);
      throw error;
    }
  },

  // Booking-related methods (updated to use transactions endpoint)
  async getBookings(): Promise<Booking[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`);
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
      console.error('Error fetching bookings:', error);
      // Return empty array as fallback for missing endpoint
      if (error instanceof Error && error.message.includes('API endpoint not found')) {
        console.warn('Transactions endpoint not available, returning empty array');
        return [];
      }
      throw error;
    }
  },

  async getAllBookings(): Promise<Booking[]> {
    return this.getBookings();
  },

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      const allBookings = await this.getBookings();
      return allBookings.filter(booking => booking.userId === userId);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
  },

  async createBooking(bookingData: BookingInput): Promise<Booking> {
    try {
      console.log('Creating booking in backend first:', bookingData);
      
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          checkedOut: bookingData.checkedOut || false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('bookings');
      
      // Also sync lockers to update availability
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Booking created in backend and synced to Firebase');
      
      // Also save to Firebase Realtime Database as backup
      try {
        const bookingRef = ref(realtimeDb, `bookings/${result.id}`);
        const bookingForFirebase = {
          id: result.id,
          userId: result.userId,
          userEmail: result.userEmail,
          customerName: result.customerName,
          customerPhone: result.customerPhone,
          lockerId: result.lockerId,
          lockerName: result.lockerName,
          lockerSize: result.lockerSize,
          duration: result.duration,
          totalPrice: result.totalPrice,
          paymentMethod: result.paymentMethod,
          paymentStatus: result.paymentStatus,
          merchantOrderId: result.merchantOrderId,
          duitkuReference: result.duitkuReference,
          createdAt: result.createdAt || new Date().toISOString(),
          expiresAt: result.expiresAt,
          checkedIn: result.checkedIn || false,
          checkedOut: result.checkedOut || false,
          checkedOutAt: result.checkedOutAt,
          accessCode: result.accessCode,
          qrCodeDataURL: result.qrCodeDataURL
        };
        await set(bookingRef, bookingForFirebase);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      return result;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  async updateBooking(bookingId: string, updates: Partial<BookingInput>): Promise<Booking> {
    try {
      console.log('Updating booking in backend first:', bookingId, updates);
      
      const response = await fetch(`${API_BASE_URL}/transactions/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('bookings');
      
      // Also sync lockers to update availability if needed
      await syncSpecificDataToFirebase('lockers');

      console.log('Booking updated in backend and synced to Firebase');

      // Also update in Firebase Realtime Database
      try {
        const bookingRef = ref(realtimeDb, `bookings/${bookingId}`);
        await update(bookingRef, updates);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      return result;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },

  async updateBookingStatusByOrderId(merchantOrderId: string, paymentStatus: Booking['paymentStatus']): Promise<void> {
    try {
      console.log(`Updating booking status for order ID ${merchantOrderId} to ${paymentStatus}`);
      
      // Fetch all bookings first
      const bookings = await this.getBookings();
      
      // Find the booking with the matching merchantOrderId
      const bookingToUpdate = bookings.find(booking => booking.merchantOrderId === merchantOrderId);
      
      if (!bookingToUpdate) {
        throw new Error(`Booking with merchantOrderId ${merchantOrderId} not found`);
      }
      
      // Construct the update object
      const updates = {
        paymentStatus: paymentStatus
      };
      
      // Call the regular updateBooking method with the booking's ID and the updates
      await this.updateBooking(bookingToUpdate.id!, updates);
      
      console.log(`Successfully updated booking status for order ID ${merchantOrderId}`);
    } catch (error) {
      console.error(`Error updating booking status for order ID ${merchantOrderId}:`, error);
      throw error;
    }
  },

  async deleteBooking(bookingId: string): Promise<void> {
    try {
      console.log('Deleting booking from backend first:', bookingId);
      
      const response = await fetch(`${API_BASE_URL}/transactions/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('bookings');
      
      // Also sync lockers to update availability
      await syncSpecificDataToFirebase('lockers');
      
      console.log('Booking deleted from backend and removed from Firebase');
      
      // Also delete from Firebase Realtime Database
      try {
        const bookingRef = ref(realtimeDb, `bookings/${bookingId}`);
        await remove(bookingRef);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },

  async deleteAllBookings(): Promise<void> {
    try {
      console.warn('Deleting ALL bookings from backend first - BE CAREFUL!');
      
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('bookings');
      
      // Also sync lockers to update availability
      await syncSpecificDataToFirebase('lockers');
      
      console.log('All bookings deleted from backend and removed from Firebase');
      
      // Also delete all bookings from Firebase Realtime Database
      try {
        const bookingsRef = ref(realtimeDb, 'bookings');
        await remove(bookingsRef);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('Error deleting all bookings:', error);
      throw error;
    }
  },

  // Device-related methods (updated to use esp32-devices endpoint)
  async getDevices(): Promise<ESP32Device[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/esp32-devices`);
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
      console.error('Error fetching devices:', error);
      // Return empty array as fallback for missing endpoint
      if (error instanceof Error && error.message.includes('API endpoint not found')) {
        console.warn('ESP32 devices endpoint not available, returning empty array');
        return [];
      }
      throw error;
    }
  },

  async getAllDevices(): Promise<ESP32Device[]> {
    return this.getDevices();
  },

  async getDevice(deviceId: string): Promise<ESP32Device> {
    try {
      const response = await fetch(`${API_BASE_URL}/esp32-devices/${deviceId}`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  },

  async createDevice(deviceData: Partial<ESP32Device>): Promise<string> {
    try {
      console.log('Creating device in backend first:', deviceData);
      
      const response = await fetch(`${API_BASE_URL}/esp32-devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('devices');
      
      console.log('Device created in backend and synced to Firebase');
      return result.id || result;
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  },

  async updateDevice(deviceId: string, updates: Partial<ESP32Device>): Promise<ESP32Device> {
    try {
      console.log('Updating device in backend first:', deviceId, updates);
      
      const response = await fetch(`${API_BASE_URL}/esp32-devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('devices');
      
      console.log('Device updated in backend and synced to Firebase');
      return result;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  },

  async updateDeviceStatusByLockerId(lockerId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      console.log(`Updating device status for locker ${lockerId} to ${status}`);
      
      // Get all devices first
      const devices = await this.getDevices();
      
      // Find device with matching locker_id
      const device = devices.find(d => d.locker_id === lockerId);
      
      if (!device) {
        console.warn(`No device found for locker ID: ${lockerId}`);
        return;
      }
      
      // Update the device status
      await this.updateDevice(device.id!, { 
        status: status,
        last_online: new Date().toISOString()
      });
      
      console.log(`Device status updated successfully for locker ${lockerId}`);
    } catch (error) {
      console.error(`Error updating device status for locker ${lockerId}:`, error);
      throw error;
    }
  },

  async deleteDevice(deviceId: string): Promise<void> {
    try {
      console.log('Deleting device from backend first:', deviceId);
      
      const response = await fetch(`${API_BASE_URL}/esp32-devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('devices');
      
      console.log('Device deleted from backend and removed from Firebase');
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  },

  // Package-related methods
  async getPackages(): Promise<Package[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/packages`);
      const data = await handleResponse(response);
      
      // Transform the data to match our Package interface
      return data.map((pkg: any) => ({
        id: pkg._id,
        name: pkg.name,
        description: pkg.description,
        imageUrl: pkg.imageUrl || pkg.image_url || '',
        price: pkg.price,
        type: pkg.type,
        box_category_id: pkg.box_category_id?.toString() || '',
        key: pkg.key || Date.now(),
        isDeleted: pkg.isDeleted || false,
        basePrice: pkg.basePrice || pkg.price,
        duration: pkg.duration || 24,
        createdAt: pkg.created_at || pkg.createdAt || new Date().toISOString(),
        updatedAt: pkg.updated_at || pkg.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching packages:', error);
      // Return empty array as fallback for missing endpoint
      if (error instanceof Error && error.message.includes('API endpoint not found')) {
        console.warn('Packages endpoint not available, returning empty array');
        return [];
      }
      throw error;
    }
  },

  async getAllPackages(): Promise<Package[]> {
    return this.getPackages();
  },

  async createPackage(packageData: Partial<Package>): Promise<string> {
    try {
      console.log('Creating package in backend first:', packageData);
      
      const response = await fetch(`${API_BASE_URL}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packageData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // No sync service for packages yet, but prepared for future
      console.log('Package created in backend');
      return result.id || result;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  },

  async updatePackage(packageId: string, updates: Partial<Package>): Promise<Package> {
    try {
      console.log('Updating package in backend first:', packageId, updates);
      
      const response = await fetch(`${API_BASE_URL}/packages/${packageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('Package updated in backend');
      return result;
    } catch (error) {
      console.error('Error updating package:', error);
      throw error;
    }
  },

  async deletePackage(packageId: string): Promise<void> {
    try {
      console.log('Deleting package from backend first:', packageId);
      
      const response = await fetch(`${API_BASE_URL}/packages/${packageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('Package deleted from backend');
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  },

  // Payment-related methods (updated to use payments endpoint)
  async getPayments(): Promise<Payment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments`);
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
      // Return empty array as fallback for missing endpoint
      if (error instanceof Error && error.message.includes('API endpoint not found')) {
        console.warn('Payments endpoint not available, returning empty array');
        return [];
      }
      throw error;
    }
  },

  async getAllPayments(): Promise<Payment[]> {
    return this.getPayments();
  },

  async deletePayment(paymentId: string): Promise<void> {
    try {
      console.log('Deleting payment from backend first:', paymentId);
      
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('payments');
      
      console.log('Payment deleted from backend and removed from Firebase');
      
      // Also delete from Firebase Realtime Database
      try {
        const paymentRef = ref(realtimeDb, `payments/${paymentId}`);
        await remove(paymentRef);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      console.log('Updating payment in backend first:', paymentId, updates);
      
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('payments');

      console.log('Payment updated in backend and synced to Firebase');

      // Also update in Firebase Realtime Database
      try {
        const paymentRef = ref(realtimeDb, `payments/${paymentId}`);
        await update(paymentRef, updates);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  async deleteAllPayments(): Promise<void> {
    try {
      console.warn('Deleting ALL payments from backend first - BE CAREFUL!');
      
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Sync to Firebase AFTER successful backend deletion
      await syncSpecificDataToFirebase('payments');
      
      console.log('All payments deleted from backend and removed from Firebase');
      
      // Also delete all payments from Firebase Realtime Database
      try {
        const paymentsRef = ref(realtimeDb, 'payments');
        await remove(paymentsRef);
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('Error deleting all payments:', error);
      throw error;
    }
  },

  async createPayment(userId: string, bookingId: string, paymentData: Partial<Payment>): Promise<Payment> {
    try {
      console.log('Creating payment in backend first:', paymentData);
      
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          bookingId: bookingId,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Sync to Firebase AFTER successful backend operation
      await syncSpecificDataToFirebase('payments');
      
      console.log('Payment created in backend and synced to Firebase');
      
      // Also save to Firebase Realtime Database as backup
      try {
        const paymentRef = ref(realtimeDb, `payments/${result.id}`);
        await set(paymentRef, {
          id: result.id,
          userId: userId,
          bookingId: bookingId,
          ...paymentData,
          createdAt: result.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (firebaseError) {
        console.warn('Failed to sync to Firebase:', firebaseError);
      }

      return result;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  // Locker Log methods (updated to use locker-logs endpoint)
  async getLockerLogs(): Promise<LockerLog[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/locker-logs`);
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
      // Return empty array as fallback for missing endpoint
      if (error instanceof Error && error.message.includes('API endpoint not found')) {
        console.warn('Locker logs endpoint not available, returning empty array');
        return [];
      }
      throw error;
    }
  },

  async getAllLockerLogs(): Promise<LockerLog[]> {
    return this.getLockerLogs();
  },

  async deleteAllLockerLogs(): Promise<void> {
    try {
      console.warn('Deleting ALL locker logs from backend first - BE CAREFUL!');
      
      const response = await fetch(`${API_BASE_URL}/locker-logs`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
  },

  // Initialize auto-sync when service starts - use less frequent sync since backend is now primary
  async initializeAutoSync(): Promise<void> {
    try {
      console.log('Initializing auto-sync with Firebase (backend-first approach)...');
      await firebaseSyncService.startAutoSync(10); // Sync every 10 minutes instead of 5
    } catch (error) {
      console.error('Failed to initialize auto-sync:', error);
    }
  },
};

// Start auto-sync when the service is imported
databaseService.initializeAutoSync().catch(error => {
  console.warn('Auto-sync initialization failed:', error);
});
