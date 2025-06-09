
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, Unlock, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, LockerLog } from '@/services/databaseService';

interface LockerLogsManagerProps {
  logs: LockerLog[];
  setLogs: (logs: LockerLog[]) => void;
  onDataChange?: () => void;
}

export function LockerLogsManager({ logs, setLogs, onDataChange }: LockerLogsManagerProps) {
  const [loading, setLoading] = useState(false);

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
      case 'booking_created':
        return <Activity className="w-4 h-4 text-purple-600" />;
      case 'booking_cancelled':
        return <Activity className="w-4 h-4 text-yellow-600" />;
      case 'item_retrieved':
        return <Unlock className="w-4 h-4 text-emerald-600" />;
      case 'maintenance':
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      close: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800',
      sensor_trigger: 'bg-orange-100 text-orange-800',
      booking_created: 'bg-purple-100 text-purple-800',
      booking_cancelled: 'bg-yellow-100 text-yellow-800',
      item_retrieved: 'bg-emerald-100 text-emerald-800',
      maintenance: 'bg-gray-100 text-gray-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getActionLabel = (action: string) => {
    const labels = {
      open: 'Buka',
      close: 'Tutup',
      error: 'Error',
      sensor_trigger: 'Sensor Triggered',
      booking_created: 'Booking Dibuat',
      booking_cancelled: 'Booking Dibatalkan',
      item_retrieved: 'Barang Diambil',
      maintenance: 'Maintenance'
    };
    return labels[action as keyof typeof labels] || action;
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
            {logs.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAllLogs}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hapus Semua
              </Button>
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
                    <TableHead className="font-semibold">Aksi</TableHead>
                    <TableHead className="font-semibold">Waktu</TableHead>
                    <TableHead className="font-semibold">Key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{log.id}</TableCell>
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
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(log.action_time).toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{log.key}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
