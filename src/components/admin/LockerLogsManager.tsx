
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
import { FileText, Lock, Unlock, AlertTriangle, Activity, RefreshCw, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, LockerLog } from '@/services/databaseService';

interface LockerLogsManagerProps {
  logs: LockerLog[];
  setLogs: (logs: LockerLog[]) => void;
  onDataChange?: () => void;
}

export function LockerLogsManager({ logs, setLogs, onDataChange }: LockerLogsManagerProps) {
  const [loading, setLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<LockerLog | null>(null);
  const [viewingLog, setViewingLog] = useState<LockerLog | null>(null);
  const [isCreateLogOpen, setIsCreateLogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newLog, setNewLog] = useState({
    locker_id: '',
    esp32_device_id: '',
    action: 'open',
    action_time: new Date().toISOString(),
    key: Date.now(),
    userId: ''
  });

  const validateLog = (log: any): string[] => {
    const errors: string[] = [];
    
    if (!log.locker_id.trim()) {
      errors.push("Locker ID harus diisi");
    }
    
    if (!log.esp32_device_id.trim()) {
      errors.push("ESP32 Device ID harus diisi");
    }
    
    if (!log.action.trim()) {
      errors.push("Action harus dipilih");
    }
    
    if (!log.action_time) {
      errors.push("Action time harus diisi");
    }
    
    return errors;
  };

  const handleCreateLog = async () => {
    setValidationErrors([]);
    const errors = validateLog(newLog);
    
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
      const logId = await databaseService.createLockerLog(newLog);
      const createdLog = { 
        id: logId, 
        ...newLog
      };
      setLogs([createdLog, ...logs]);
      setNewLog({
        locker_id: '',
        esp32_device_id: '',
        action: 'open',
        action_time: new Date().toISOString(),
        key: Date.now(),
        userId: ''
      });
      setIsCreateLogOpen(false);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Log berhasil dibuat",
      });
    } catch (error) {
      console.error('Error creating log:', error);
      toast({
        title: "Error",
        description: "Gagal membuat log. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLog = async () => {
    if (!editingLog) return;
    
    setValidationErrors([]);
    const errors = validateLog(editingLog);
    
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
      await databaseService.updateLockerLog(editingLog.id!, editingLog);
      setLogs(logs.map(l => l.id === editingLog.id ? editingLog : l));
      setEditingLog(null);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Log berhasil diupdate",
      });
    } catch (error) {
      console.error('Error updating log:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate log. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    setLoading(true);
    try {
      await databaseService.deleteLockerLog(logId);
      setLogs(logs.filter(l => l.id !== logId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Log berhasil dihapus",
      });
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus log. Silakan coba lagi.",
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
        description: "Data log berhasil di-refresh",
      });
    } catch (error) {
      console.error('Error refreshing logs:', error);
      toast({
        title: "Error",
        description: "Gagal me-refresh data log",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!confirm('PERINGATAN: Yakin ingin menghapus SEMUA log aktivitas? Tindakan ini tidak dapat dibatalkan!')) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data log?')) return;
    
    try {
      await databaseService.deleteAllLockerLogs();
      setLogs([]);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Semua log aktivitas berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus semua log aktivitas",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'open':
        return <Unlock className="w-4 h-4 text-green-600" />;
      case 'close':
        return <Lock className="w-4 h-4 text-blue-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'sensor_trigger':
        return <Activity className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      close: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800',
      sensor_trigger: 'bg-orange-100 text-orange-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Log Aktivitas Loker ({logs.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateLogOpen} onOpenChange={setIsCreateLogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm" disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Log Baru</DialogTitle>
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
                    <Label htmlFor="locker_id">Locker ID</Label>
                    <Input
                      id="locker_id"
                      value={newLog.locker_id}
                      onChange={(e) => setNewLog({...newLog, locker_id: e.target.value})}
                      placeholder="Locker ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="esp32_device_id">ESP32 Device ID</Label>
                    <Input
                      id="esp32_device_id"
                      value={newLog.esp32_device_id}
                      onChange={(e) => setNewLog({...newLog, esp32_device_id: e.target.value})}
                      placeholder="ESP32 Device ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="action">Action</Label>
                    <Select value={newLog.action} onValueChange={(value) => setNewLog({...newLog, action: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="close">Close</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="sensor_trigger">Sensor Trigger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="userId">User ID (Optional)</Label>
                    <Input
                      id="userId"
                      value={newLog.userId}
                      onChange={(e) => setNewLog({...newLog, userId: e.target.value})}
                      placeholder="User ID"
                    />
                  </div>
                  <Button onClick={handleCreateLog} className="w-full" disabled={loading}>
                    {loading ? "Membuat..." : "Buat Log"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {logs.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={loading}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Hapus Semua
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Hapus Semua</AlertDialogTitle>
                    <AlertDialogDescription>
                      PERINGATAN: Yakin ingin menghapus SEMUA log aktivitas? Tindakan ini tidak dapat dibatalkan!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllLogs}>
                      Hapus Semua
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Belum ada data log aktivitas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Loker</TableHead>
                    <TableHead className="font-semibold">Device</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Waktu</TableHead>
                    <TableHead className="font-semibold">User ID</TableHead>
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{log.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Loker #{log.locker_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">ESP32 #{log.esp32_device_id}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(log.action_time).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-sm">{log.userId || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setViewingLog(log)}
                            disabled={loading}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setEditingLog(log)}
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
                                  Yakin ingin menghapus log ini? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLog(log.id!)}>
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
          )}
        </CardContent>
      </Card>

      {/* View Log Detail Dialog */}
      <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Log Aktivitas</DialogTitle>
          </DialogHeader>
          {viewingLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID</Label>
                  <p className="text-sm font-mono">{viewingLog.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Locker ID</Label>
                  <p className="text-sm">{viewingLog.locker_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">ESP32 Device ID</Label>
                  <p className="text-sm">{viewingLog.esp32_device_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Action</Label>
                  <div className="flex items-center gap-2">
                    {getActionIcon(viewingLog.action)}
                    <Badge className={getActionColor(viewingLog.action)}>
                      {viewingLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">User ID</Label>
                  <p className="text-sm">{viewingLog.userId || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Key</Label>
                  <p className="text-sm font-mono">{viewingLog.key}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Action Time</Label>
                  <p className="text-sm">{new Date(viewingLog.action_time).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Log Dialog */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Log Aktivitas</DialogTitle>
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
          {editingLog && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-locker_id">Locker ID</Label>
                <Input
                  id="edit-locker_id"
                  value={editingLog.locker_id}
                  onChange={(e) => setEditingLog({...editingLog, locker_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-esp32_device_id">ESP32 Device ID</Label>
                <Input
                  id="edit-esp32_device_id"
                  value={editingLog.esp32_device_id}
                  onChange={(e) => setEditingLog({...editingLog, esp32_device_id: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-action">Action</Label>
                <Select value={editingLog.action} onValueChange={(value) => setEditingLog({...editingLog, action: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="close">Close</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="sensor_trigger">Sensor Trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-userId">User ID (Optional)</Label>
                <Input
                  id="edit-userId"
                  value={editingLog.userId || ''}
                  onChange={(e) => setEditingLog({...editingLog, userId: e.target.value})}
                />
              </div>
              <Button onClick={handleUpdateLog} className="w-full" disabled={loading}>
                {loading ? "Memperbarui..." : "Update Log"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
