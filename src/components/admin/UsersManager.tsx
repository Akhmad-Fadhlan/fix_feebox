
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, AlertCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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

  // Reset form helper
  const resetNewUserForm = () => {
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
    setApiError('');
  };

  const handleCreateUser = async () => {
    // Client-side validation
    if (!newUser.name?.trim()) {
      toast({
        title: "Error",
        description: "Nama wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!newUser.email?.trim()) {
      toast({
        title: "Error", 
        description: "Email wajib diisi",
        variant: "destructive",
      });
      return;
    }

    if (!newUser.phone?.trim()) {
      toast({
        title: "Error",
        description: "Nomor HP wajib diisi",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      toast({
        title: "Error",
        description: "Format email tidak valid",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setApiError('');
    
    try {
      console.log('Creating user with data:', newUser);
      
      const userId = await databaseService.createUser(newUser);
      
      // Create local user object for immediate UI update
      const createdUser: User = { 
        id: userId,
        uid: userId,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        phone: newUser.phone.trim(),
        address: newUser.address?.trim() || '',
        role: newUser.role,
        password: newUser.password,
        key: newUser.key || Date.now(),
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update local state immediately for better UX
      setUsers([createdUser, ...users]);
      resetNewUserForm();
      setIsCreateUserOpen(false);
      
      // Refresh data from backend to ensure consistency
      if (onDataChange) {
        setTimeout(() => {
          onDataChange();
        }, 1000);
      }
      
      toast({
        title: "Sukses",
        description: "User berhasil dibuat",
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "Gagal membuat user";
      
      if (error.message) {
        errorMessage = error.message;
        
        // Set API error for display in the dialog
        if (error.message.includes('Server') || error.message.includes('timeout') || error.message.includes('Network')) {
          setApiError("Masalah koneksi ke server. Silakan periksa koneksi internet dan coba lagi.");
        } else if (error.message.includes('sudah terdaftar') || error.message.includes('duplicate')) {
          setApiError("Email atau nomor HP sudah terdaftar. Gunakan email/nomor HP yang berbeda.");
        } else {
          setApiError(error.message);
        }
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

    // Client-side validation
    if (!editingUser.name?.trim()) {
      toast({
        title: "Error",
        description: "Nama tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser.email?.trim()) {
      toast({
        title: "Error",
        description: "Email tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser.phone?.trim()) {
      toast({
        title: "Error",
        description: "Nomor HP tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingUser.email.trim())) {
      toast({
        title: "Error",
        description: "Format email tidak valid",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      console.log('Updating user:', editingUser.id, editingUser);
      
      const updatedUser = await databaseService.updateUser(editingUser.id, {
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        phone: editingUser.phone.trim(),
        address: editingUser.address?.trim(),
        role: editingUser.role,
      });
      
      // Update local state immediately
      setUsers(users.map(u => u.id === editingUser.id ? {
        ...editingUser,
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        phone: editingUser.phone.trim(),
        address: editingUser.address?.trim() || '',
        updatedAt: new Date().toISOString()
      } : u));
      
      setEditingUser(null);
      
      // Refresh data from backend to ensure consistency
      if (onDataChange) {
        setTimeout(() => {
          onDataChange();
        }, 1000);
      }
      
      toast({
        title: "Sukses",
        description: "User berhasil diupdate",
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      
      let errorMessage = "Gagal mengupdate user";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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

    // Find user for confirmation message
    const userToDelete = users.find(u => u.id === userId);
    const userName = userToDelete?.name || 'user ini';

    if (!confirm(`Yakin ingin menghapus user "${userName}"?`)) return;
    
    setDeletingUserId(userId);
    
    try {
      console.log('Deleting user with ID:', userId);
      
      await databaseService.deleteUser(userId);
      
      // Update local state immediately
      setUsers(users.filter(u => u.id !== userId));
      
      // Refresh data from backend to ensure consistency
      if (onDataChange) {
        setTimeout(() => {
          onDataChange();
        }, 1000);
      }
      
      toast({
        title: "Sukses",
        description: `User "${userName}" berhasil dihapus`,
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      let errorMessage = "Gagal menghapus user";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteAllUsers = async () => {
    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA data user dari sistem? Tindakan ini tidak dapat dibatalkan!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data user dari database backend dan Firebase?')) return;
    
    setIsDeleting(true);
    
    try {
      console.log('Starting delete all users operation...');
      
      // Get current user list
      const currentUsers = [...users];
      console.log(`Found ${currentUsers.length} users to delete`);
      
      let deletedCount = 0;
      let failedCount = 0;
      
      // Delete each user individually to ensure proper backend sync
      for (const user of currentUsers) {
        if (user.id && user.id !== 'undefined' && user.id !== 'null') {
          try {
            console.log(`Deleting user ${user.id}...`);
            await databaseService.deleteUser(user.id);
            deletedCount++;
          } catch (userDeleteError) {
            console.warn(`Failed to delete user ${user.id}:`, userDeleteError);
            failedCount++;
          }
        }
      }
      
      // Clear local state
      setUsers([]);
      
      // Trigger data refresh
      if (onDataChange) {
        setTimeout(() => {
          onDataChange();
        }, 1000);
      }
      
      if (failedCount === 0) {
        toast({
          title: "Sukses",
          description: `Semua ${deletedCount} user berhasil dihapus dari sistem`,
        });
      } else {
        toast({
          title: "Selesai dengan peringatan",
          description: `${deletedCount} user berhasil dihapus, ${failedCount} user gagal dihapus`,
          variant: "destructive",
        });
      }
      
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

  // Filter out invalid users for display
  const validUsers = users.filter(user => 
    user && 
    user.id && 
    user.id !== 'undefined' && 
    user.id !== 'null' &&
    !user.isDeleted
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Manajemen User ({validUsers.length})
            {users.length !== validUsers.length && (
              <Badge variant="outline" className="text-xs">
                {users.length - validUsers.length} invalid
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={isCreateUserOpen} onOpenChange={(open) => {
              setIsCreateUserOpen(open);
              if (!open) {
                resetNewUserForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Tambah User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="user@example.com"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Nomor HP *</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      placeholder="08xxxxxxxxx"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Alamat</Label>
                    <Input
                      id="address"
                      value={newUser.address || ''}
                      onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                      placeholder="Alamat lengkap (opsional)"
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={newUser.role} 
                      onValueChange={(value: 'user' | 'admin') => setNewUser({...newUser, role: value})}
                      disabled={isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password || ''}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Password (opsional - akan diset default jika kosong)"
                      disabled={isCreating}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleCreateUser} 
                      className="flex-1"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Membuat...
                        </>
                      ) : (
                        'Buat User'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateUserOpen(false)}
                      disabled={isCreating}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {validUsers.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllUsers}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Hapus Semua
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {validUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Tidak ada user ditemukan</p>
              <p className="text-sm text-gray-400 mt-1">Tambah user pertama dengan tombol "Tambah User"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validUsers.map((user) => (
                    <TableRow key={user.id || user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.address || '-'}</TableCell>
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
                            disabled={!user.id || user.id === 'undefined' || isUpdating}
                            title="Edit user"
                          >
                            {isUpdating && editingUser?.id === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Edit className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => user.id && handleDeleteUser(user.id)}
                            disabled={!user.id || user.id === 'undefined' || user.id === 'null' || deletingUserId === user.id}
                            title="Hapus user"
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => {
        if (!open) setEditingUser(null);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama *</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Nomor HP *</Label>
                <Input
                  id="edit-phone"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Alamat</Label>
                <Input
                  id="edit-address"
                  value={editingUser.address || ''}
                  onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                  disabled={isUpdating}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value: 'user' | 'admin') => setEditingUser({...editingUser, role: value})}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleUpdateUser} 
                  className="flex-1"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengupdate...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
