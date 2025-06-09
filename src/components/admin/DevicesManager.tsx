
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Cpu, Wifi, WifiOff, RefreshCw, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, ESP32Device } from '@/services/databaseService';

interface DevicesManagerProps {
  devices: ESP32Device[];
  setDevices: (devices: ESP32Device[]) => void;
  onDataChange?: () => void;
}

export function DevicesManager({ devices, setDevices, onDataChange }: DevicesManagerProps) {
  const [editingDevice, setEditingDevice] = useState<ESP32Device | null>(null);
  const [viewingDevice, setViewingDevice] = useState<ESP32Device | null>(null);
  const [isCreateDeviceOpen, setIsCreateDeviceOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newDevice, setNewDevice] = useState({
    name: '',
    device_identifier: '',
    locker_id: '',
    status: 'offline' as const,
    key: Date.now(),
    isDeleted: false,
    location: '',
    ip_address: '',
    port: 0
  });

  const validateDevice = (device: any): string[] => {
    const errors: string[] = [];
    
    if (!device.name.trim()) {
      errors.push("Nama perangkat harus diisi");
    }
    
    if (!device.device_identifier.trim()) {
      errors.push("Device identifier harus diisi");
    }
    
    if (!device.locker_id.trim()) {
      errors.push("Locker ID harus diisi");
    }
    
    if (!device.location.trim()) {
      errors.push("Lokasi harus diisi");
    }
    
    if (!device.ip_address.trim()) {
      errors.push("IP Address harus diisi");
    } else {
      // Basic IP validation
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(device.ip_address)) {
        errors.push("Format IP Address tidak valid");
      }
    }
    
    if (!device.port || device.port <= 0 || device.port > 65535) {
      errors.push("Port harus berupa angka antara 1-65535");
    }
    
    return errors;
  };

  const handleCreateDevice = async () => {
    setValidationErrors([]);
    const errors = validateDevice(newDevice);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Error Validasi",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const deviceData = {
        ...newDevice,
        last_online: new Date().toISOString()
      };
      const deviceId = await databaseService.createDevice(deviceData);
      const createdDevice = { 
        id: deviceId, 
        ...deviceData
      };
      setDevices([createdDevice, ...devices]);
      setNewDevice({
        name: '',
        device_identifier: '',
        locker_id: '',
        status: 'offline' as const,
        key: Date.now(),
        isDeleted: false,
        location: '',
        ip_address: '',
        port: 0
      });
      setIsCreateDeviceOpen(false);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Perangkat berhasil dibuat",
      });
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: "Error",
        description: "Gagal membuat perangkat. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    
    setValidationErrors([]);
    const errors = validateDevice(editingDevice);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Error Validasi",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      await databaseService.updateDevice(editingDevice.id!, editingDevice);
      setDevices(devices.map(d => d.id === editingDevice.id ? editingDevice : d));
      setEditingDevice(null);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Perangkat berhasil diupdate",
      });
    } catch (error) {
      console.error('Error updating device:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate perangkat. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    setLoading(true);
    try {
      await databaseService.deleteDevice(deviceId);
      setDevices(devices.filter(d => d.id !== deviceId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Perangkat berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus perangkat. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onDataChange) {
        await onDataChange();
      }
      toast({
        title: "Sukses",
        description: "Data perangkat berhasil di-refresh",
      });
    } catch (error) {
      console.error('Error refreshing devices:', error);
      toast({
        title: "Error",
        description: "Gagal me-refresh data perangkat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? 
      <Wifi className="w-4 h-4 text-green-600" /> : 
      <WifiOff className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-600" />
            Manajemen Perangkat ESP32 ({devices.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDeviceOpen} onOpenChange={setIsCreateDeviceOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Perangkat
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Perangkat Baru</DialogTitle>
              </DialogHeader>
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-red-800 font-medium mb-2">Error Validasi:</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nama Perangkat</Label>
                  <Input
                    id="name"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                    placeholder="ESP32 Device 1"
                  />
                </div>
                <div>
                  <Label htmlFor="device_identifier">Device Identifier</Label>
                  <Input
                    id="device_identifier"
                    value={newDevice.device_identifier}
                    onChange={(e) => setNewDevice({...newDevice, device_identifier: e.target.value})}
                    placeholder="ESP32_001"
                  />
                </div>
                <div>
                  <Label htmlFor="locker_id">Loker ID</Label>
                  <Input
                    id="locker_id"
                    value={newDevice.locker_id}
                    onChange={(e) => setNewDevice({...newDevice, locker_id: e.target.value})}
                    placeholder="Locker ID"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Lokasi</Label>
                  <Input
                    id="location"
                    value={newDevice.location}
                    onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                    placeholder="Lantai 1, Area A"
                  />
                </div>
                <div>
                  <Label htmlFor="ip_address">IP Address</Label>
                  <Input
                    id="ip_address"
                    value={newDevice.ip_address}
                    onChange={(e) => setNewDevice({...newDevice, ip_address: e.target.value})}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({...newDevice, port: parseInt(e.target.value) || 0})}
                    placeholder="80"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newDevice.status} onValueChange={(value: any) => setNewDevice({...newDevice, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateDevice} className="w-full" disabled={loading}>
                  {loading ? "Membuat..." : "Buat Perangkat"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">Device ID</TableHead>
                  <TableHead className="font-semibold">Loker ID</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Lokasi</TableHead>
                  <TableHead className="font-semibold">Last Online</TableHead>
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell className="font-mono text-sm">{device.device_identifier}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Loker #{device.locker_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(device.status)}
                        <Badge className={device.status === 'online' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {device.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{device.location || '-'}</TableCell>
                    <TableCell className="text-sm">{device.last_online ? new Date(device.last_online).toLocaleString('id-ID') : 'Never'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setViewingDevice(device)}
                          disabled={loading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingDevice(device)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                              <AlertDialogDescription>
                                Yakin ingin menghapus perangkat "{device.name}"? Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteDevice(device.id!)}>
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
          </div>
        </CardContent>
      </Card>

      {/* View Device Detail Dialog */}
      <Dialog open={!!viewingDevice} onOpenChange={() => setViewingDevice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Perangkat</DialogTitle>
          </DialogHeader>
          {viewingDevice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Nama</Label>
                  <p className="text-sm">{viewingDevice.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Device ID</Label>
                  <p className="text-sm font-mono">{viewingDevice.device_identifier}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Locker ID</Label>
                  <p className="text-sm">{viewingDevice.locker_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(viewingDevice.status)}
                    <Badge className={viewingDevice.status === 'online' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {viewingDevice.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Lokasi</Label>
                  <p className="text-sm">{viewingDevice.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">IP Address</Label>
                  <p className="text-sm font-mono">{viewingDevice.ip_address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Port</Label>
                  <p className="text-sm">{viewingDevice.port}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Key</Label>
                  <p className="text-sm font-mono">{viewingDevice.key}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Last Online</Label>
                  <p className="text-sm">{viewingDevice.last_online ? new Date(viewingDevice.last_online).toLocaleString('id-ID') : 'Never'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={() => setEditingDevice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Perangkat</DialogTitle>
          </DialogHeader>
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h4 className="text-red-800 font-medium mb-2">Error Validasi:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          {editingDevice && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama Perangkat</Label>
                <Input
                  id="edit-name"
                  value={editingDevice.name}
                  onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-device_identifier">Device Identifier</Label>
                <Input
                  id="edit-device_identifier"
                  value={editingDevice.device_identifier || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, device_identifier: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-locker_id">Loker ID</Label>
                <Input
                  id="edit-locker_id"
                  value={editingDevice.locker_id || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, locker_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Lokasi</Label>
                <Input
                  id="edit-location"
                  value={editingDevice.location || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-ip_address">IP Address</Label>
                <Input
                  id="edit-ip_address"
                  value={editingDevice.ip_address || ''}
                  onChange={(e) => setEditingDevice({...editingDevice, ip_address: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  value={editingDevice.port || 0}
                  onChange={(e) => setEditingDevice({...editingDevice, port: parseInt(e.target.value) || 0})}
                  placeholder="80"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editingDevice.status} onValueChange={(value: any) => setEditingDevice({...editingDevice, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateDevice} className="w-full" disabled={loading}>
                {loading ? "Memperbarui..." : "Update Perangkat"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
