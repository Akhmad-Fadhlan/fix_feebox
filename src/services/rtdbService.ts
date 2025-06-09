import { ref, push, set, get, query, orderByChild, equalTo, child } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';

// User interface untuk RTDB
export interface RTDBUser {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'admin' | 'user' | 'guest';
  key: number;
  isDeleted: boolean;
  created_at: string;
  user_id?: string;
  isGuest?: boolean;
}

class RTDBService {
  // Create guest user in RTDB
  async createGuest(phoneNumber: string): Promise<string> {
    try {
      const guestId = this.generateGuestId();
      
      const guestData = {
        name: `Guest ${guestId}`,
        phone: phoneNumber || '',
        role: 'guest' as const,
        key: Date.now(),
        isDeleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: guestId,
        isGuest: true,
        email: `${guestId}@guest.temp`
      };
      
      console.log('Creating guest in RTDB with data:', guestData);
      
      // Push to RTDB users collection
      const usersRef = ref(realtimeDb, 'users');
      const newUserRef = push(usersRef);
      await set(newUserRef, guestData);
      
      console.log('Guest created successfully in RTDB with ID:', guestId);
      
      return guestId;
    } catch (error) {
      console.error('Error creating guest in RTDB:', error);
      throw error;
    }
  }

  private generateGuestId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GUEST_${timestamp}_${random}`;
  }

  // Get user by user_id from RTDB
  async getUser(userId: string): Promise<RTDBUser | null> {
    try {
      console.log('Getting user from RTDB with ID:', userId);
      
      const usersRef = ref(realtimeDb, 'users');
      const userQuery = query(usersRef, orderByChild('user_id'), equalTo(userId));
      
      const snapshot = await get(userQuery);
      
      if (!snapshot.exists()) {
        console.log('User not found in RTDB');
        return null;
      }
      
      // Get the first match
      const userData = Object.values(snapshot.val())[0] as any;
      const userKey = Object.keys(snapshot.val())[0];
      
      const user: RTDBUser = {
        id: userKey,
        ...userData
      };
      
      console.log('User found in RTDB:', user);
      return user;
    } catch (error) {
      console.error('Error getting user from RTDB:', error);
      return null;
    }
  }

  // Keep compatibility with existing code
  async getGuest(guestId: string): Promise<RTDBUser | null> {
    return this.getUser(guestId);
  }
}

export const rtdbService = new RTDBService();
