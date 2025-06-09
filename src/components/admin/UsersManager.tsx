
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, User, UserInput } from '@/services/databaseService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UsersManagerProps {
  users: User[];
  setUsers: (users: User[]) => void;
  onDataChange?: () => void;
}

export function UsersManager({ users, setUsers, onDataChange }: UsersManagerProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [newUser, setNewUser] = useState<UserInput>({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'user',
    password: '',
    uid: `user_${Date.now()}`,
    key: Date.now(),
    isDeleted: false
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone) {
      toast({
        title: "Error",
        description: "Nama, email, dan nomor HP wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setApiError('');
    
    try {
      console.log('Creating user with data:', newUser);
      
      // Prepare user data with required fields for backend
      const userDataForBackend = {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address || '',
        role: newUser.role,
        password: newUser.password || 'defaultPassword123', // Provide default password if not set
        key: Date.now(),
        isDeleted: false
      };
      
      const userId = await databaseService.createUser(userDataForBackend);
      
      const createdUser: User = { 
        id: userId,
        uid: userId,
        ...userDataForBackend,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setUsers([createdUser, ...users]);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        address: '',
        role: 'user',
        password: '',
        uid: `user_${Date.now()}`,
        key: Date.now(),
        isDeleted: false
      });
      setIsCreateUserOpen(false);
      setApiError('');
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "User berhasil dibuat",
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Gagal membuat user";
      if (error.message?.includes('500')) {
        errorMessage = "Server error - silakan coba lagi atau hubungi administrator";
        setApiError("Backend API mengalami masalah (HTTP 500). Silakan coba lagi nanti.");
      } else if (error.message?.includes('Network')) {
        errorMessage = "Koneksi bermasalah - periksa internet Anda";
        setApiError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      } else if (error.message) {
        errorMessage = error.message;
        setApiError(error.message);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.id) {
      toast({
        title: "Error",
        description: "User ID tidak valid untuk update",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Updating user:', editingUser.id, editingUser);
      
      const updatedUser = await databaseService.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        address: editingUser.address,
        role: editingUser.role,
        updatedAt: new Date().toISOString()
      });
      
      setUsers(users.map(u => u.id === editingUser.id ? {...editingUser, ...updatedUser} : u));
      setEditingUser(null);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "User berhasil diupdate",
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Validate userId before attempting deletion
    if (!userId || userId === 'undefined' || userId === 'null') {
      toast({
        title: "Error",
        description: "User ID tidak valid untuk penghapusan",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Yakin ingin menghapus user ini?')) return;
    
    try {
      console.log('Deleting user with valid ID:', userId);
      
      await databaseService.deleteUser(userId);
      
      setUsers(users.filter(u => u.id !== userId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "User berhasil dihapus",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllUsers = async () => {
    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA data user dari sistem? Tindakan ini tidak dapat dibatalkan!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data user dari database backend dan Firebase?')) return;
    
    try {
      setIsDeleting(true);
      console.log('Starting delete all users operation...');
      
      // Get all users first
      const allUsers = await databaseService.getAllUsers();
      console.log(`Found ${allUsers.length} users to delete`);
      
      // Delete each user individually to ensure proper backend sync
      for (const user of allUsers) {
        if (user.id && user.id !== 'undefined' && user.id !== 'null') {
          try {
            console.log(`Deleting user ${user.id}...`);
            await databaseService.deleteUser(user.id);
          } catch (userDeleteError) {
            console.warn(`Failed to delete user ${user.id}:`, userDeleteError);
          }
        }
      }
      
      // Clear local state
      setUsers([]);
      
      // Trigger data refresh
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Semua data user berhasil dihapus dari sistem",
      });
      
    } catch (error: any) {
      console.error('Error during delete all users operation:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus semua user",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Manajemen User ({users.length})
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah User Baru</DialogTitle>
                </DialogHeader>
                
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nama *</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Nama lengkap"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Nomor HP *</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      placeholder="08123456789"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Alamat</Label>
                    <Input
                      id="address"
                      value={newUser.address || ''}
                      onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                      placeholder="Alamat lengkap"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password || ''}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Password (opsional - akan dibuatkan default jika kosong)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value: 'user' | 'admin') => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleCreateUser} 
                    className="w-full" 
                    disabled={isCreating}
                  >
                    {isCreating ? 'Membuat...' : 'Buat User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteAllUsers}
              disabled={isDeleting}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {isDeleting ? 'Menghapus...' : 'Hapus Semua Data'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Nama</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id || user.uid} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">
                      {user.id ? (
                        user.id.length > 10 ? `${user.id.substring(0, 10)}...` : user.id
                      ) : (
                        <span className="text-red-500">No ID</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isGuest ? 'outline' : 'default'}>
                        {user.isGuest ? 'Guest' : 'Regular'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingUser(user)}
                          disabled={!user.id || user.id === 'undefined'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => user.id && handleDeleteUser(user.id)}
                          disabled={!user.id || user.id === 'undefined' || user.id === 'null'}
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Nomor HP</Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Alamat</Label>
                <Input
                  id="edit-address"
                  value={editingUser.address || ''}
                  onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editingUser.role} onValueChange={(value: 'user' | 'admin') => setEditingUser({...editingUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateUser} className="w-full">
                Update User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
