import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Box, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, Locker } from '@/services/databaseService';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import ResponsiveGrid from '@/components/ResponsiveGrid';

interface LockersManagerProps {
  lockers: Locker[];
  setLockers: (lockers: Locker[]) => void;
  onDataChange?: () => void;
}

export function LockersManager({ lockers, setLockers, onDataChange }: LockersManagerProps) {
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [isCreateLockerOpen, setIsCreateLockerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newLocker, setNewLocker] = useState({
    lockerId: '',
    locker_code: '',
    name: '',
    size: '',
    width: 0,
    height: 0,
    total: 0,
    box_category_id: '',
    status: 'available' as const,
    description: '',
    basePrice: 0,
    available: 0,
    key: Date.now(),
    isDeleted: false,
    location: '',
    esp32_device_id: ''
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onDataChange) {
        await onDataChange();
      }
      toast({
        title: "Sukses",
        description: "Data loker berhasil di-refresh",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal me-refresh data loker",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocker = async () => {
    try {
      // Validate required fields
      if (!newLocker.lockerId || !newLocker.name) {
        toast({
          title: "Error",
          description: "Locker ID dan Nama wajib diisi",
          variant: "destructive",
        });
        return;
      }

      console.log('Creating locker with data:', newLocker);
      
      const lockerData = {
        lockerId: newLocker.lockerId,
        locker_code: newLocker.locker_code || newLocker.lockerId,
        name: newLocker.name,
        size: newLocker.size || `${newLocker.width}x${newLocker.height}`,
        width: Number(newLocker.width) || 0,
        height: Number(newLocker.height) || 0,
        total: Number(newLocker.total) || 1,
        box_category_id: newLocker.box_category_id || "1",
        status: newLocker.status,
        description: newLocker.description || "",
        basePrice: Number(newLocker.basePrice) || 0,
        available: Number(newLocker.available) || Number(newLocker.total) || 1,
        key: Date.now(),
        isDeleted: false,
        location: newLocker.location || "",
        esp32_device_id: newLocker.esp32_device_id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Processed locker data:', lockerData);

      const lockerId = await databaseService.createLocker(lockerData);
      console.log('Created locker with ID:', lockerId);
      
      const createdLocker = { 
        id: lockerId, 
        ...lockerData
      };
      setLockers([createdLocker, ...lockers]);
      
      // Create associated ESP32 device if specified
      if (newLocker.esp32_device_id && newLocker.esp32_device_id.trim() !== '') {
        try {
          const deviceData = {
            name: `Device for ${newLocker.name}`,
            device_identifier: newLocker.esp32_device_id,
            locker_id: lockerId,
            status: 'offline' as const,
            key: Date.now(),
            isDeleted: false,
            last_online: new Date().toISOString(),
            location: newLocker.location || "",
            ip_address: '192.168.1.100',
            port: 80
          };
          
          console.log('Creating device with data:', deviceData);
          await databaseService.createDevice(deviceData);
          console.log('Device created successfully');
        } catch (deviceError) {
          console.error('Error creating device:', deviceError);
          toast({
            title: "Warning",
            description: "Loker berhasil dibuat, tapi gagal membuat device ESP32",
            variant: "destructive",
          });
        }
      }
      
      setNewLocker({
        lockerId: '',
        locker_code: '',
        name: '',
        size: '',
        width: 0,
        height: 0,
        total: 0,
        box_category_id: '',
        status: 'available' as const,
        description: '',
        basePrice: 0,
        available: 0,
        key: Date.now(),
        isDeleted: false,
        location: '',
        esp32_device_id: ''
      });
      setIsCreateLockerOpen(false);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Loker berhasil dibuat",
      });
    } catch (error) {
      console.error('Detailed error creating locker:', error);
      let errorMessage = "Gagal membuat loker";
      
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          errorMessage = "Server error - periksa data yang dimasukkan";
        } else if (error.message.includes('400')) {
          errorMessage = "Data tidak valid - periksa semua field";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdateLocker = async () => {
    if (!editingLocker) return;
    
    try {
      await databaseService.updateLocker(editingLocker.id!, editingLocker);
      setLockers(lockers.map(l => l.id === editingLocker.id ? editingLocker : l));
      setEditingLocker(null);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Loker berhasil diupdate",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengupdate loker",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocker = async (lockerId: string) => {
    if (!confirm('Yakin ingin menghapus loker ini?')) return;
    
    try {
      await databaseService.deleteLocker(lockerId);
      setLockers(lockers.filter(l => l.id !== lockerId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Loker berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus loker",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllLockers = async () => {
    if (lockers.length === 0) {
      toast({
        title: "Info",
        description: "Tidak ada loker untuk dihapus",
      });
      return;
    }

    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA ${lockers.length} loker? Tindakan ini tidak dapat dibatalkan!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data loker?')) return;
    
    try {
      setLoading(true);
      
      // Delete each locker
      for (const locker of lockers) {
        await databaseService.deleteLocker(locker.id);
      }
      
      setLockers([]);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: `Semua ${lockers.length} loker berhasil dihapus`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus semua loker",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <ResponsiveContainer>
      <div className="space-y-4 md:space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <Box className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              Manajemen Loker ({lockers.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="btn-responsive">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {lockers.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteAllLockers}
                  disabled={loading}
                  className="btn-responsive"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Hapus Semua ({lockers.length})
                </Button>
              )}
              <Dialog open={isCreateLockerOpen} onOpenChange={setIsCreateLockerOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 btn-responsive">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Loker
                  </Button>
                </DialogTrigger>
                <DialogContent className="modal-responsive max-h-[85vh] overflow-y-auto">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg md:text-xl">Tambah Loker Baru</DialogTitle>
                  </DialogHeader>
                  <div className="modal-content-responsive">
                    <ResponsiveGrid cols={{ default: 1, md: 2 }} gap="md" className="mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="lockerId" className="text-sm font-medium">Locker ID *</Label>
                        <Input
                          id="lockerId"
                          value={newLocker.lockerId}
                          onChange={(e) => setNewLocker({...newLocker, lockerId: e.target.value})}
                          placeholder="Masukkan Locker ID (wajib)"
                          className="mobile-full-width"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="locker_code" className="text-sm font-medium">Locker Code</Label>
                        <Input
                          id="locker_code"
                          value={newLocker.locker_code}
                          onChange={(e) => setNewLocker({...newLocker, locker_code: e.target.value})}
                          placeholder="Locker Code (opsional)"
                          className="mobile-full-width"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Nama *</Label>
                        <Input
                          id="name"
                          value={newLocker.name}
                          onChange={(e) => setNewLocker({...newLocker, name: e.target.value})}
                          placeholder="Nama loker (wajib)"
                          className="mobile-full-width"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size" className="text-sm font-medium">Ukuran</Label>
                        <Input
                          id="size"
                          value={newLocker.size}
                          onChange={(e) => setNewLocker({...newLocker, size: e.target.value})}
                          placeholder="Ukuran loker (opsional)"
                          className="mobile-full-width"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="width" className="text-sm font-medium">Lebar (cm)</Label>
                        <Input
                          id="width"
                          type="number"
                          value={newLocker.width}
                          onChange={(e) => setNewLocker({...newLocker, width: Number(e.target.value)})}
                          placeholder="Lebar loker (cm)"
                          className="mobile-full-width"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height" className="text-sm font-medium">Tinggi (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          value={newLocker.height}
                          onChange={(e) => setNewLocker({...newLocker, height: Number(e.target.value)})}
                          placeholder="Tinggi loker (cm)"
                          className="mobile-full-width"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total" className="text-sm font-medium">Total</Label>
                        <Input
                          id="total"
                          type="number"
                          value={newLocker.total}
                          onChange={(e) => setNewLocker({...newLocker, total: Number(e.target.value)})}
                          placeholder="Total loker"
                          className="mobile-full-width"
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="available" className="text-sm font-medium">Tersedia</Label>
                        <Input
                          id="available"
                          type="number"
                          value={newLocker.available}
                          onChange={(e) => setNewLocker({...newLocker, available: Number(e.target.value)})}
                          placeholder="Jumlah tersedia"
                          className="mobile-full-width"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="box_category_id" className="text-sm font-medium">Box Category ID</Label>
                        <Input
                          id="box_category_id"
                          value={newLocker.box_category_id}
                          onChange={(e) => setNewLocker({...newLocker, box_category_id: e.target.value})}
                          placeholder="Box Category ID"
                          className="mobile-full-width"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm font-medium">Lokasi</Label>
                        <Input
                          id="location"
                          value={newLocker.location}
                          onChange={(e) => setNewLocker({...newLocker, location: e.target.value})}
                          placeholder="Lokasi loker"
                          className="mobile-full-width"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="esp32_device_id" className="text-sm font-medium">ESP32 Device ID</Label>
                        <Input
                          id="esp32_device_id"
                          value={newLocker.esp32_device_id}
                          onChange={(e) => setNewLocker({...newLocker, esp32_device_id: e.target.value})}
                          placeholder="ESP32 Device ID (opsional)"
                          className="mobile-full-width"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                        <Select value={newLocker.status} onValueChange={(value: any) => setNewLocker({...newLocker, status: value})}>
                          <SelectTrigger className="mobile-full-width">
                            <SelectValue placeholder="Pilih status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="basePrice" className="text-sm font-medium">Harga Dasar</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          value={newLocker.basePrice}
                          onChange={(e) => setNewLocker({...newLocker, basePrice: Number(e.target.value)})}
                          placeholder="Harga dasar"
                          className="mobile-full-width"
                          min="0"
                        />
                      </div>
                    </ResponsiveGrid>
                    <div className="space-y-2 mb-6">
                      <Label htmlFor="description" className="text-sm font-medium">Deskripsi</Label>
                      <Textarea
                        id="description"
                        value={newLocker.description}
                        onChange={(e) => setNewLocker({...newLocker, description: e.target.value})}
                        placeholder="Deskripsi loker"
                        className="mobile-full-width min-h-[80px]"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleCreateLocker} className="w-full btn-responsive" disabled={loading}>
                      {loading ? 'Membuat...' : 'Buat Loker'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="mobile-p">
            {lockers.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Box className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-base md:text-lg">Belum ada data loker</p>
              </div>
            ) : (
              <div className="responsive-table">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-xs md:text-sm">Locker ID</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Locker Code</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm">Nama</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Ukuran</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm">Total</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Tersedia</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm">Status</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm mobile-hidden">Key</TableHead>
                      <TableHead className="font-semibold text-center text-xs md:text-sm">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockers.map((locker) => (
                      <TableRow key={locker.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-xs md:text-sm">{locker.lockerId}</TableCell>
                        <TableCell className="mobile-hidden text-xs md:text-sm">{locker.locker_code}</TableCell>
                        <TableCell className="text-xs md:text-sm">{locker.name}</TableCell>
                        <TableCell className="mobile-hidden text-xs md:text-sm">{locker.size}</TableCell>
                        <TableCell className="text-xs md:text-sm">{locker.total}</TableCell>
                        <TableCell className="mobile-hidden text-xs md:text-sm">{locker.available}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(locker.status)} text-xs`}>
                            {locker.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="mobile-hidden">
                          <Badge variant="outline" className="font-mono text-xs">{locker.key}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                              onClick={() => setEditingLocker(locker)}
                              disabled={loading}
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 w-7 md:h-8 md:w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteLocker(locker.id)}
                              disabled={loading}
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Locker Dialog */}
        <Dialog open={!!editingLocker} onOpenChange={() => setEditingLocker(null)}>
          <DialogContent className="modal-responsive max-h-[85vh] overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg md:text-xl">Edit Loker</DialogTitle>
            </DialogHeader>
            {editingLocker && (
              <div className="modal-content-responsive">
                <ResponsiveGrid cols={{ default: 1, md: 2 }} gap="md" className="mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-lockerId" className="text-sm font-medium">Locker ID</Label>
                    <Input
                      id="edit-lockerId"
                      value={editingLocker.lockerId}
                      onChange={(e) => setEditingLocker({...editingLocker, lockerId: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-locker_code" className="text-sm font-medium">Locker Code</Label>
                    <Input
                      id="edit-locker_code"
                      value={editingLocker.locker_code}
                      onChange={(e) => setEditingLocker({...editingLocker, locker_code: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-sm font-medium">Nama</Label>
                    <Input
                      id="edit-name"
                      value={editingLocker.name}
                      onChange={(e) => setEditingLocker({...editingLocker, name: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-size" className="text-sm font-medium">Ukuran</Label>
                    <Input
                      id="edit-size"
                      value={editingLocker.size}
                      onChange={(e) => setEditingLocker({...editingLocker, size: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-width" className="text-sm font-medium">Lebar (cm)</Label>
                    <Input
                      id="edit-width"
                      type="number"
                      value={editingLocker.width}
                      onChange={(e) => setEditingLocker({...editingLocker, width: Number(e.target.value)})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-height" className="text-sm font-medium">Tinggi (cm)</Label>
                    <Input
                      id="edit-height"
                      type="number"
                      value={editingLocker.height}
                      onChange={(e) => setEditingLocker({...editingLocker, height: Number(e.target.value)})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-total" className="text-sm font-medium">Total</Label>
                    <Input
                      id="edit-total"
                      type="number"
                      value={editingLocker.total}
                      onChange={(e) => setEditingLocker({...editingLocker, total: Number(e.target.value)})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-available" className="text-sm font-medium">Tersedia</Label>
                    <Input
                      id="edit-available"
                      type="number"
                      value={editingLocker.available}
                      onChange={(e) => setEditingLocker({...editingLocker, available: Number(e.target.value)})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-box_category_id" className="text-sm font-medium">Box Category ID</Label>
                    <Input
                      id="edit-box_category_id"
                      value={editingLocker.box_category_id}
                      onChange={(e) => setEditingLocker({...editingLocker, box_category_id: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-location" className="text-sm font-medium">Lokasi</Label>
                    <Input
                      id="edit-location"
                      value={editingLocker.location}
                      onChange={(e) => setEditingLocker({...editingLocker, location: e.target.value})}
                      className="mobile-full-width"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status" className="text-sm font-medium">Status</Label>
                    <Select value={editingLocker.status} onValueChange={(value: any) => setEditingLocker({...editingLocker, status: value})}>
                      <SelectTrigger className="mobile-full-width">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-basePrice" className="text-sm font-medium">Harga Dasar</Label>
                    <Input
                      id="edit-basePrice"
                      type="number"
                      value={editingLocker.basePrice}
                      onChange={(e) => setEditingLocker({...editingLocker, basePrice: Number(e.target.value)})}
                      className="mobile-full-width"
                    />
                  </div>
                </ResponsiveGrid>
                <div className="space-y-2 mb-6">
                  <Label htmlFor="edit-description" className="text-sm font-medium">Deskripsi</Label>
                  <Textarea
                    id="edit-description"
                    value={editingLocker.description}
                    onChange={(e) => setEditingLocker({...editingLocker, description: e.target.value})}
                    className="mobile-full-width min-h-[80px]"
                    rows={3}
                  />
                </div>
                <Button onClick={handleUpdateLocker} className="w-full btn-responsive" disabled={loading}>
                  {loading ? 'Mengupdate...' : 'Update Loker'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveContainer>
  );
}
