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
import { cn, formatDate, formatBsMonthYear, getBsDateParts, toNepaliDigits } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { NepaliDateInput } from '@/components/ui/NepaliDateInput';

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
      const payload = {
        employee_id: employeeId,
        amount,
        payment_date: paymentDate,
        month,
        year,
        payment_type: paymentType,
        remarks
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
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-2xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
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

            {selectedEmployee && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start gap-2 border border-blue-100">
                <Info className="size-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <span className="font-semibold">{selectedEmployee.name}</span>'s standard {selectedEmployee.salary_basis}:
                  <span className="ml-1 font-bold">
                    {selectedEmployee.salary_basis === 'salary' ? `Rs. ${selectedEmployee.salary_amount}` : `${selectedEmployee.percentage}%`}
                  </span>
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

          <div className="md:col-span-2">
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
