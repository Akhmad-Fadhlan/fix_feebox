
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
import { Plus, Edit, Trash2, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, Package as PackageType } from '@/services/databaseService';

interface PackagesManagerProps {
  packages: PackageType[];
  setPackages: (packages: PackageType[]) => void;
  onDataChange?: () => void;
}

export function PackagesManager({ packages, setPackages, onDataChange }: PackagesManagerProps) {
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: 0,
    type: 'daily' as const,
    box_category_id: '',
    key: Date.now(),
    isDeleted: false
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onDataChange) {
        await onDataChange();
      }
      toast({
        title: "Sukses",
        description: "Data paket berhasil di-refresh",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal me-refresh data paket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    try {
      console.log('Creating package:', newPackage);
      const packageData = {
        ...newPackage,
        basePrice: newPackage.price,
        duration: 24, // Default 24 hours
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const packageId = await databaseService.createPackage(packageData);
      const createdPackage = { 
        id: packageId, 
        ...packageData
      };
      setPackages([createdPackage, ...packages]);
      setNewPackage({
        name: '',
        description: '',
        imageUrl: '',
        price: 0,
        type: 'daily' as const,
        box_category_id: '',
        key: Date.now(),
        isDeleted: false
      });
      setIsCreatePackageOpen(false);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Paket berhasil dibuat",
      });
    } catch (error) {
      console.error('Error creating package:', error);
      toast({
        title: "Error",
        description: "Gagal membuat paket",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePackage = async () => {
    if (!editingPackage || !editingPackage.id) return;
    
    try {
      console.log('Updating package:', editingPackage.id, editingPackage);
      await databaseService.updatePackage(editingPackage.id, editingPackage);
      setPackages(packages.map(p => p.id === editingPackage.id ? editingPackage : p));
      setEditingPackage(null);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Paket berhasil diupdate",
      });
    } catch (error) {
      console.error('Error updating package:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate paket",
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!packageId || packageId === 'undefined') {
      toast({
        title: "Error",
        description: "ID paket tidak valid",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Yakin ingin menghapus paket ini? Data akan dihapus secara permanen dari Firebase.')) return;
    
    try {
      console.log('Deleting package from Firebase:', packageId);
      
      // Delete from Firebase
      await databaseService.deletePackage(packageId);
      
      // Update local state
      setPackages(packages.filter(p => p.id !== packageId));
      
      // Refresh data to ensure synchronization
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Paket berhasil dihapus dari Firebase",
      });
    } catch (error) {
      console.error('Error deleting package from Firebase:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus paket dari Firebase. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllPackages = async () => {
    if (packages.length === 0) {
      toast({
        title: "Info",
        description: "Tidak ada paket untuk dihapus",
      });
      return;
    }

    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA ${packages.length} paket? Data akan dihapus secara permanen dari Firebase!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA paket dari Firebase?')) return;
    
    try {
      setLoading(true);
      console.log(`Deleting all ${packages.length} packages from Firebase...`);
      
      // Delete each package from Firebase
      for (const pkg of packages) {
        if (pkg.id && pkg.id !== 'undefined') {
          await databaseService.deletePackage(pkg.id);
        }
      }
      
      // Clear local state
      setPackages([]);
      
      // Refresh data
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: `Semua ${packages.length} paket berhasil dihapus dari Firebase`,
      });
    } catch (error) {
      console.error('Error deleting all packages:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus semua paket dari Firebase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800',
      size_based: 'bg-orange-100 text-orange-800',
      special: 'bg-red-100 text-red-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Package className="w-6 h-6 text-green-600" />
            Manajemen Paket Layanan ({packages.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {packages.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAllPackages}
                disabled={loading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hapus Semua ({packages.length})
              </Button>
            )}
            <Dialog open={isCreatePackageOpen} onOpenChange={setIsCreatePackageOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Paket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Paket Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama Paket</Label>
                    <Input
                      id="name"
                      value={newPackage.name}
                      onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                      placeholder="Nama paket"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={newPackage.description}
                      onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                      placeholder="Deskripsi paket"
                    />
                  </div>
                  <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={newPackage.imageUrl}
                      onChange={(e) => setNewPackage({...newPackage, imageUrl: e.target.value})}
                      placeholder="https://example.com/image.png"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Harga (Rp)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newPackage.price}
                      onChange={(e) => setNewPackage({...newPackage, price: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="box_category_id">Box Category ID</Label>
                    <Input
                      id="box_category_id"
                      value={newPackage.box_category_id}
                      onChange={(e) => setNewPackage({...newPackage, box_category_id: e.target.value})}
                      placeholder="Box category ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Tipe Paket</Label>
                    <Select value={newPackage.type} onValueChange={(value: any) => setNewPackage({...newPackage, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe paket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="size_based">Size Based</SelectItem>
                        <SelectItem value="special">Special</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreatePackage} className="w-full" disabled={loading}>
                    {loading ? 'Membuat...' : 'Buat Paket'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Belum ada paket layanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Nama Paket</TableHead>
                    <TableHead className="font-semibold">Deskripsi</TableHead>
                    <TableHead className="font-semibold">Harga</TableHead>
                    <TableHead className="font-semibold">Category ID</TableHead>
                    <TableHead className="font-semibold">Tipe</TableHead>
                    <TableHead className="font-semibold">Key</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">{pkg.description}</TableCell>
                      <TableCell className="font-medium">Rp {pkg.price?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{pkg.box_category_id}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(pkg.type || 'custom')}>{pkg.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{pkg.key}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={pkg.isDeleted ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                          {pkg.isDeleted ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingPackage(pkg)}
                            disabled={loading}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeletePackage(pkg.id!)}
                            disabled={loading || !pkg.id || pkg.id === 'undefined'}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Package Dialog */}
      <Dialog open={!!editingPackage} onOpenChange={() => setEditingPackage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Paket</DialogTitle>
          </DialogHeader>
          {editingPackage && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama Paket</Label>
                <Input
                  id="edit-name"
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Textarea
                  id="edit-description"
                  value={editingPackage.description}
                  onChange={(e) => setEditingPackage({...editingPackage, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input
                  id="edit-imageUrl"
                  value={editingPackage.imageUrl}
                  onChange={(e) => setEditingPackage({...editingPackage, imageUrl: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Harga (Rp)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editingPackage.price || 0}
                  onChange={(e) => setEditingPackage({...editingPackage, price: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="edit-box-category-id">Box Category ID</Label>
                <Input
                  id="edit-box-category-id"
                  value={editingPackage.box_category_id || ''}
                  onChange={(e) => setEditingPackage({...editingPackage, box_category_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Tipe Paket</Label>
                <Select value={editingPackage.type || 'custom'} onValueChange={(value: any) => setEditingPackage({...editingPackage, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="size_based">Size Based</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdatePackage} className="w-full" disabled={loading}>
                {loading ? 'Mengupdate...' : 'Update Paket'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
