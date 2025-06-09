import { LockerLog } from './databaseService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://projectiot.web.id/api/v1';

// Available actions for locker logs
export const LOCKER_ACTIONS = [
  'opened',
  'closed', 
  'locked',
  'unlocked',
  'access_granted',
  'access_denied',
  'maintenance_mode',
  'emergency_unlock',
  'system_reboot',
  'sensor_triggered',
  'battery_low',
  'connection_lost',
  'connection_restored'
] as const;

export type LockerAction = typeof LOCKER_ACTIONS[number];

// Enhanced LockerLog interface
export interface EnhancedLockerLog extends LockerLog {
  esp32_device?: {
    name: string;
    device_identifier: string;
    location?: string;
    status?: string;
  };
  metadata?: {
    signal_strength?: number;
    battery_level?: number;
    temperature?: number;
    humidity?: number;
    error_code?: string;
    error_message?: string;
    ip_address?: string;
    additional_info?: any;
  };
}

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

class LockerLogService {
  
  // GET all locker logs with optional filters
  async getAllLogs(params?: {
    page?: number;
    limit?: number;
    locker_id?: string;
    esp32_device_id?: string;
    action?: string;
    userId?: string;
    start_date?: string;
    end_date?: string;
    sort?: string;
  }): Promise<{
    logs: EnhancedLockerLog[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            searchParams.append(key, value.toString());
          }
        });
      }

      const url = `${API_BASE_URL}/locker-logs${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await fetchWithTimeout(url);
      const data = await handleResponse(response);
      
      // Transform the data to match our interface
      const logs = Array.isArray(data) ? data : data.logs || [];
      const transformedLogs = logs.map((log: any) => ({
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      }));

      return {
        logs: transformedLogs,
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error fetching locker logs:', error);
      throw new Error(`Gagal mengambil data locker logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker log by ID
  async getLogById(logId: string): Promise<EnhancedLockerLog> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/${logId}`);
      const log = await handleResponse(response);
      
      return {
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      };
    } catch (error) {
      console.error('Error fetching locker log:', error);
      throw new Error(`Gagal mengambil locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker logs by locker ID
  async getLogsByLockerId(lockerId: string, limit: number = 50): Promise<EnhancedLockerLog[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/by-locker/${lockerId}?limit=${limit}`);
      const logs = await handleResponse(response);
      
      return Array.isArray(logs) ? logs.map((log: any) => ({
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      })) : [];
    } catch (error) {
      console.error('Error fetching locker logs by locker ID:', error);
      throw new Error(`Gagal mengambil locker logs berdasarkan locker ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker logs by device ID
  async getLogsByDeviceId(deviceId: string, limit: number = 50): Promise<EnhancedLockerLog[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/by-device/${deviceId}?limit=${limit}`);
      const logs = await handleResponse(response);
      
      return Array.isArray(logs) ? logs.map((log: any) => ({
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      })) : [];
    } catch (error) {
      console.error('Error fetching locker logs by device ID:', error);
      throw new Error(`Gagal mengambil locker logs berdasarkan device ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker logs by user ID
  async getLogsByUserId(userId: string, limit: number = 50): Promise<EnhancedLockerLog[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/by-user/${userId}?limit=${limit}`);
      const logs = await handleResponse(response);
      
      return Array.isArray(logs) ? logs.map((log: any) => ({
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      })) : [];
    } catch (error) {
      console.error('Error fetching locker logs by user ID:', error);
      throw new Error(`Gagal mengambil locker logs berdasarkan user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker logs by date range
  async getLogsByDateRange(
    startDate: string,
    endDate: string,
    options?: {
      locker_id?: string;
      action?: string;
      userId?: string;
      limit?: number;
    }
  ): Promise<EnhancedLockerLog[]> {
    try {
      const searchParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });

      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            searchParams.append(key, value.toString());
          }
        });
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/date-range?${searchParams.toString()}`);
      const logs = await handleResponse(response);
      
      return Array.isArray(logs) ? logs.map((log: any) => ({
        id: log._id || log.id,
        locker_id: log.locker_id,
        esp32_device_id: log.esp32_device_id,
        action: log.action,
        action_time: log.action_time,
        key: log.key,
        userId: log.userId || log.user_id,
        esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
          name: log.esp32_device_id.name,
          device_identifier: log.esp32_device_id.device_identifier,
          location: log.esp32_device_id.location,
          status: log.esp32_device_id.status
        } : undefined,
        metadata: log.metadata
      })) : [];
    } catch (error) {
      console.error('Error fetching locker logs by date range:', error);
      throw new Error(`Gagal mengambil locker logs berdasarkan rentang tanggal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // POST create new locker log
  async createLog(logData: {
    locker_id: string;
    esp32_device_id: string;
    action: LockerAction;
    key: number;
    userId?: string;
    action_time?: string;
    metadata?: {
      signal_strength?: number;
      battery_level?: number;
      temperature?: number;
      humidity?: number;
      error_code?: string;
      error_message?: string;
      ip_address?: string;
      additional_info?: any;
    };
  }): Promise<string> {
    try {
      // Validate required fields
      if (!logData.locker_id || !logData.esp32_device_id || !logData.action || typeof logData.key !== 'number') {
        throw new Error('Data log tidak lengkap. Pastikan locker_id, esp32_device_id, action, dan key telah diisi.');
      }

      // Validate action
      if (!LOCKER_ACTIONS.includes(logData.action as LockerAction)) {
        throw new Error(`Action tidak valid. Pilih salah satu dari: ${LOCKER_ACTIONS.join(', ')}`);
      }

      const requestData = {
        locker_id: logData.locker_id,
        esp32_device_id: logData.esp32_device_id,
        action: logData.action,
        key: logData.key,
        userId: logData.userId,
        action_time: logData.action_time || new Date().toISOString(),
        metadata: logData.metadata
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs`, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      const result = await handleResponse(response);
      return result._id || result.id || result;
    } catch (error) {
      console.error('Error creating locker log:', error);
      throw new Error(`Gagal membuat locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // PUT update locker log
  async updateLog(logId: string, updates: Partial<{
    locker_id: string;
    esp32_device_id: string;
    action: LockerAction;
    key: number;
    userId: string;
    action_time: string;
    metadata: any;
  }>): Promise<EnhancedLockerLog> {
    try {
      // Validate action if provided
      if (updates.action && !LOCKER_ACTIONS.includes(updates.action)) {
        throw new Error(`Action tidak valid. Pilih salah satu dari: ${LOCKER_ACTIONS.join(', ')}`);
      }

      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/${logId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const result = await handleResponse(response);
      
      return {
        id: result._id || result.id || logId,
        locker_id: result.locker_id,
        esp32_device_id: result.esp32_device_id,
        action: result.action,
        action_time: result.action_time,
        key: result.key,
        userId: result.userId || result.user_id,
        esp32_device: result.esp32_device_id && typeof result.esp32_device_id === 'object' ? {
          name: result.esp32_device_id.name,
          device_identifier: result.esp32_device_id.device_identifier,
          location: result.esp32_device_id.location,
          status: result.esp32_device_id.status
        } : undefined,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Error updating locker log:', error);
      throw new Error(`Gagal mengupdate locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // DELETE locker log
  async deleteLog(logId: string): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/${logId}`, {
        method: 'DELETE',
      });

      await handleResponse(response);
    } catch (error) {
      console.error('Error deleting locker log:', error);
      throw new Error(`Gagal menghapus locker log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // GET locker logs statistics
  async getLogStats(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    totalLogs: number;
    timeframe: string;
    actionStats: Array<{
      _id: string;
      count: number;
      lastOccurrence: string;
    }>;
    recentActivity: EnhancedLockerLog[];
  }> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/locker-logs/stats?timeframe=${timeframe}`);
      const stats = await handleResponse(response);
      
      return {
        totalLogs: stats.totalLogs || 0,
        timeframe: stats.timeframe || timeframe,
        actionStats: stats.actionStats || [],
        recentActivity: Array.isArray(stats.recentActivity) ? stats.recentActivity.map((log: any) => ({
          id: log._id || log.id,
          locker_id: log.locker_id,
          esp32_device_id: log.esp32_device_id,
          action: log.action,
          action_time: log.action_time,
          key: log.key,
          userId: log.userId || log.user_id,
          esp32_device: log.esp32_device_id && typeof log.esp32_device_id === 'object' ? {
            name: log.esp32_device_id.name,
            device_identifier: log.esp32_device_id.device_identifier,
            location: log.esp32_device_id.location,
            status: log.esp32_device_id.status
          } : undefined,
          metadata: log.metadata
        })) : []
      };
    } catch (error) {
      console.error('Error fetching locker log stats:', error);
      throw new Error(`Gagal mengambil statistik locker logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Quick log creation for common actions
  async logLockerAction(
    lockerId: string, 
    deviceId: string, 
    action: LockerAction, 
    userId?: string,
    metadata?: any
  ): Promise<string> {
    return this.createLog({
      locker_id: lockerId,
      esp32_device_id: deviceId,
      action,
      key: Date.now(), // Use timestamp as key for uniqueness
      userId,
      metadata
    });
  }

  // Utility method to format action text for display
  formatActionText(action: string): string {
    const actionMap: Record<string, string> = {
      'opened': 'Dibuka',
      'closed': 'Ditutup',
      'locked': 'Dikunci',
      'unlocked': 'Kunci Dibuka',
      'access_granted': 'Akses Diberikan',
      'access_denied': 'Akses Ditolak',
      'maintenance_mode': 'Mode Maintenance',
      'emergency_unlock': 'Buka Darurat',
      'system_reboot': 'Sistem Restart',
      'sensor_triggered': 'Sensor Triggered',
      'battery_low': 'Baterai Lemah',
      'connection_lost': 'Koneksi Terputus',
      'connection_restored': 'Koneksi Pulih'
    };
    return actionMap[action] || action;
  }
}

export const lockerLogService = new LockerLogService();
export default lockerLogService;
