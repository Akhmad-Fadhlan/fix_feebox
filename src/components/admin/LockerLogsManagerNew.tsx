import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Activity, 
  RefreshCw,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  MapPin,
  Clock,
  Cpu,
  BarChart3
} from 'lucide-react';
import lockerLogService, { LOCKER_ACTIONS, LockerAction, EnhancedLockerLog } from '@/services/lockerLogService';
import esp32DeviceService from '@/services/esp32DeviceService';
import { ESP32Device } from '@/services/databaseService';

interface LockerLogsManagerProps {
  onDataChange?: () => void;
}

export function LockerLogsManagerNew({ onDataChange }: LockerLogsManagerProps) {
  const [logs, setLogs] = useState<EnhancedLockerLog[]>([]);
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<EnhancedLockerLog | null>(null);
  const [viewingLog, setViewingLog] = useState<EnhancedLockerLog | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalLogs: 0,
    timeframe: '24h',
    actionStats: [] as Array<{ _id: string; count: number; lastOccurrence: string }>,
    recentActivity: [] as EnhancedLockerLog[]
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  });

  const [newLog, setNewLog] = useState({
    locker_id: '',
    esp32_device_id: '',
    action: 'opened' as LockerAction,
    key: Date.now(),
    userId: '',
    metadata: {
      signal_strength: -50,
      battery_level: 85,
      temperature: 25,
      humidity: 60
    }
  });

  // Load data
  const loadLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.itemsPerPage,
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(getDateRange())
      };

      const [logsData, statsData] = await Promise.all([
        lockerLogService.getAllLogs(params),
        lockerLogService.getLogStats('24h')
      ]);
      
      setLogs(logsData.logs);
      setStats(statsData);
      
      if (logsData.pagination) {
        setPagination(logsData.pagination);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data locker logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const devicesData = await esp32DeviceService.getAllDevices();
      setDevices(devicesData);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  useEffect(() => {
    loadLogs();
    loadDevices();
  }, [actionFilter, dateFilter]);

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const ranges: Record<string, { start_date: string; end_date: string } | {}> = {
      'all': {},
      '1h': {
        start_date: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        end_date: now.toISOString()
      },
      '24h': {
        start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: now.toISOString()
      },
      '7d': {
        start_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: now.toISOString()
      },
      '30d': {
        start_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: now.toISOString()
      }
    };
    return ranges[dateFilter] || {};
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.locker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (log.esp32_device && log.esp32_device.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // Create log
  const handleCreateLog = async () => {
    try {
      if (!newLog.locker_id || !newLog.esp32_device_id || !newLog.action) {
        toast({
          title: "Error",
          description: "Locker ID, ESP32 Device, dan Action harus diisi",
          variant: "destructive",
        });
        return;
      }

      await lockerLogService.createLog(newLog);
      
      setNewLog({
        locker_id: '',
        esp32_device_id: '',
        action: 'opened' as LockerAction,
        key: Date.now(),
        userId: '',
        metadata: {
          signal_strength: -50,
          battery_level: 85,
          temperature: 25,
          humidity: 60
        }
      });
      
      setIsCreateDialogOpen(false);
      await loadLogs();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Locker log berhasil dibuat",
      });
    } catch (error) {
      console.error('Error creating log:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal membuat locker log",
        variant: "destructive",
      });
    }
  };

  // Update log
  const handleUpdateLog = async () => {
    if (!editingLog || !editingLog.id) return;
    
    try {
      await lockerLogService.updateLog(editingLog.id, {
        locker_id: editingLog.locker_id,
        esp32_device_id: editingLog.esp32_device_id,
        action: editingLog.action as LockerAction,
        key: editingLog.key,
        userId: editingLog.userId,
        action_time: editingLog.action_time,
        metadata: editingLog.metadata
      });
      
      setEditingLog(null);
      setIsEditDialogOpen(false);
      await loadLogs();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Locker log berhasil diupdate",
      });
    } catch (error) {
      console.error('Error updating log:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengupdate locker log",
        variant: "destructive",
      });
    }
  };

  // Delete log
  const handleDeleteLog = async (logId: string) => {
    try {
      await lockerLogService.deleteLog(logId);
      await loadLogs();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Locker log berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menghapus locker log",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    const icons: Record<string, JSX.Element> = {
      'opened': <Unlock className="w-4 h-4 text-green-600" />,
      'closed': <Lock className="w-4 h-4 text-blue-600" />,
      'locked': <Lock className="w-4 h-4 text-red-600" />,
      'unlocked': <Unlock className="w-4 h-4 text-green-600" />,
      'access_granted': <Unlock className="w-4 h-4 text-green-600" />,
      'access_denied': <AlertTriangle className="w-4 h-4 text-red-600" />,
      'maintenance_mode': <Activity className="w-4 h-4 text-orange-600" />,
      'emergency_unlock': <AlertTriangle className="w-4 h-4 text-red-600" />,
      'system_reboot': <RefreshCw className="w-4 h-4 text-blue-600" />,
      'sensor_triggered': <Activity className="w-4 h-4 text-orange-600" />,
      'battery_low': <AlertTriangle className="w-4 h-4 text-yellow-600" />,
      'connection_lost': <AlertTriangle className="w-4 h-4 text-red-600" />,
      'connection_restored': <Activity className="w-4 h-4 text-green-600" />
    };
    return icons[action] || <FileText className="w-4 h-4 text-gray-600" />;
  };

  // Get action color
  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'opened': 'bg-green-100 text-green-800',
      'closed': 'bg-blue-100 text-blue-800',
      'locked': 'bg-red-100 text-red-800',
      'unlocked': 'bg-green-100 text-green-800',
      'access_granted': 'bg-green-100 text-green-800',
      'access_denied': 'bg-red-100 text-red-800',
      'maintenance_mode': 'bg-orange-100 text-orange-800',
      'emergency_unlock': 'bg-red-100 text-red-800',
      'system_reboot': 'bg-blue-100 text-blue-800',
      'sensor_triggered': 'bg-orange-100 text-orange-800',
      'battery_low': 'bg-yellow-100 text-yellow-800',
      'connection_lost': 'bg-red-100 text-red-800',
      'connection_restored': 'bg-green-100 text-green-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold">{stats.totalLogs}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktivitas Hari Ini</p>
                <p className="text-2xl font-bold">{stats.recentActivity.length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aksi Terbanyak</p>
                <p className="text-lg font-bold">
                  {stats.actionStats.length > 0 ? 
                    lockerLogService.formatActionText(stats.actionStats[0]._id) : 
                    '-'
                  }
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Timeframe</p>
                <p className="text-lg font-bold">{stats.timeframe}</p>
              </div>
              <Clock className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Locker Logs ({filteredLogs.length})
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                {/* Action Filter */}
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Action</SelectItem>
                    {LOCKER_ACTIONS.map(action => (
                      <SelectItem key={action} value={action}>
                        {lockerLogService.formatActionText(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="1h">1 Jam</SelectItem>
                    <SelectItem value="24h">24 Jam</SelectItem>
                    <SelectItem value="7d">7 Hari</SelectItem>
                    <SelectItem value="30d">30 Hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                {/* Refresh Button */}
                <Button variant="outline" size="sm" onClick={() => loadLogs()} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                {/* Create Button */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Log
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Tambah Locker Log Baru</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="locker_id">Locker ID</Label>
                        <Input
                          id="locker_id"
                          value={newLog.locker_id}
                          onChange={(e) => setNewLog({...newLog, locker_id: e.target.value})}
                          placeholder="LOCKER_JKT_001"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="esp32_device_id">ESP32 Device</Label>
                        <Select 
                          value={newLog.esp32_device_id} 
                          onValueChange={(value) => setNewLog({...newLog, esp32_device_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ESP32 Device" />
                          </SelectTrigger>
                          <SelectContent>
                            {devices.map((device) => (
                              <SelectItem key={device.id} value={device.id!}>
                                {device.name} ({device.device_identifier})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="action">Action</Label>
                        <Select 
                          value={newLog.action} 
                          onValueChange={(value) => setNewLog({...newLog, action: value as LockerAction})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCKER_ACTIONS.map(action => (
                              <SelectItem key={action} value={action}>
                                {lockerLogService.formatActionText(action)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="userId">User ID (Optional)</Label>
                        <Input
                          id="userId"
                          value={newLog.userId}
                          onChange={(e) => setNewLog({...newLog, userId: e.target.value})}
                          placeholder="user123"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="key">Key</Label>
                        <Input
                          id="key"
                          type="number"
                          value={newLog.key}
                          onChange={(e) => setNewLog({...newLog, key: parseInt(e.target.value) || Date.now()})}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleCreateLog}>
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Locker ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(log.action_time)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.locker_id}</TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          <span className="flex items-center gap-1">
                            {getActionIcon(log.action)}
                            {lockerLogService.formatActionText(log.action)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.esp32_device ? (
                          <div>
                            <p className="font-medium text-sm">{log.esp32_device.name}</p>
                            <p className="text-xs text-gray-500">{log.esp32_device.device_identifier}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.userId ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="text-sm">{log.userId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.metadata ? (
                          <div className="text-xs text-gray-600">
                            {log.metadata.battery_level && (
                              <div>🔋 {log.metadata.battery_level}%</div>
                            )}
                            {log.metadata.temperature && (
                              <div>🌡️ {log.metadata.temperature}°C</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingLog(log);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingLog({...log});
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Locker Log</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Yakin ingin menghapus log ini? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteLog(log.id!)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada locker logs yang ditemukan
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Halaman {pagination.currentPage} dari {pagination.totalPages} 
                ({pagination.totalItems} total item)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => loadLogs(pagination.currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => loadLogs(pagination.currentPage + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Log Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Locker Log</DialogTitle>
          </DialogHeader>
          
          {editingLog && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-locker_id">Locker ID</Label>
                <Input
                  id="edit-locker_id"
                  value={editingLog.locker_id}
                  onChange={(e) => setEditingLog({...editingLog, locker_id: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-action">Action</Label>
                <Select 
                  value={editingLog.action} 
                  onValueChange={(value) => setEditingLog({...editingLog, action: value as LockerAction})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCKER_ACTIONS.map(action => (
                      <SelectItem key={action} value={action}>
                        {lockerLogService.formatActionText(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-userId">User ID</Label>
                <Input
                  id="edit-userId"
                  value={editingLog.userId || ''}
                  onChange={(e) => setEditingLog({...editingLog, userId: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-action_time">Waktu Action</Label>
                <Input
                  id="edit-action_time"
                  type="datetime-local"
                  value={new Date(editingLog.action_time).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingLog({...editingLog, action_time: new Date(e.target.value).toISOString()})}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateLog}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Log Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Locker Log</DialogTitle>
          </DialogHeader>
          
          {viewingLog && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Waktu</Label>
                  <p className="mt-1 text-sm">{formatDate(viewingLog.action_time)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Action</Label>
                  <div className="mt-1">
                    <Badge className={getActionColor(viewingLog.action)}>
                      {lockerLogService.formatActionText(viewingLog.action)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Locker ID</Label>
                <p className="mt-1">{viewingLog.locker_id}</p>
              </div>
              
              {viewingLog.esp32_device && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">ESP32 Device</Label>
                  <div className="mt-1">
                    <p className="font-medium">{viewingLog.esp32_device.name}</p>
                    <p className="text-sm text-gray-500">{viewingLog.esp32_device.device_identifier}</p>
                  </div>
                </div>
              )}
              
              {viewingLog.userId && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">User ID</Label>
                  <p className="mt-1">{viewingLog.userId}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Key</Label>
                  <p className="mt-1">{viewingLog.key}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Log ID</Label>
                  <p className="mt-1 text-xs font-mono">{viewingLog.id}</p>
                </div>
              </div>
              
              {viewingLog.metadata && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Metadata</Label>
                  <div className="mt-1 text-sm grid grid-cols-2 gap-2">
                    {viewingLog.metadata.battery_level && (
                      <div>🔋 Battery: {viewingLog.metadata.battery_level}%</div>
                    )}
                    {viewingLog.metadata.signal_strength && (
                      <div>📶 Signal: {viewingLog.metadata.signal_strength}dBm</div>
                    )}
                    {viewingLog.metadata.temperature && (
                      <div>🌡️ Temp: {viewingLog.metadata.temperature}°C</div>
                    )}
                    {viewingLog.metadata.humidity && (
                      <div>💧 Humidity: {viewingLog.metadata.humidity}%</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
