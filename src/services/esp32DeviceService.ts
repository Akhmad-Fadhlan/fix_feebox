import { ESP32Device } from './databaseService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://projectiot.web.id/api/v1';

// Helper function untuk handle response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.data || data; // Handle both wrapped and unwrapped responses
};

// Enhanced fetch function with timeout and better error handling
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

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
      throw new Error('Request timeout');
    }
    throw error;
  }
};

class ESP32DeviceService {
  
  // GET all ESP32 devices
  async getAllDevices(): Promise<ESP32Device[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices`);
      const data = await handleResponse(response);
      
      // Transform the data to match our ESP32Device interface
      return Array.isArray(data) ? data.map((device: any) => ({
        id: device._id || device.id,
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
      })) : [];
    } catch (error) {
      console.error('Error fetching ESP32 devices:', error);
      throw new Error(`Gagal mengambil data ESP32 devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET ESP32 device by ID
  async getDeviceById(deviceId: string): Promise<ESP32Device> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}`);
      const device = await handleResponse(response);
      
      return {
        id: device._id || device.id,
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
      };
    } catch (error) {
      console.error('Error fetching ESP32 device:', error);
      throw new Error(`Gagal mengambil ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET ESP32 device by locker ID
  async getDeviceByLockerId(lockerId: string): Promise<ESP32Device | null> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/by-locker/${lockerId}`);
      const device = await handleResponse(response);
      
      if (!device) return null;
      
      return {
        id: device._id || device.id,
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
      };
    } catch (error) {
      console.error('Error fetching ESP32 device by locker ID:', error);
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw new Error(`Gagal mengambil ESP32 device berdasarkan locker ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // POST create new ESP32 device
  async createDevice(deviceData: Partial<ESP32Device>): Promise<string> {
    try {
      // Validate required fields
      if (!deviceData.name || !deviceData.device_identifier || !deviceData.locker_id || 
          !deviceData.location || !deviceData.ip_address || typeof deviceData.port !== 'number' ||
          typeof deviceData.key !== 'number') {
        throw new Error('Data device tidak lengkap. Pastikan semua field required telah diisi.');
      }

      const requestData = {
        name: deviceData.name,
        device_identifier: deviceData.device_identifier,
        locker_id: deviceData.locker_id,
        status: deviceData.status || 'offline',
        key: deviceData.key,
        location: deviceData.location,
        ip_address: deviceData.ip_address,
        port: deviceData.port
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices`, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const result = await handleResponse(response);
      return result._id || result.id || result;
    } catch (error) {
      console.error('Error creating ESP32 device:', error);
      throw new Error(`Gagal membuat ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // PUT update ESP32 device
  async updateDevice(deviceId: string, updates: Partial<ESP32Device>): Promise<ESP32Device> {
    try {
      // Remove fields that shouldn't be updated directly
      const { id, ...updateData } = updates;

      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const result = await handleResponse(response);
      
      return {
        id: result._id || result.id || deviceId,
        name: result.name,
        device_identifier: result.device_identifier,
        locker_id: result.locker_id,
        status: result.status || 'offline',
        key: result.key,
        isDeleted: result.isDeleted || false,
        last_online: result.last_online || new Date().toISOString(),
        location: result.location,
        ip_address: result.ip_address,
        port: result.port
      };
    } catch (error) {
      console.error('Error updating ESP32 device:', error);
      throw new Error(`Gagal mengupdate ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // PUT update ESP32 device status
  async updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): Promise<ESP32Device> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/${deviceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      const result = await handleResponse(response);
      
      return {
        id: result._id || result.id || deviceId,
        name: result.name,
        device_identifier: result.device_identifier,
        locker_id: result.locker_id,
        status: result.status || status,
        key: result.key,
        isDeleted: result.isDeleted || false,
        last_online: result.last_online || new Date().toISOString(),
        location: result.location,
        ip_address: result.ip_address,
        port: result.port
      };
    } catch (error) {
      console.error('Error updating ESP32 device status:', error);
      throw new Error(`Gagal mengupdate status ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // DELETE ESP32 device
  async deleteDevice(deviceId: string, hardDelete: boolean = false): Promise<void> {
    try {
      const url = `${API_BASE_URL}/esp32-devices/${deviceId}${hardDelete ? '?hardDelete=true' : ''}`;
      const response = await fetchWithTimeout(url, {
        method: 'DELETE',
      });

      await handleResponse(response);
    } catch (error) {
      console.error('Error deleting ESP32 device:', error);
      throw new Error(`Gagal menghapus ESP32 device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET ESP32 devices statistics
  async getDeviceStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    deleted: number;
    onlinePercentage: number;
  }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/esp32-devices/stats`);
      const stats = await handleResponse(response);
      
      return {
        total: stats.total || 0,
        online: stats.online || 0,
        offline: stats.offline || 0,
        deleted: stats.deleted || 0,
        onlinePercentage: stats.onlinePercentage || 0
      };
    } catch (error) {
      console.error('Error fetching ESP32 device stats:', error);
      throw new Error(`Gagal mengambil statistik ESP32 devices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update device status by locker ID (utility method)
  async updateDeviceStatusByLockerId(lockerId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      const device = await this.getDeviceByLockerId(lockerId);
      if (device && device.id) {
        await this.updateDeviceStatus(device.id, status);
      }
    } catch (error) {
      console.error(`Error updating device status for locker ${lockerId}:`, error);
      // Don't throw here as this is often called in background
    }
  }
}

export const esp32DeviceService = new ESP32DeviceService();
export default esp32DeviceService;
