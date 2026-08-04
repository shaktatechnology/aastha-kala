'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import {
  User, Wallet, AlertCircle, Save, Calendar, Info
} from 'lucide-react';
import { cn, formatDate, formatBsMonthYear, getBsDateParts, toNepaliDigits, nepaliMonthNames } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { NepaliDateInput } from '@/components/ui/NepaliDateInput';

const getMonthName = (m: number) => nepaliMonthNames[m - 1] || "Unknown";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="size-3" />
      {message}
    </p>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export function SalaryForm({
  initialData,
  onSuccess,
  onCancel,
  isViewMode = false
}: {
  initialData?: any,
  onSuccess: () => void,
  onCancel: () => void,
  isViewMode?: boolean
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [fetchingEmployees, setFetchingEmployees] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const currentBs = getBsDateParts(new Date()) || { month: 1, year: 2083 };

  // Form state
  const [employeeId, setEmployeeId] = React.useState(initialData?.employee_id || "");
  const [amount, setAmount] = React.useState(initialData?.amount || "");
  const [paymentDate, setPaymentDate] = React.useState(initialData?.payment_date || new Date().toISOString().split('T')[0]);
  const [month, setMonth] = React.useState(initialData?.month || currentBs.month);
  const [year, setYear] = React.useState(initialData?.year || currentBs.year);
  const [paymentType, setPaymentType] = React.useState(initialData?.payment_type || "salary");
  const [remarks, setRemarks] = React.useState(initialData?.remarks || "");

  // Commission States (fee-based)
  const [commissionData, setCommissionData] = React.useState<any>(null);
  const [commissionBasis, setCommissionBasis] = React.useState<"collected" | "billed">(
    initialData?.commission_basis || "collected"
  );
  const [loadingCommission, setLoadingCommission] = React.useState(false);

  // Commission States (company-income-based)
  const [incomeCommissionData, setIncomeCommissionData] = React.useState<any>(null);
  const [loadingIncomeCommission, setLoadingIncomeCommission] = React.useState(false);

  const fetchCommission = async (empId: string, m: number, y: number) => {
    if (!empId) return;
    const emp = employees.find(e => e.id.toString() === empId.toString());
    // Only fetch if the explicit fee commission flag is enabled
    if (!emp?.earns_fee_commission) {
      setCommissionData(null);
      return;
    }

    try {
      setLoadingCommission(true);
      const res = await fetch(`${API_URL}/admin/salary-payments/calculate-commission?employee_id=${empId}&month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCommissionData(data.data);
      } else {
        setCommissionData(null);
      }
    } catch (error) {
      console.error("Failed to fetch commission calculations", error);
      setCommissionData(null);
    } finally {
      setLoadingCommission(false);
    }
  };

  const fetchCommissionFromIncome = async (empId: string, m: number, y: number) => {
    if (!empId) return;
    const emp = employees.find(e => e.id.toString() === empId.toString());
    // Only fetch if the explicit income commission flag is enabled AND employee is an instructor
    if (!emp?.earns_income_commission || !emp?.instructor) {
      setIncomeCommissionData(null);
      return;
    }
    try {
      setLoadingIncomeCommission(true);
      const res = await fetch(`${API_URL}/admin/salary-payments/calculate-commission-from-income?employee_id=${empId}&month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setIncomeCommissionData(data.data);
      } else {
        setIncomeCommissionData(null);
      }
    } catch (error) {
      console.error("Failed to fetch income commission calculations", error);
      setIncomeCommissionData(null);
    } finally {
      setLoadingIncomeCommission(false);
    }
  };

  React.useEffect(() => {
    if (employeeId && month && year && employees.length > 0) {
      fetchCommission(employeeId.toString(), Number(month), Number(year));
      fetchCommissionFromIncome(employeeId.toString(), Number(month), Number(year));
    }
  }, [employeeId, month, year, employees]);

  // Note: payment type is not auto-forced — let the user choose freely.
  // An employee can receive both salary and commission in the same month (different payment_type).

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setFetchingEmployees(true);
      const res = await fetch(`${API_URL}/admin/all-employees`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      // Only show active employees for salary processing
      const allEmps = data.data || [];
      setEmployees(allEmps.filter((emp: any) => emp.status == 1 || emp.status === true));
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setFetchingEmployees(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      if (Number(amount) <= 0) {
        setErrors({ amount: ["Please enter a valid positive amount"] });
        setIsLoading(false);
        return;
      }
      const isCommissionBasis = selectedEmployee?.salary_basis === 'percentage';
      const calcResult = isCommissionBasis && commissionData?.bases?.[commissionBasis];

      const payload = {
        employee_id: employeeId,
        amount,
        payment_date: paymentDate,
        month,
        year,
        payment_type: paymentType,
        remarks,
        // Commission fields
        ...(isCommissionBasis && calcResult && {
          commission_gross: calcResult.gross_commission,
          commission_vat: calcResult.vat_cut,
          commission_percentage: commissionData?.employee?.percentage || null,
          commission_collected_amount: commissionBasis === 'collected' ? commissionData?.total_collected : commissionData?.total_billed,
          commission_method: 'deduct_from_commission',
          commission_basis: commissionBasis || null,
        })
      };

      const response = await fetch(`${API_URL}/admin/salary-payments${initialData ? `/${initialData.id}` : ''}`, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || 'Operation failed';
        if (errorData.errors) {
          setErrors(errorData.errors);
          const firstErrorField = Object.keys(errorData.errors)[0];
          if (firstErrorField) {
            errorMessage = errorData.errors[firstErrorField][0];
          }
        }
        throw new Error(errorMessage);
      }

      toast.success(`Payment ${initialData ? 'updated' : 'recorded'} successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id.toString() === employeeId.toString());

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-white">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? 'Edit Salary Payment' : 'Record Salary Payment'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isViewMode ? 'Viewing payment details' : 'Enter payment details below'}
        </p>
      </div>

      {/* Form Content */}
      <div className={cn("p-8 space-y-6", isViewMode && "pointer-events-none")}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="md:col-span-2 lg:col-span-4">
            <FieldLabel label="Select Employee" required />
            <CustomSelect
              value={employeeId}
              onChange={(val) => setEmployeeId(val)}
              options={employees.map(emp => ({
                value: emp.id,
                label: `${emp.name} (${emp.type.toUpperCase()})`
              }))}
              placeholder="Select an employee"
            />
            <ErrorMessage message={errors.employee_id?.[0]} />

            {selectedEmployee && selectedEmployee.salary_basis !== 'none' && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start gap-2 border border-blue-100">
                <Info className="size-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <span className="font-semibold">{selectedEmployee.name}</span>'s standard {selectedEmployee.salary_basis}:
                  <span className="ml-1 font-bold">
                    {selectedEmployee.salary_basis === 'salary'
                      ? `Rs. ${selectedEmployee.salary_amount}`
                      : `${selectedEmployee.percentage}%`}
                  </span>
                  {selectedEmployee.earns_fee_commission && (
                    <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Fee Commission ON</span>
                  )}
                  {selectedEmployee.earns_income_commission && (
                    <span className="ml-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Income Commission ON</span>
                  )}
                </div>
              </div>
            )}
            {selectedEmployee && selectedEmployee.salary_basis === 'none' && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-lg flex items-start gap-2 border border-indigo-100">
                <Info className="size-4 text-indigo-500 mt-0.5" />
                <div className="text-sm text-indigo-700">
                  <span className="font-semibold">{selectedEmployee.name}</span> earns commission from company income entries.
                  {selectedEmployee.earns_fee_commission && (
                    <span className="ml-2 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Fee Commission ON</span>
                  )}
                  {selectedEmployee.earns_income_commission && (
                    <span className="ml-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Income Commission ON</span>
                  )}
                </div>
              </div>
            )}

          </div>

          <div>
            <FieldLabel label="Payment Type" required />
            <CustomSelect
              value={paymentType}
              onChange={(val) => setPaymentType(val)}
              options={[
                { value: 'salary', label: 'Regular Salary' },
                { value: 'commission', label: 'Commission' },
                { value: 'pre-pay', label: 'Pre-pay (Advance)' },
                { value: 'bonus', label: 'Bonus / Extra' }
              ]}
            />
            <ErrorMessage message={errors.payment_type?.[0]} />
          </div>

          <div>
            <FieldLabel label="Amount Paid" required />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)).toString())}
                className="pl-10 h-11"
                placeholder="0.00"
              />
            </div>
            <ErrorMessage message={errors.amount?.[0]} />
          </div>

          <div>
            <FieldLabel label="Payment Date" required />
            <NepaliDateInput
              value={paymentDate}
              onChange={(val) => setPaymentDate(val)}
              placeholder="Select payment date"
            />
            {paymentDate && (
              <p className="text-xs text-gray-500 mt-1.5 px-1">
                Selected: <span className="font-medium text-gray-700">{formatDate(paymentDate)}</span>
              </p>
            )}
            <ErrorMessage message={errors.payment_date?.[0]} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel label="Month (Nepali)" required />
              <CustomSelect
                value={month.toString()}
                onChange={(val) => setMonth(Number(val))}
                options={[
                  { value: "1", label: "बैशाख" },
                  { value: "2", label: "जेठ" },
                  { value: "3", label: "आषाढ" },
                  { value: "4", label: "श्रावण" },
                  { value: "5", label: "भाद्र" },
                  { value: "6", label: "आश्विन" },
                  { value: "7", label: "कार्तिक" },
                  { value: "8", label: "मार्गशीर्ष" },
                  { value: "9", label: "पौष" },
                  { value: "10", label: "माघ" },
                  { value: "11", label: "फाल्गुण" },
                  { value: "12", label: "चैत्र" }
                ]}
              />
            </div>
            <div>
              <FieldLabel label="Year" required />
              <CustomSelect
                value={year.toString()}
                onChange={(val) => setYear(Number(val))}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = currentBs.year - 2 + i;
                  return { value: y.toString(), label: toNepaliDigits(y) };
                })}
              />
            </div>
          </div>

          {/* Fee-Based Commission Helper — shown only if flag is explicitly enabled */}
          {selectedEmployee?.earns_fee_commission && (
            <div className="md:col-span-2 lg:col-span-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Commission Calculations Helper</h4>
                  <p className="text-xs text-slate-500">Based on fee collections for {getMonthName(Number(month))} {toNepaliDigits(Number(year))}</p>
                </div>
                {/* Basis Selector Pills */}
                <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCommissionBasis("collected");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      commissionBasis === "collected"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Fees Collected (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommissionBasis("billed");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                      commissionBasis === "billed"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Fees Billed (Total)
                  </button>
                </div>
              </div>

              {loadingCommission ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-slate-500">Calculating commission...</span>
                </div>
              ) : commissionData ? (
                <div className="space-y-5">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Basis Amount</span>
                      <p className="text-xl font-extrabold text-slate-800">
                        Rs. {Number(commissionBasis === 'collected' ? commissionData.total_collected : commissionData.total_billed).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        {commissionBasis === 'collected' ? 'Actual cash received' : 'Billed (incl. pending)'}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Commission Rate</span>
                      <p className="text-xl font-extrabold text-primary">
                        {commissionData.employee?.percentage}%
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Configured in Employee Profile
                      </span>
                    </div>
                  </div>

                  {/* Calculations & Breakdown Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Calculations summary */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Calculation Summary</span>
                      
                      <div className="divide-y divide-slate-100 text-sm">
                        <div className="flex justify-between py-2">
                          <span className="text-slate-500">Gross Commission:</span>
                          <span className="font-semibold text-slate-800">
                            Rs. {Number(commissionData.bases[commissionBasis]?.gross_commission || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-red-500 font-medium">
                          <span>VAT Deduction ({commissionData.vat_percentage}%):</span>
                          <span>
                            - Rs. {Number(commissionData.bases[commissionBasis]?.vat_cut || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-slate-900 font-bold border-t border-slate-200">
                          <span>Net Commission Earned:</span>
                          <span>
                            Rs. {Number(commissionData.bases[commissionBasis]?.net_commission || 0).toLocaleString()}
                          </span>
                        </div>
                        {(commissionData.already_paid ?? 0) > 0 && (
                          <div className="flex justify-between py-2 text-amber-600 font-medium">
                            <span>Already Paid This Month:</span>
                            <span>- Rs. {Number(commissionData.already_paid).toLocaleString()}</span>
                          </div>
                        )}
                        <div className={cn(
                          "flex justify-between py-2.5 text-base font-extrabold border-t border-slate-200 pt-3",
                          (commissionData.bases[commissionBasis]?.remaining ?? 0) <= 0
                            ? "text-slate-400"
                            : "text-emerald-600"
                        )}>
                          <span>Remaining Balance:</span>
                          <span>
                            Rs. {Number(commissionData.bases[commissionBasis]?.remaining ?? commissionData.bases[commissionBasis]?.net_commission ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const opt = commissionData.bases[commissionBasis];
                          const applyAmount = opt.remaining ?? opt.net_commission;
                          setAmount(applyAmount.toString());
                          setRemarks(
                            `Commission of ${commissionData.employee.percentage}% on ${
                              commissionBasis === 'collected' ? 'collected' : 'billed'
                            } fee Rs. ${Number(
                              commissionBasis === 'collected'
                                ? commissionData.total_collected
                                : commissionData.total_billed
                            ).toLocaleString()} after deducting VAT. Remaining balance.`
                          );
                          toast.success("Applied remaining commission balance to amount");
                        }}
                        className="w-full py-2.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer mt-2 flex items-center justify-center gap-1.5"
                      >
                        Apply Remaining Balance
                      </button>
                    </div>

                    {/* Breakdown details */}
                    {commissionData.breakdown && commissionData.breakdown.length > 0 ? (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Student/Program Fee Breakdown</span>
                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                          {commissionData.breakdown.map((row: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center px-3 py-2.5 text-xs">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800">{row.student_name}</span>
                                  <span className={cn(
                                    "px-1 py-0.5 rounded text-[9px] font-bold leading-none",
                                    row.is_custom_rate
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                                  )}>
                                    Rate: {row.commission_rate}% {row.is_custom_rate && "(Custom)"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{row.program_title}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-700">
                                  Paid: Rs. {row.paid_amount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Billed: Rs. {row.billed_amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-center py-8 text-xs text-slate-400 italic">
                        No student breakdown items for this month.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No fee collections recorded for this instructor in {getMonthName(Number(month))} {toNepaliDigits(Number(year))}.
                </div>
              )}
            </div>
          )}


          {/* Income-Based Commission Helper — shown only if both flag AND instructor record exist */}
          {selectedEmployee?.earns_income_commission && selectedEmployee?.instructor && (
            <div className="md:col-span-2 lg:col-span-4 p-6 bg-gradient-to-br from-indigo-50 to-slate-100 rounded-2xl border border-indigo-200 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Commission Calculations Helper</h4>
                  <p className="text-xs text-slate-500">Based on company income entries for {getMonthName(Number(month))} {toNepaliDigits(Number(year))}</p>
                </div>
                <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Company Income</span>
              </div>

              {loadingIncomeCommission ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-slate-500">Calculating commission from income...</span>
                </div>
              ) : incomeCommissionData ? (
                <div className="space-y-5">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Income</span>
                      <p className="text-xl font-extrabold text-slate-800">
                        Rs. {Number(incomeCommissionData.total_income).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-500 block">Sum of company income entries</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Commission</span>
                      <p className="text-xl font-extrabold text-primary">
                        Rs. {Number(incomeCommissionData.gross_commission).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-500 block">Before VAT deduction</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">VAT Rate</span>
                      <p className="text-xl font-extrabold text-red-500">
                        {incomeCommissionData.vat_percentage}%
                      </p>
                      <span className="text-[10px] text-slate-500 block">Applied to gross commission</span>
                    </div>
                  </div>

                  {/* Calculations & Breakdown Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Calculation summary */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Calculation Summary</span>
                        {(incomeCommissionData.already_paid ?? 0) > 0 && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Rs. {Number(incomeCommissionData.already_paid).toLocaleString()} already paid
                          </span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 text-sm">
                        <div className="flex justify-between py-2">
                          <span className="text-slate-500">Gross Commission:</span>
                          <span className="font-semibold text-slate-800">
                            Rs. {Number(incomeCommissionData.gross_commission).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-red-500 font-medium">
                          <span>VAT Deduction ({incomeCommissionData.vat_percentage}%):</span>
                          <span>- Rs. {Number(incomeCommissionData.vat_cut).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 text-slate-900 font-bold border-t border-slate-200">
                          <span>Net Commission Earned:</span>
                          <span>Rs. {Number(incomeCommissionData.net_commission).toLocaleString()}</span>
                        </div>
                        {(incomeCommissionData.already_paid ?? 0) > 0 && (
                          <div className="flex justify-between py-2 text-amber-600 font-medium">
                            <span>Already Paid This Month:</span>
                            <span>- Rs. {Number(incomeCommissionData.already_paid).toLocaleString()}</span>
                          </div>
                        )}
                        <div className={cn(
                          "flex justify-between py-2.5 text-base font-extrabold border-t border-slate-200 pt-3",
                          (incomeCommissionData.remaining ?? 0) <= 0 ? "text-slate-400" : "text-emerald-600"
                        )}>
                          <span>Remaining Balance:</span>
                          <span>Rs. {Number(incomeCommissionData.remaining ?? incomeCommissionData.net_commission).toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const applyAmount = incomeCommissionData.remaining ?? incomeCommissionData.net_commission;
                          setAmount(applyAmount.toString());
                          setRemarks(
                            `Commission from company income for ${getMonthName(Number(month))} ${toNepaliDigits(Number(year))}: Gross Rs. ${Number(incomeCommissionData.gross_commission).toLocaleString()}, VAT ${incomeCommissionData.vat_percentage}% = Rs. ${Number(incomeCommissionData.vat_cut).toLocaleString()}, Net Rs. ${Number(incomeCommissionData.net_commission).toLocaleString()}. Remaining balance.`
                          );
                          toast.success("Applied remaining commission balance to amount");
                        }}
                        className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer mt-2 flex items-center justify-center gap-1.5"
                      >
                        Apply Remaining Balance
                      </button>
                    </div>

                    {/* Per-entry breakdown */}
                    {incomeCommissionData.breakdown && incomeCommissionData.breakdown.length > 0 ? (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Company Income Entries Breakdown</span>
                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                          {incomeCommissionData.breakdown.map((row: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center px-3 py-2.5 text-xs">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800">{row.payer_name}</span>
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold leading-none bg-indigo-100 text-indigo-700">
                                    {row.commission_percentage}%
                                  </span>
                                </div>
                                {row.bill_number && <p className="text-[10px] text-slate-400 mt-0.5">Bill: {row.bill_number}</p>}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-700">
                                  Income: Rs. {Number(row.amount).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-indigo-600 font-semibold">
                                  Comm: Rs. {Number(row.commission_amount).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-center py-8 text-xs text-slate-400 italic">
                        No company income entries for this month.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No company income entries with commission found for this instructor in {getMonthName(Number(month))} {toNepaliDigits(Number(year))}.
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-4">

            <FieldLabel label="Remarks / Notes" />
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any internal notes about this payment..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        {isViewMode ? (
          <Button
            type="button"
            onClick={onCancel}
            className="bg-gray-800 text-white px-8 h-11 text-base font-medium"
          >
            Close
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-6 h-11 text-black bg-white border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || fetchingEmployees}
              className="bg-primary hover:bg-primary/90 text-white px-8 h-11 text-base font-medium shadow-sm"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Recording...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  {initialData ? 'Update Payment' : 'Record Payment'}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
