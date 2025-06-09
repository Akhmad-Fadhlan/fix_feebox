
import { toast } from '@/hooks/use-toast';
import { generateQRCode, generateAccessCodeQR, QRCodeData } from './qrCodeGenerator';

// Fonnte API configuration
const FONNTE_API_KEY = 'gLSvUnAMcMFS1DXisNZA';
const FONNTE_API_URL = 'https://api.fonnte.com/send';

interface NotificationParams {
  phone: string;
  message: string;
  useTemplate?: boolean;
  lockerDetails?: {
    lockerName: string;
    customerName: string;
    duration: string;
    accessCode: string;
    expiresAt: string;
  };
}

/**
 * Generate a 6-digit access code
 */
export const generateAccessCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Send a WhatsApp notification using Fonnte
 * @param params Notification parameters 
 * @returns Promise with the API response
 */
export const sendWhatsAppNotification = async (params: NotificationParams) => {
  try {
    const { phone, message, useTemplate = false, lockerDetails } = params;
    
    // Format phone number (remove '+' if present and add country code if needed)
    let formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
    // Add country code (62) if not present
    if (!formattedPhone.startsWith('62')) {
      formattedPhone = `62${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}`;
    }
    
    // Get message content and generate QR codes
    let messageContent = message;
    let qrCodeDataURL = '';
    
    if (useTemplate && lockerDetails) {
      // Generate QR code for the access
      const qrData: QRCodeData = {
        accessCode: lockerDetails.accessCode,
        lockerName: lockerDetails.lockerName,
        customerName: lockerDetails.customerName,
        expiresAt: lockerDetails.expiresAt
      };
      
      qrCodeDataURL = await generateQRCode(qrData);
      messageContent = getLockerNotificationTemplate(lockerDetails);
      
      console.log('Generated QR Code:', qrCodeDataURL);
    }
    
    const postData: any = {
      target: formattedPhone,
      message: messageContent,
      countryCode: '62', // Indonesian country code
    };

    // Add QR code as file if generated
    if (qrCodeDataURL) {
      postData.file = qrCodeDataURL;
      console.log('Adding QR code file to message');
    }
    
    console.log('Sending WhatsApp via Fonnte:', postData);
    
    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData)
    });
    
    const data = await response.json();
    console.log('Fonnte response:', data);
    
    if (!response.ok || data.status === false) {
      throw new Error(data.reason || data.message || 'Failed to send WhatsApp notification');
    }
    
    toast({
      title: "Notifikasi Berhasil",
      description: "Notifikasi WhatsApp dengan kode akses dan QR code berhasil dikirim"
    });
    return data;
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    toast({
      title: "Notifikasi Gagal",
      description: "Gagal mengirim notifikasi WhatsApp: " + (error as Error).message,
      variant: "destructive"
    });
    throw error;
  }
};

/**
 * Get locker notification template
 * @param lockerDetails Locker details
 * @returns Formatted template message
 */
export const getLockerNotificationTemplate = (lockerDetails: {
  lockerName: string;
  customerName: string;
  duration: string;
  accessCode: string;
}): string => {
  return `*FEEBOX - KONFIRMASI PENYEWAAN*

Yth. *${lockerDetails.customerName}*,

Penyewaan loker Anda telah berhasil dikonfirmasi!

📦 *Detail Loker:*
- Nama Loker: *${lockerDetails.lockerName}*
- Durasi: *${lockerDetails.duration}*

🔐 *Kode Akses Loker:*
*${lockerDetails.accessCode}*

*PENTING:* 
- Simpan kode akses ini dengan baik
- Gunakan kode akses untuk membuka loker Anda
- QR Code terlampir untuk akses mudah
- Pastikan mengambil barang sebelum masa sewa berakhir

✅ Status: *Barang sudah ditempatkan di loker*

Terima kasih telah menggunakan layanan FeeBox!

Best regards,
Tim FeeBox`;
};
