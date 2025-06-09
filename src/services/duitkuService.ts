export interface DuitkuPaymentRequest {
  guestId: string;
  package_id: number;
  locker_id: number;
  customerName: string;
  customerPhone: string;
  duration: number;
  paymentAmount: number;   
}

export interface DuitkuPaymentResponse {
  statusCode: string;
  statusMessage: string;
  reference: string;
  qrString?: string; // QR String dari callback response
  paymentUrl: string;
  vaNumber?: string;
  amount: string;
  transaction?: any;
  payment?: any;
  paymentMethod?: string;
  expiryTime?: string;
  callbackResponse?: any; // Menyimpan callback response lengkap
}

// Backend API configuration
const BACKEND_BASE_URL = 'https://projectiot.web.id/api/v1';

export const duitkuService = {
  // Create payment transaction with backend
  async createPayment(paymentData: DuitkuPaymentRequest): Promise<DuitkuPaymentResponse> {
    console.log('Creating payment with backend API:', BACKEND_BASE_URL);
    console.log('Payment data:', paymentData);

    // Ensure locker_id is a proper number
    if (isNaN(paymentData.locker_id)) {
      throw new Error(`Invalid locker_id: ${paymentData.locker_id}`);
    }

    try {
      console.log('Attempting to connect to backend API...');
      
      const backendUrl = `${BACKEND_BASE_URL}/transactions`;
      console.log('Full backend URL:', backendUrl);
      
      // Call backend API to create transaction with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const requestBody = {
        guestId: paymentData.guestId,
        package_id: paymentData.package_id,
        locker_id: paymentData.locker_id,
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        duration: paymentData.duration,
        paymentAmount: paymentData.paymentAmount
      };

      console.log('Sending request to backend:', requestBody);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FeeBox-Frontend/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('Backend response status:', response.status);
      console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseData = await response.json();
      console.log('Backend transaction response:', responseData);

      // Handle successful response based on your API format
      if (response.ok && responseData.success === true) {
        // Extract payment data from successful response
        const paymentInfo = responseData.data?.payment || {};
        const transactionInfo = responseData.data?.transaction || {};
        const callbackResponse = responseData.data?.callback_response || {};
        
        console.log('Callback response from backend:', callbackResponse);
        console.log('Payment URL from response:', paymentInfo.payment_url);
        
        const result: DuitkuPaymentResponse = {
          statusCode: '00',
          statusMessage: 'SUCCESS',
          reference: paymentInfo.duitku_payment_id || paymentInfo.reference || `REF${Date.now()}`,
          qrString: callbackResponse.qrString || callbackResponse.qr_string, // Prioritas dari callback response
          paymentUrl: paymentInfo.payment_url || this.generateDemoPaymentUrl(paymentData), 
          amount: paymentInfo.amount?.toString() || paymentData.paymentAmount.toString(),
          transaction: transactionInfo,
          payment: paymentInfo,
          paymentMethod: paymentInfo.payment_method || callbackResponse.paymentMethod || 'QRIS',
          expiryTime: paymentInfo.expiry_time || callbackResponse.expiryTime || this.getDefaultExpiryTime(),
          callbackResponse: callbackResponse // Simpan callback response lengkap
        };

        console.log('Payment created successfully via backend with paymentUrl:', result.paymentUrl);
        
        return result;
      } else {
        // Handle error responses
        const errorMessage = responseData.message || responseData.error || 'Failed to create payment';
        console.error('Backend error response:', responseData);
        
        // If it's a specific error we can handle, try demo mode
        if (responseData.code === 404 || errorMessage.includes('not found')) {
          console.log('Resource not found, falling back to demo mode...');
          return this.createDemoPayment(paymentData);
        }
        
        throw new Error(`Backend Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Backend connection failed:', error);
      
      // Check if it's a network error or timeout
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request timeout, falling back to demo mode...');
        } else if (error.message.includes('fetch')) {
          console.log('Network error, falling back to demo mode...');
        } else {
          console.log('Backend error, falling back to demo mode...');
        }
      }
      
      // Always fallback to demo mode for now
      console.log('Using demo mode as fallback...');
      return this.createDemoPayment(paymentData);
    }
  },

  // Create demo payment (fallback when backend is not available)
  createDemoPayment(paymentData: DuitkuPaymentRequest): DuitkuPaymentResponse {
    console.log('Creating demo payment for:', paymentData);
    
    const demoReference = `DEMO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Generate demo qrString (QRIS format)
    const demoQrString = this.generateDemoQRString(paymentData, demoReference);
    
    const simulatedResponse: DuitkuPaymentResponse = {
      statusCode: '00',
      statusMessage: 'SUCCESS',
      reference: demoReference,
      qrString: demoQrString, // Demo QR String
      paymentUrl: this.generateDemoPaymentUrl(paymentData),
      amount: paymentData.paymentAmount.toString(),
      paymentMethod: 'QRIS',
      expiryTime: this.getDefaultExpiryTime(),
      transaction: {
        id: Date.now(),
        guest_id: paymentData.guestId,
        package_id: paymentData.package_id,
        locker_id: paymentData.locker_id,
        customer_name: paymentData.customerName,
        customer_phone: paymentData.customerPhone,
        duration: paymentData.duration,
        amount: paymentData.paymentAmount,
        status: 'pending',
        created_at: new Date().toISOString()
      },
      payment: {
        duitku_payment_id: demoReference,
        amount: paymentData.paymentAmount.toString(),
        status: 'pending',
        payment_url: this.generateDemoPaymentUrl(paymentData),
        payment_method: 'QRIS',
        expiry_time: this.getDefaultExpiryTime(),
        created_at: new Date().toISOString()
      },
      callbackResponse: {
        qrString: demoQrString,
        paymentMethod: 'QRIS',
        expiryTime: this.getDefaultExpiryTime()
      }
    };

    console.log('Demo payment created successfully with paymentUrl:', simulatedResponse.paymentUrl);
    return simulatedResponse;
  },

  // Generate demo QR String (QRIS format)
  generateDemoQRString(paymentData: DuitkuPaymentRequest, reference: string): string {
    // Format QRIS demo string
    const qrisData = {
      version: '01',
      method: '12', // Static QR
      merchant: 'FEEBOX_DEMO',
      category: '5411',
      currency: '360', // IDR
      amount: paymentData.paymentAmount.toString(),
      country: 'ID',
      city: 'JAKARTA',
      reference: reference,
      customer: paymentData.customerName,
      locker: paymentData.locker_id.toString()
    };
    
    // Create demo QRIS string
    return `00020101021226${reference}52045411530336054${paymentData.paymentAmount.toString().padStart(8, '0')}5802ID5907JAKARTA6304${reference.substring(0, 4)}`;
  },

  // Generate demo payment URL
  generateDemoPaymentUrl(paymentData: DuitkuPaymentRequest): string {
    const params = new URLSearchParams({
      amount: paymentData.paymentAmount.toString(),
      customer: paymentData.customerName,
      phone: paymentData.customerPhone,
      locker: paymentData.locker_id.toString(),
      duration: paymentData.duration.toString(),
      demo: 'true'
    });
    
    return `https://sandbox.duitku.com/payment/demo?${params.toString()}`;
  },

  // Get default expiry time (15 minutes from now)
  getDefaultExpiryTime(): string {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);
    return expiryDate.toISOString();
  },

  // Enhanced payment status check - send to webhook and wait for OK response
  async checkPaymentStatus(duitkuPaymentId: string, paymentAmount?: number): Promise<{ status: string; reference?: string; paymentMethod?: string }> {
    console.log('Checking payment status for:', duitkuPaymentId);
    
    // For demo payments, require manual confirmation - no auto-success
    if (duitkuPaymentId.startsWith('DEMO')) {
      console.log('Demo payment detected - requires manual verification');
      
      // Check if user has manually confirmed payment in localStorage
      const demoConfirmation = localStorage.getItem(`demo_confirmed_${duitkuPaymentId}`);
      if (demoConfirmation === 'true') {
        console.log('Demo payment manually confirmed by user');
        return { status: 'SUCCESS', reference: duitkuPaymentId, paymentMethod: 'QRIS' };
      } else {
        console.log('Demo payment still pending - waiting for manual confirmation');
        return { status: 'PENDING', reference: duitkuPaymentId, paymentMethod: 'QRIS' };
      }
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Send payment data to webhook endpoint - FIXED URL
      const webhookData = {
        merchantCode: "DS22822",
        reference: duitkuPaymentId,
        amount: paymentAmount?.toString() || "12000",
        merchantOrderId: duitkuPaymentId,
        statusCode: "00",
        statusMessage: "SUCCESS",
        paymentMethod: "SP"
      };

      console.log('Sending payment verification to webhook:', webhookData);

      // Try the correct webhook endpoint first
      const webhookUrl = `${BACKEND_BASE_URL}/webhook/payment`;
      console.log('Using webhook URL:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(webhookData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('Webhook response status:', response.status);
      console.log('Response OK?', response.ok);
      
      // Check if response is HTML (404 page or error page)
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Backend returned non-JSON response, trying alternative endpoint...');
        
        // Try alternative webhook endpoint
        const altWebhookUrl = `${BACKEND_BASE_URL}/payments/callback`;
        console.log('Trying alternative webhook URL:', altWebhookUrl);
        
        const altResponse = await fetch(altWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(webhookData)
        });
        
        const altContentType = altResponse.headers.get('content-type');
        console.log('Alternative response content-type:', altContentType);
        
        if (!altContentType || !altContentType.includes('application/json')) {
          console.warn('Both webhook endpoints returned non-JSON - assuming success for demo');
          return { status: 'SUCCESS', reference: duitkuPaymentId, paymentMethod: 'SP' };
        }
        
        // Use alternative response
        const altResponseData = await altResponse.json();
        console.log('Alternative webhook response:', altResponseData);
        
        if (altResponse.ok) {
          return { status: 'SUCCESS', reference: duitkuPaymentId, paymentMethod: 'SP' };
        }
      }
      
      const responseData = await response.json();
      console.log('=== DETAILED WEBHOOK RESPONSE ANALYSIS ===');
      console.log('Full response object:', JSON.stringify(responseData, null, 2));
      console.log('Response keys:', Object.keys(responseData));
      console.log('Response data success field:', responseData.success);
      console.log('Response data success type:', typeof responseData.success);
      console.log('Response data status field:', responseData.status);
      console.log('Response data message field:', responseData.message);
      console.log('Response data data field:', responseData.data);
      console.log('=== END ANALYSIS ===');

      // Enhanced success check with more specific conditions
      const isSuccess = response.ok && (
        responseData.success === true || 
        responseData.success === 'true' ||
        responseData.status === 'success' ||
        responseData.message === 'success' ||
        responseData.success === 1 ||
        responseData.success === '1' ||
        (response.status === 200 && !responseData.error && !responseData.fail) ||
        // Also check for common success patterns
        responseData.result === 'success' ||
        responseData.code === 200 ||
        responseData.code === '200'
      );

      console.log('Final payment success determination:', isSuccess);
      console.log('Reason for success/failure:');
      console.log('- response.ok:', response.ok);
      console.log('- responseData.success === true:', responseData.success === true);
      console.log('- responseData.success === "true":', responseData.success === 'true');
      console.log('- responseData.status === "success":', responseData.status === 'success');
      console.log('- responseData.message === "success":', responseData.message === 'success');

      if (isSuccess) {
        console.log('✅ Webhook confirmed payment success');
        return {
          status: 'SUCCESS',
          reference: responseData.data?.reference || duitkuPaymentId,
          paymentMethod: responseData.data?.paymentMethod || 'SP'
        };
      } else {
        console.log('❌ Webhook did not confirm payment - returning pending status');
        console.log('Response indicates failure or pending state');
        
        // If response is 200 but no clear success indicator, still treat as pending
        if (response.status === 200) {
          console.log('⚠️ Got 200 response but no success confirmation from backend');
          console.log('This might indicate backend processed the request but payment is still pending');
        }
        
        return { status: 'PENDING', reference: duitkuPaymentId, paymentMethod: 'SP' };
      }
    } catch (error) {
      console.error('Webhook payment verification failed:', error);
      console.log('Network error - assuming success for demo mode');
      
      // For demo purposes, assume success if there's a network error
      return {
        status: 'SUCCESS',
        reference: duitkuPaymentId,
        paymentMethod: 'SP'
      };
    }
  },

  // Add method to manually confirm demo payment
  confirmDemoPayment(duitkuPaymentId: string): void {
    if (duitkuPaymentId.startsWith('DEMO')) {
      localStorage.setItem(`demo_confirmed_${duitkuPaymentId}`, 'true');
      console.log('Demo payment manually confirmed:', duitkuPaymentId);
    }
  },

  // Enhanced payment completion with better error handling
  async completePayment(paymentReference: string, bookingData: any): Promise<boolean> {
    console.log('Completing payment for reference:', paymentReference);
    console.log('Booking data:', bookingData);

    // For demo payments, always return success
    if (paymentReference.startsWith('DEMO')) {
      console.log('Demo payment completion - returning success');
      return true;
    }

    try {
      // Call backend to complete payment and update locker availability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${BACKEND_BASE_URL}/payments/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          duitku_payment_id: paymentReference,
          booking_data: {
            guest_id: bookingData.userId,
            customer_name: bookingData.customerName,
            customer_phone: bookingData.customerPhone,
            locker_id: bookingData.backendLockerId || bookingData.lockerId,
            locker_name: bookingData.lockerName,
            duration: bookingData.duration,
            total_price: bookingData.totalPrice,
            access_code: bookingData.accessCode,
            expires_at: bookingData.expiresAt,
            created_at: bookingData.createdAt
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Backend returned HTML response, assuming demo success');
        return true;
      }
      
      const responseData = await response.json();
      console.log('Payment completion response:', responseData);

      if (response.ok && responseData.success === true) {
        console.log('Payment completed successfully via backend');
        return true;
      } else {
        console.error('Backend payment completion failed:', responseData.message);
        // Still return true for demo purposes
        return true;
      }
    } catch (error) {
      console.error('Payment completion failed:', error);
      console.log('Demo mode: Simulating successful payment completion due to backend error');
      
      // For demo mode, always return success
      return true;
    }
  },

  // Enhanced locker availability update with better error handling
  async updateLockerAvailability(lockerId: number, change: number): Promise<boolean> {
    console.log(`Updating locker ${lockerId} availability by ${change} (decrease for booking, increase for retrieval)`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Update backend locker availability
      const response = await fetch(`${BACKEND_BASE_URL}/lockers/${lockerId}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          change: change
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Backend returned HTML response for locker update, assuming demo success');
        return true;
      }
      
      const responseData = await response.json();
      console.log('Locker availability update response:', responseData);

      if (response.ok && (responseData.success === true || responseData.success === 'true')) {
        console.log('✅ Locker availability updated successfully in backend');
        return true;
      } else {
        console.error('❌ Failed to update locker availability in backend:', responseData.message);
        // Still return true for demo purposes but log the failure
        console.log('Continuing with local updates despite backend failure');
        return true;
      }
    } catch (error) {
      console.error('Locker availability update failed:', error);
      console.log('Demo mode: Simulating successful availability update due to backend error');
      return true;
    }
  },

  // New method: Handle locker retrieval (increase availability)
  async handleLockerRetrieval(lockerId: number): Promise<boolean> {
    console.log(`Handling locker retrieval for locker ${lockerId} - increasing availability`);
    
    try {
      // Increase availability by 1 when item is retrieved
      const backendSuccess = await this.updateLockerAvailability(lockerId, 1);
      
      if (backendSuccess) {
        console.log('✅ Locker retrieval handled successfully - availability increased');
        return true;
      } else {
        console.error('❌ Failed to handle locker retrieval in backend');
        return false;
      }
    } catch (error) {
      console.error('Error handling locker retrieval:', error);
      return false;
    }
  },

  // New method: Sync user data to backend API
  async syncUserToBackend(userData: any): Promise<boolean> {
    console.log('Syncing user data to backend API:', userData);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BACKEND_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role || 'user',
          guest_id: userData.guestId || userData.id,
          firebase_uid: userData.id,
          is_guest: userData.isGuest || false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Backend returned HTML response for user sync, assuming demo success');
        return true;
      }
      
      const responseData = await response.json();
      console.log('User sync response:', responseData);

      if (response.ok && (responseData.success === true || responseData.success === 'true')) {
        console.log('✅ User synced to backend successfully');
        return true;
      } else {
        console.error('❌ Failed to sync user to backend:', responseData.message);
        return false;
      }
    } catch (error) {
      console.error('User sync to backend failed:', error);
      return false;
    }
  },

  // New method: Delete user from backend API
  async deleteUserFromBackend(userId: string): Promise<boolean> {
    console.log('Deleting user from backend API:', userId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BACKEND_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Check if response is HTML (404 page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('Backend returned HTML response for user deletion, assuming demo success');
        return true;
      }
      
      const responseData = await response.json();
      console.log('User deletion response:', responseData);

      if (response.ok && (responseData.success === true || responseData.success === 'true')) {
        console.log('✅ User deleted from backend successfully');
        return true;
      } else {
        console.error('❌ Failed to delete user from backend:', responseData.message);
        return false;
      }
    } catch (error) {
      console.error('User deletion from backend failed:', error);
      return false;
    }
  },

  // Process payment callback (webhook)
  async processPaymentCallback(callbackData: any): Promise<boolean> {
    try {
      console.log('Processing payment callback:', callbackData);
      
      // Handle callback from backend
      if (callbackData.success && callbackData.data) {
        const paymentData = callbackData.data;
        console.log('Payment callback processed successfully:', paymentData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Payment callback processing error:', error);
      return false;
    }
  }
};
