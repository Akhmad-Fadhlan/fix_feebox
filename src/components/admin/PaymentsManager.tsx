
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Eye, Download, RefreshCw, AlertTriangle, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { databaseService, Payment } from '@/services/databaseService';

interface PaymentsManagerProps {
  payments: Payment[];
  setPayments: (payments: Payment[]) => void;
  onDataChange?: () => void;
}

export function PaymentsManager({ payments, setPayments, onDataChange }: PaymentsManagerProps) {
  const [loading, setLoading] = useState(false);

  // Enhanced safe calculation functions with better null/undefined handling
  const safeToLocaleString = (value: any): string => {
    if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
      return '0';
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return '0';
    }
    return numValue.toLocaleString();
  };

  const safeSum = (array: any[], condition: (item: any) => boolean): number => {
    if (!Array.isArray(array)) return 0;
    return array
      .filter(item => item && condition(item))
      .reduce((sum, item) => {
        const amount = Number(item.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
  };

  const safeFilter = (array: any[], condition: (item: any) => boolean): any[] => {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item && condition(item));
  };

  // Calculate total income from successful payments
  const totalIncome = useMemo(() => {
    return safeSum(payments, payment => payment.status === 'success' || payment.status === 'paid');
  }, [payments]);

  // Calculate monthly income
  const monthlyIncome = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return safeSum(payments, payment => {
      if ((payment.status !== 'success' && payment.status !== 'paid') || !payment.transaction_time) return false;
      const paymentDate = new Date(payment.transaction_time);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });
  }, [payments]);

  // Calculate daily income
  const dailyIncome = useMemo(() => {
    const today = new Date().toDateString();
    
    return safeSum(payments, payment => {
      if ((payment.status !== 'success' && payment.status !== 'paid') || !payment.transaction_time) return false;
      const paymentDate = new Date(payment.transaction_time);
      return paymentDate.toDateString() === today;
    });
  }, [payments]);

  const successfulPayments = safeFilter(payments, p => p.status === 'success' || p.status === 'paid').length;
  const pendingPayments = safeFilter(payments, p => p.status === 'pending').length;
  const failedPayments = safeFilter(payments, p => p.status === 'failed').length;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      if (onDataChange) {
        await onDataChange();
      }
      toast({
        title: "Sukses",
        description: "Data pembayaran berhasil di-refresh",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal me-refresh data pembayaran",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Yakin ingin menghapus pembayaran ini?')) return;
    
    try {
      await databaseService.deletePayment(paymentId);
      setPayments(payments.filter(p => p.id !== paymentId));
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: "Pembayaran berhasil dihapus",
      });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus pembayaran",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllPayments = async () => {
    if (payments.length === 0) {
      toast({
        title: "Info",
        description: "Tidak ada data pembayaran untuk dihapus",
      });
      return;
    }

    if (!confirm(`PERINGATAN: Yakin ingin menghapus SEMUA ${payments.length} data pembayaran? Tindakan ini tidak dapat dibatalkan!`)) return;
    if (!confirm('Konfirmasi sekali lagi: Hapus SEMUA data pembayaran dari Firebase?')) return;
    
    try {
      setLoading(true);
      console.log(`Deleting all ${payments.length} payments...`);
      await databaseService.deleteAllPayments();
      setPayments([]);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      toast({
        title: "Sukses",
        description: `Semua ${payments.length} data pembayaran berhasil dihapus`,
      });
    } catch (error) {
      console.error('Error deleting all payments:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus semua data pembayaran",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (payment: Payment) => {
    try {
      setLoading(true);
      console.log('Verifying payment:', payment.order_id);
      
      // Call webhook API to verify payment
      const response = await fetch('https://projectiot.web.id/api/v1/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: payment.order_id,
          duitku_payment_id: payment.duitku_payment_id,
          amount: payment.amount,
          payment_method: payment.payment_method
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Payment verification result:', result);
        
        // Update payment status based on verification
        const updatedPayment = { ...payment, status: result.status || 'verified' };
        const updatedPayments = payments.map(p => 
          p.id === payment.id ? updatedPayment : p
        );
        setPayments(updatedPayments);
        
        // Update in database
        if (payment.id) {
          await databaseService.updatePayment(payment.id, updatedPayment);
        }
        
        toast({
          title: "Sukses",
          description: "Pembayaran berhasil diverifikasi",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "Gagal memverifikasi pembayaran",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Income Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">Rp {safeToLocaleString(totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pemasukan Bulan Ini</p>
                <p className="text-2xl font-bold text-blue-600">Rp {safeToLocaleString(monthlyIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pemasukan Hari Ini</p>
                <p className="text-2xl font-bold text-purple-600">Rp {safeToLocaleString(dailyIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transaksi Berhasil</p>
                <p className="text-2xl font-bold text-green-600">{successfulPayments}</p>
                <p className="text-xs text-gray-500">
                  Pending: {pendingPayments} | Gagal: {failedPayments}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Manajemen Pembayaran ({payments.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {payments.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAllPayments}
                disabled={loading}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hapus Semua ({payments.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Belum ada data pembayaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Duitku ID</TableHead>
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Payment Method</TableHead>
                    <TableHead className="font-semibold">Transaction Time</TableHead>
                    <TableHead className="font-semibold">Key</TableHead>
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments
                    .sort((a, b) => {
                      const timeA = a.transaction_time ? new Date(a.transaction_time).getTime() : 0;
                      const timeB = b.transaction_time ? new Date(b.transaction_time).getTime() : 0;
                      return timeB - timeA;
                    })
                    .map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{payment.duitku_payment_id || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.order_id || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        <span className={(payment.status === 'success' || payment.status === 'paid') ? 'text-green-600' : payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>
                          Rp {safeToLocaleString(payment.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status || 'pending')}>
                          {payment.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.paymentMethod || payment.payment_method || 'N/A'}</TableCell>
                      <TableCell>
                        {payment.transaction_time ? 
                          new Date(payment.transaction_time).toLocaleString('id-ID') : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{payment.key || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleVerifyPayment(payment)}
                            disabled={loading}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => payment.id && handleDeletePayment(payment.id)}
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
    </div>
  );
}
