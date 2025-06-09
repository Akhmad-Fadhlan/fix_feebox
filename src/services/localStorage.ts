
export interface LocalBooking {
  id: string;
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
  qrCodeDataURL?: string; // Store QR code data URL
}

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export const localStorageService = {
  createBooking(bookingData: Omit<LocalBooking, 'id'>): string {
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const booking: LocalBooking = {
      ...bookingData,
      id: bookingId
    };
    
    const existingBookings = this.getAllBookings();
    existingBookings.push(booking);
    localStorage.setItem('feebox_bookings', JSON.stringify(existingBookings));
    
    console.log('Booking created with QR code:', booking.accessCode, booking.qrCodeDataURL ? 'QR stored' : 'No QR');
    
    return bookingId;
  },

  getAllBookings(): LocalBooking[] {
    const bookings = localStorage.getItem('feebox_bookings');
    return bookings ? JSON.parse(bookings) : [];
  },

  getBookingByMerchantOrderId(merchantOrderId: string): LocalBooking | null {
    const bookings = this.getAllBookings();
    return bookings.find(booking => booking.merchantOrderId === merchantOrderId) || null;
  },

  getBookingByAccessCode(accessCode: string): LocalBooking | null {
    const bookings = this.getAllBookings();
    const booking = bookings.find(booking => booking.accessCode === accessCode);
    console.log('Looking for booking with access code:', accessCode, 'Found:', booking ? 'Yes' : 'No');
    return booking || null;
  },

  updateBookingStatus(bookingId: string, status: LocalBooking['paymentStatus'], duitkuReference?: string) {
    const bookings = this.getAllBookings();
    const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].paymentStatus = status;
      if (duitkuReference) {
        bookings[bookingIndex].duitkuReference = duitkuReference;
      }
      localStorage.setItem('feebox_bookings', JSON.stringify(bookings));
      console.log('Booking status updated:', bookingId, status);
    }
  },

  updateBookingStatusByOrderId(merchantOrderId: string, status: LocalBooking['paymentStatus'], duitkuReference?: string) {
    const bookings = this.getAllBookings();
    const bookingIndex = bookings.findIndex(booking => booking.merchantOrderId === merchantOrderId);
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex].paymentStatus = status;
      if (duitkuReference) {
        bookings[bookingIndex].duitkuReference = duitkuReference;
      }
      localStorage.setItem('feebox_bookings', JSON.stringify(bookings));
      console.log('Booking status updated by order ID:', merchantOrderId, status);
    }
  },

  getUserBookings(userId: string): LocalBooking[] {
    const bookings = this.getAllBookings();
    return bookings
      .filter(booking => booking.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  removeBooking(bookingId: string): void {
    const bookings = this.getAllBookings();
    const filteredBookings = bookings.filter(booking => booking.id !== bookingId);
    localStorage.setItem('feebox_bookings', JSON.stringify(filteredBookings));
    console.log('Booking removed:', bookingId);
  },

  updateLockerAvailability(lockerId: string, change: number) {
    console.log(`localStorage: Locker ${lockerId} availability changed by:`, change);
  },

  getLockerAvailability(lockerId: string): number {
    return 1;
  },

  // New method to get QR code for access code
  getQRCodeByAccessCode(accessCode: string): string | null {
    const booking = this.getBookingByAccessCode(accessCode);
    return booking?.qrCodeDataURL || null;
  },

  // User management methods
  getAllUsers(): LocalUser[] {
    const users = localStorage.getItem('feebox_users');
    return users ? JSON.parse(users) : [];
  },

  createUser(userData: Omit<LocalUser, 'id'>): string {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: LocalUser = {
      ...userData,
      id: userId
    };
    
    const existingUsers = this.getAllUsers();
    existingUsers.push(user);
    localStorage.setItem('feebox_users', JSON.stringify(existingUsers));
    
    console.log('Local user created:', userId);
    return userId;
  },

  updateUser(userId: string, updates: Partial<LocalUser>): void {
    const users = this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('feebox_users', JSON.stringify(users));
      console.log('Local user updated:', userId);
    }
  },

  removeUser(userId: string): void {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    localStorage.setItem('feebox_users', JSON.stringify(filteredUsers));
    console.log('Local user removed:', userId);
  }
};
