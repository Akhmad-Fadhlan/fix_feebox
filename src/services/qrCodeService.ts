
export interface QRCodeData {
  lockerId: string;
  merchantOrderId: string;
  customerPhone: string;
  expiresAt: string;
}

/**
 * Generate QR code data for locker access
 * @param data QR code data
 * @returns Base64 encoded QR code
 */
export const generateQRCode = async (data: QRCodeData): Promise<string> => {
  try {
    // Create a unique access token
    const accessToken = btoa(JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
    
    // For now, return the access token as text
    // In production, you would generate an actual QR code image
    return `LOKERKU_ACCESS_${accessToken}`;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify QR code for locker access
 * @param qrCode QR code to verify
 * @returns Verification result
 */
export const verifyQRCode = (qrCode: string): QRCodeData | null => {
  try {
    if (!qrCode.startsWith('LOKERKU_ACCESS_')) {
      return null;
    }
    
    const accessToken = qrCode.replace('LOKERKU_ACCESS_', '');
    const data = JSON.parse(atob(accessToken));
    
    // Check if QR code is expired
    const expiryDate = new Date(data.expiresAt);
    if (expiryDate < new Date()) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('QR Code verification error:', error);
    return null;
  }
};
