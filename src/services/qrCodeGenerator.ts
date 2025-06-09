
import QRCode from 'qrcode';

export interface QRCodeData {
  accessCode: string;
  lockerName: string;
  customerName: string;
  expiresAt: string;
}

/**
 * Generate QR code data URL for locker access
 */
export const generateQRCode = async (data: QRCodeData): Promise<string> => {
  try {
    const qrData = JSON.stringify({
      type: 'LOCKER_ACCESS',
      accessCode: data.accessCode,
      lockerName: data.lockerName,
      customerName: data.customerName,
      expiresAt: data.expiresAt,
      timestamp: new Date().toISOString()
    });

    console.log('Generating QR code with data:', qrData);

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    console.log('QR code generated successfully');
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate simple QR code for access code only
 */
export const generateAccessCodeQR = async (accessCode: string): Promise<string> => {
  try {
    console.log('Generating access code QR for:', accessCode);
    
    const qrCodeDataURL = await QRCode.toDataURL(accessCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    console.log('Access code QR generated successfully');
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating access code QR:', error);
    throw new Error('Failed to generate access code QR');
  }
};
