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
  Plus, 
  Edit, 
  Trash2, 
  Cpu, 
  Wifi, 
  WifiOff, 
  MapPin, 
  Clock,
  RefreshCw,
  Search,
  Eye,
  Power,
  Activity
} from 'lucide-react';
import esp32DeviceService from '@/services/esp32DeviceService';
import { ESP32Device } from '@/services/databaseService';

interface ESP32DevicesManagerProps {
  onDataChange?: () => void;
}

export function ESP32DevicesManager({ onDataChange }: ESP32DevicesManagerProps) {
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ESP32Device | null>(null);
  const [viewingDevice, setViewingDevice] = useState<ESP32Device | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    deleted: 0,
    onlinePercentage: 0
  });

  const [newDevice, setNewDevice] = useState({
    name: '',
    device_identifier: '',
    locker_id: '',
    status: 'offline' as const,
    key: Date.now(),
    location: '',
    ip_address: '',
    port: 80
  });

  // Load data
  const loadDevices = async () => {
    setLoading(true);
    try {
      const [devicesData, statsData] = await Promise.all([
        esp32DeviceService.getAllDevices(),
        esp32DeviceService.getDeviceStats()
      ]);
      setDevices(devicesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data ESP32 devices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.locker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    
    return matchesSearch && matchesStatus && !device.isDeleted;
  });

  // Create device
  const handleCreateDevice = async () => {
    try {
      if (!newDevice.name || !newDevice.device_identifier || !newDevice.locker_id || 
          !newDevice.location || !newDevice.ip_address || !newDevice.port) {
        toast({
          title: "Error",
          description: "Semua field harus diisi",
          variant: "destructive",
        });
        return;
      }

      await esp32DeviceService.createDevice(newDevice);
      
      setNewDevice({
        name: '',
        device_identifier: '',
        locker_id: '',
        status: 'offline' as const,
        key: Date.now(),
        location: '',
        ip_address: '',
        port: 80
      });
      
      setIsCreateDialogOpen(false);
      await loadDevices();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "ESP32 Device berhasil dibuat",
      });
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal membuat ESP32 device",
        variant: "destructive",
      });
    }
  };

  // Update device
  const handleUpdateDevice = async () => {
    if (!editingDevice || !editingDevice.id) return;
    
    try {
      await esp32DeviceService.updateDevice(editingDevice.id, editingDevice);
      setEditingDevice(null);
      setIsEditDialogOpen(false);
      await loadDevices();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "ESP32 Device berhasil diupdate",
      });
    } catch (error) {
      console.error('Error updating device:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengupdate ESP32 device",
        variant: "destructive",
      });
    }
  };

  // Update device status
  const handleUpdateStatus = async (deviceId: string, newStatus: 'online' | 'offline') => {
    try {
      await esp32DeviceService.updateDeviceStatus(deviceId, newStatus);
      await loadDevices();
      
      toast({
        title: "Sukses",
        description: `Status device berhasil diubah menjadi ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating device status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengupdate status device",
        variant: "destructive",
      });
    }
  };

  // Delete device
  const handleDeleteDevice = async (deviceId: string, hardDelete: boolean = false) => {
    try {
      await esp32DeviceService.deleteDevice(deviceId, hardDelete);
      await loadDevices();
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: hardDelete ? "ESP32 Device berhasil dihapus permanen" : "ESP32 Device berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menghapus ESP32 device",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => (
    <Badge 
      variant={status === 'online' ? 'default' : 'secondary'}
      className={status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
    >
      {status === 'online' ? (
        <><Wifi className="w-3 h-3 mr-1" /> Online</>
      ) : (
        <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
      )}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Cpu className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
              </div>
              <Wifi className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
              </div>
              <WifiOff className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-bold">{stats.onlinePercentage}%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Cpu className="w-6 h-6 text-indigo-600" />
              ESP32 Devices ({filteredDevices.length})
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari device..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                {/* Refresh Button */}
                <Button variant="outline" size="sm" onClick={loadDevices} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                {/* Create Button */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Tambah ESP32 Device Baru</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Nama Device</Label>
                        <Input
                          id="name"
                          value={newDevice.name}
                          onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                          placeholder="ESP32 Locker Jakarta 001"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="device_identifier">Device Identifier</Label>
                        <Input
                          id="device_identifier"
                          value={newDevice.device_identifier}
                          onChange={(e) => setNewDevice({...newDevice, device_identifier: e.target.value})}
                          placeholder="ESP32_JKT_001"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="locker_id">Locker ID</Label>
                        <Input
                          id="locker_id"
                          value={newDevice.locker_id}
                          onChange={(e) => setNewDevice({...newDevice, locker_id: e.target.value})}
                          placeholder="LOCKER_JKT_001"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="location">Lokasi</Label>
                        <Input
                          id="location"
                          value={newDevice.location}
                          onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                          placeholder="Jakarta Pusat, Mall Central Park"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-2">
                          <Label htmlFor="ip_address">IP Address</Label>
                          <Input
                            id="ip_address"
                            value={newDevice.ip_address}
                            onChange={(e) => setNewDevice({...newDevice, ip_address: e.target.value})}
                            placeholder="192.168.1.100"
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="port">Port</Label>
                          <Input
                            id="port"
                            type="number"
                            value={newDevice.port}
                            onChange={(e) => setNewDevice({...newDevice, port: parseInt(e.target.value) || 80})}
                            placeholder="80"
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="key">Key</Label>
                        <Input
                          id="key"
                          type="number"
                          value={newDevice.key}
                          onChange={(e) => setNewDevice({...newDevice, key: parseInt(e.target.value) || Date.now()})}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleCreateDevice}>
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
                    <TableHead>Device</TableHead>
                    <TableHead>Locker ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Online</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-gray-500">{device.device_identifier}</p>
                        </div>
                      </TableCell>
                      <TableCell>{device.locker_id}</TableCell>
                      <TableCell>
                        <StatusBadge status={device.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="text-sm">{device.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.ip_address}:{device.port}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(device.last_online)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingDevice(device);
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
                              setEditingDevice({...device});
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          {/* Status Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateStatus(
                              device.id!, 
                              device.status === 'online' ? 'offline' : 'online'
                            )}
                          >
                            <Power className={`w-4 h-4 ${device.status === 'online' ? 'text-red-600' : 'text-green-600'}`} />
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
                                <AlertDialogTitle>Hapus ESP32 Device</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Yakin ingin menghapus device "{device.name}"? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDevice(device.id!)}
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
              
              {filteredDevices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada ESP32 device yang ditemukan
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Device Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit ESP32 Device</DialogTitle>
          </DialogHeader>
          
          {editingDevice && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nama Device</Label>
                <Input
                  id="edit-name"
                  value={editingDevice.name}
                  onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-device_identifier">Device Identifier</Label>
                <Input
                  id="edit-device_identifier"
                  value={editingDevice.device_identifier}
                  onChange={(e) => setEditingDevice({...editingDevice, device_identifier: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-locker_id">Locker ID</Label>
                <Input
                  id="edit-locker_id"
                  value={editingDevice.locker_id}
                  onChange={(e) => setEditingDevice({...editingDevice, locker_id: e.target.value})}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Lokasi</Label>
                <Input
                  id="edit-location"
                  value={editingDevice.location}
                  onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-ip_address">IP Address</Label>
                  <Input
                    id="edit-ip_address"
                    value={editingDevice.ip_address}
                    onChange={(e) => setEditingDevice({...editingDevice, ip_address: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-port">Port</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={editingDevice.port}
                    onChange={(e) => setEditingDevice({...editingDevice, port: parseInt(e.target.value) || 80})}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editingDevice.status} 
                  onValueChange={(value) => setEditingDevice({...editingDevice, status: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateDevice}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Device Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail ESP32 Device</DialogTitle>
          </DialogHeader>
          
          {viewingDevice && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Nama Device</Label>
                  <p className="mt-1">{viewingDevice.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={viewingDevice.status} />
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Device Identifier</Label>
                <p className="mt-1 font-mono">{viewingDevice.device_identifier}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Locker ID</Label>
                <p className="mt-1">{viewingDevice.locker_id}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Lokasi</Label>
                <p className="mt-1">{viewingDevice.location}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">IP Address</Label>
                  <p className="mt-1 font-mono">{viewingDevice.ip_address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Port</Label>
                  <p className="mt-1">{viewingDevice.port}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Key</Label>
                  <p className="mt-1">{viewingDevice.key}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Last Online</Label>
                  <p className="mt-1 text-sm">{formatDate(viewingDevice.last_online)}</p>
                </div>
              </div>
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
