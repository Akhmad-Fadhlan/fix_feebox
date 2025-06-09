
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Cpu, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, ESP32Device } from '@/services/databaseService';

interface DevicesManagerProps {
  devices: ESP32Device[];
  setDevices: (devices: ESP32Device[]) => void;
  onDataChange?: () => void;
}

export function DevicesManager({ devices, setDevices, onDataChange }: DevicesManagerProps) {
  const [editingDevice, setEditingDevice] = useState<ESP32Device | null>(null);
  const [isCreateDeviceOpen, setIsCreateDeviceOpen] = useState(false);
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

  const handleCreateDevice = async () => {
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
      toast({
        title: "Error",
        description: "Gagal membuat perangkat",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    
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
      toast({
        title: "Error",
        description: "Gagal mengupdate perangkat",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Yakin ingin menghapus perangkat ini?')) return;
    
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
      toast({
        title: "Error",
        description: "Gagal menghapus perangkat",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? 
      <Wifi className="w-4 h-4 text-green-600" /> : 
      <WifiOff className="w-4 h-4 text-red-600" />;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      online: 'Online',
      offline: 'Offline'
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-600" />
            Manajemen Perangkat ESP32 ({devices.length})
          </CardTitle>
          <Dialog open={isCreateDeviceOpen} onOpenChange={setIsCreateDeviceOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Perangkat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Perangkat Baru</DialogTitle>
              </DialogHeader>
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
                <Button onClick={handleCreateDevice} className="w-full">
                  Buat Perangkat
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
                  <TableHead className="font-semibold">Last Online</TableHead>
                  <TableHead className="font-semibold">Key</TableHead>
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell className="font-mono">{device.device_identifier}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Loker #{device.locker_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(device.status)}
                        <Badge className={device.status === 'online' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {getStatusLabel(device.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{device.last_online ? new Date(device.last_online).toLocaleString('id-ID') : 'Never'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{device.key}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingDevice(device)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteDevice(device.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Device Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={() => setEditingDevice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Perangkat</DialogTitle>
          </DialogHeader>
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
              <Button onClick={handleUpdateDevice} className="w-full">
                Update Perangkat
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
