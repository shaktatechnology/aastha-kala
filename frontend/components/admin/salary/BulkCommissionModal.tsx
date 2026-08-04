'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Layers, CheckCircle2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { NepaliDateInput } from '@/components/ui/NepaliDateInput';
import { CustomSelect } from '@/components/ui/custom-select';
import { Spinner } from '@/components/ui/spinner';
import { cn, nepaliMonthNames, toNepaliDigits } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const getMonthName = (m: number) => nepaliMonthNames[m - 1] || 'Unknown';

interface PendingMonth {
  month: number;
  year: number;
  gross_commission: number;
  vat_cut: number;
  net_commission: number;
  already_paid: number;
  remaining: number;
  sources: ('fee' | 'income')[];
}

interface RowState {
  selected: boolean;
  amount: string;
}

export function BulkCommissionModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [employeeId, setEmployeeId] = React.useState('');
  const [loadingEmployees, setLoadingEmployees] = React.useState(false);

  const [pendingMonths, setPendingMonths] = React.useState<PendingMonth[]>([]);
  const [loadingPending, setLoadingPending] = React.useState(false);
  const [rowStates, setRowStates] = React.useState<Record<string, RowState>>({});

  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setLoadingEmployees(true);
    fetch(`${API_URL}/admin/all-employees`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => {
        const all: any[] = d.data || [];
        const active = all.filter((e: any) => e.status == 1 || e.status === true);
        const eligible = active.filter(
          (e: any) => e.salary_basis === 'percentage' || (e.salary_basis === 'none' && e.instructor)
        );
        setEmployees(eligible);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoadingEmployees(false));
  }, [isOpen]);

  React.useEffect(() => {
    if (!employeeId) { setPendingMonths([]); setRowStates({}); return; }
    setLoadingPending(true);
    fetch(`${API_URL}/admin/salary-payments/pending-commissions?employee_id=${employeeId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const months: PendingMonth[] = d.data || [];
          setPendingMonths(months);
          const states: Record<string, RowState> = {};
          months.forEach(m => {
            states[`${m.month}-${m.year}`] = { selected: true, amount: m.remaining.toString() };
          });
          setRowStates(states);
        } else {
          toast.error(d.message || 'Failed to fetch pending commissions');
          setPendingMonths([]); setRowStates({});
        }
      })
      .catch(() => toast.error('Failed to fetch pending commissions'))
      .finally(() => setLoadingPending(false));
  }, [employeeId]);

  const toggleRow = (key: string) =>
    setRowStates(prev => ({ ...prev, [key]: { ...prev[key], selected: !prev[key].selected } }));

  const setAmt = (key: string, val: string) =>
    setRowStates(prev => ({ ...prev, [key]: { ...prev[key], amount: val } }));

  const selectedRows = pendingMonths.filter(m => rowStates[`${m.month}-${m.year}`]?.selected);
  const totalPaying = selectedRows.reduce((acc, m) => {
    const a = parseFloat(rowStates[`${m.month}-${m.year}`]?.amount || '0');
    return acc + (isNaN(a) ? 0 : a);
  }, 0);

  const handlePay = async () => {
    if (!employeeId) return toast.error('Please select an employee');
    if (!paymentDate) return toast.error('Please select a payment date');
    if (selectedRows.length === 0) return toast.error('Please select at least one month');

    const payouts = selectedRows.map(m => {
      const key = `${m.month}-${m.year}`;
      return {
        month: m.month, year: m.year,
        amount: parseFloat(rowStates[key].amount),
        remarks: `Commission payout for ${getMonthName(m.month)} ${toNepaliDigits(m.year)}`,
      };
    });

    const invalid = payouts.find(p => !p.amount || p.amount <= 0);
    if (invalid) return toast.error(`Invalid amount for ${getMonthName(invalid.month)}`);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/salary-payments/bulk-commission-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ employee_id: employeeId, payment_date: paymentDate, payouts }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Payments recorded successfully');
        onSuccess(); onClose();
      } else {
        toast.error(data.message || 'Failed to record payments');
      }
    } catch { toast.error('Network error — please try again'); }
    finally { setSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Multi-Month Commission Payout</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Pay outstanding commission across multiple months at once</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Instructor</label>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 h-11 px-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Spinner size="sm" /><span className="text-sm text-gray-400">Loading...</span>
                </div>
              ) : (
                <CustomSelect
                  value={employeeId}
                  onChange={val => { setEmployeeId(val); }}
                  options={employees.map(e => ({ value: e.id, label: `${e.name} (${e.type})` }))}
                  placeholder="Select instructor..."
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <NepaliDateInput value={paymentDate} onChange={setPaymentDate} placeholder="Select date" />
            </div>
          </div>

          {!employeeId ? (
            <div className="text-center py-10 text-sm text-gray-400">Select an instructor to view pending commissions.</div>
          ) : loadingPending ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Spinner size="sm" />
              <span className="text-sm text-gray-400">Scanning last 12 months...</span>
            </div>
          ) : pendingMonths.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">All caught up!</p>
              <p className="text-xs text-gray-400 mt-1">No outstanding commission in the last 12 months.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {pendingMonths.length} month{pendingMonths.length > 1 ? 's' : ''} with outstanding balance
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRowStates(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, selected: true }])))} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline cursor-pointer">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => setRowStates(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, selected: false }])))} className="text-[10px] font-bold text-gray-500 uppercase hover:underline cursor-pointer">Clear</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                <div className="grid grid-cols-[32px_1fr_100px_110px_100px] gap-2 px-4 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <div /><div>Month</div><div className="text-right">Earned</div><div className="text-right">Paid</div><div className="text-right">Amount</div>
                </div>

                {pendingMonths.map(m => {
                  const key = `${m.month}-${m.year}`;
                  const row = rowStates[key] || { selected: false, amount: m.remaining.toString() };
                  return (
                    <div key={key} className={cn('grid grid-cols-[32px_1fr_100px_110px_100px] gap-2 px-4 py-3 items-center transition-colors', row.selected ? 'bg-indigo-50/40' : 'bg-white opacity-60')}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRow(key)} className="rounded w-4 h-4 cursor-pointer accent-indigo-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{getMonthName(m.month)} {toNepaliDigits(m.year)}</div>
                        <div className="flex gap-1 mt-0.5">
                          {m.sources.includes('fee') && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Fee</span>}
                          {m.sources.includes('income') && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Income</span>}
                          {m.already_paid > 0 && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Partial</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-gray-700">Rs. {m.net_commission.toLocaleString()}</div>
                      <div className="text-right">
                        {m.already_paid > 0 ? <span className="text-sm font-medium text-amber-600">-Rs. {m.already_paid.toLocaleString()}</span> : <span className="text-sm text-gray-300">—</span>}
                      </div>
                      <div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">Rs.</span>
                          <input
                            type="number" min="0.01" step="0.01"
                            disabled={!row.selected}
                            value={row.amount}
                            onChange={e => setAmt(key, e.target.value)}
                            className={cn('w-full pl-7 pr-2 py-1.5 text-sm border rounded-lg text-right font-semibold', row.selected ? 'border-indigo-200 text-indigo-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400' : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed')}
                          />
                        </div>
                        {row.selected && parseFloat(row.amount) > m.remaining && (
                          <p className="text-[9px] text-red-500 text-right mt-0.5">Exceeds balance</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingMonths.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">{selectedRows.length} month{selectedRows.length !== 1 ? 's' : ''} selected</p>
              <p className="text-lg font-extrabold text-indigo-700">Total: Rs. {totalPaying.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handlePay} disabled={submitting || selectedRows.length === 0}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer">
                {submitting ? (<><Spinner size="sm" /> Recording...</>) : (<><CreditCard className="size-4" /> Pay {selectedRows.length} Month{selectedRows.length !== 1 ? 's' : ''}</>)}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
