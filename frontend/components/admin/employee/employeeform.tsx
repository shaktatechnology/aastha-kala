'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Upload, X, User, Wallet, 
  AlertCircle, Layout, ImageIcon, Save, Calendar, Phone, Mail, MapPin, Facebook, Instagram
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_BASE = process.env.NEXT_PUBLIC_IMAGE_URL;

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

export function EmployeeForm({ 
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
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  
  // Form state
  const [name, setName] = React.useState(initialData?.name || "");
  const [email, setEmail] = React.useState(initialData?.email || "");
  const [deviceUserId, setDeviceUserId] = React.useState(initialData?.device_user_id || "");
  const [phone, setPhone] = React.useState(initialData?.phone || "");
  const [address, setAddress] = React.useState(initialData?.address || "");
  const [type, setType] = React.useState(initialData?.type || "staff");
  const [salaryBasis, setSalaryBasis] = React.useState(initialData?.salary_basis || "salary");
  const [salaryAmount, setSalaryAmount] = React.useState(initialData?.salary_amount || "");
  const [percentage, setPercentage] = React.useState(initialData?.percentage || "");
  const [joiningDate, setJoiningDate] = React.useState(initialData?.joining_date || "");
  const [status, setStatus] = React.useState(initialData?.status ?? true);
  const [image, setImage] = React.useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = React.useState(false);

  // Instructor specific state
  const [title, setTitle] = React.useState(initialData?.instructor?.title || "");
  const [about, setAbout] = React.useState(initialData?.instructor?.about || "");
  const [facebookUrl, setFacebookUrl] = React.useState(initialData?.instructor?.facebook_url || "");
  const [instagramUrl, setInstagramUrl] = React.useState(initialData?.instructor?.instagram_url || "");

  const handleSave = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      if (salaryBasis === 'salary' && Number(salaryAmount) < 0) {
        setErrors({ salary_amount: ["Salary amount cannot be negative"] });
        setIsLoading(false);
        return;
      }
      
      if (salaryBasis === 'percentage' && (Number(percentage) < 0 || Number(percentage) > 100)) {
        setErrors({ percentage: ["Percentage must be between 0 and 100"] });
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      if (initialData) formData.append('_method', 'PUT');
      
      formData.append('name', name);
      if (email) formData.append('email', email);
      if (deviceUserId) formData.append('device_user_id', deviceUserId);
      if (phone) formData.append('phone', phone);
      if (address) formData.append('address', address);
      formData.append('type', type);
      formData.append('salary_basis', salaryBasis);
      if (salaryAmount) formData.append('salary_amount', salaryAmount);
      if (percentage) formData.append('percentage', percentage);
      if (joiningDate) formData.append('joining_date', joiningDate);
      formData.append('status', status ? '1' : '0');
      if (image) {
        formData.append('image', image);
      } else if (imageRemoved) {
        formData.append('remove_image', '1');
      }

      if (type === 'instructor') {
        formData.append('title', title);
        formData.append('about', about);
        if (facebookUrl) formData.append('facebook_url', facebookUrl);
        if (instagramUrl) formData.append('instagram_url', instagramUrl);
      }

      const response = await fetch(`${API_URL}/admin/employees${initialData ? `/${initialData.id}` : ''}`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem("token")}` 
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Operation failed';
        try {
          const errorData = await response.json();
          if (errorData.errors) {
            setErrors(errorData.errors);
            const firstErrorField = Object.keys(errorData.errors)[0];
            if (firstErrorField) {
              errorMessage = errorData.errors[firstErrorField][0];
            } else {
              errorMessage = errorData.message || errorMessage;
            }
          } else {
            errorMessage = errorData.message || errorMessage;
          }
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      toast.success(`Employee ${initialData ? 'updated' : 'created'} successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-2xl font-bold text-gray-900">
          {isViewMode ? 'View Employee' : initialData ? 'Edit Employee' : 'Add New Employee'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isViewMode ? 'Viewing employee details' : `Fill in the details below to ${initialData ? 'update' : 'add'} an employee`}
        </p>
      </div>

      {/* Form Content */}
      <div className={cn("p-8 space-y-8", isViewMode && "pointer-events-none")}>
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="size-5 text-blue-600" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel label="Full Name" required />
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="pl-10 h-11"
                  />
                </div>
                <ErrorMessage message={errors.name?.[0]} />
              </div>
              
              <div>
                <FieldLabel label="Email Address" />
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="pl-10 h-11"
                  />
                </div>
                <ErrorMessage message={errors.email?.[0]} />
              </div>

              <div>
                <FieldLabel label="Device User ID (ZKTeco)" />
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={deviceUserId}
                    onChange={(e) => setDeviceUserId(e.target.value)}
                    placeholder="Machine ID (e.g. 101)"
                    className="pl-10 h-11"
                  />
                </div>
                <ErrorMessage message={errors.device_user_id?.[0]} />
              </div>

              <div>
                <FieldLabel label="Phone Number" />
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+\- ]/g, '');
                      // Limit to 10 if no + (local), or 15 if + (international)
                      const maxLength = val.startsWith('+') ? 15 : 10;
                      setPhone(val.slice(0, maxLength));
                    }}
                    placeholder="+977 98..."
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div>
                <FieldLabel label="Address" />
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter city, street..."
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel label="Profile Image" />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center hover:border-blue-400 transition-colors h-[180px] flex items-center justify-center overflow-hidden">
                {image || (initialData?.image && !imageRemoved) ? (
                  <div className="relative w-full h-full">
                    <img
                      src={image ? URL.createObjectURL(image) : (initialData?.image?.startsWith('http') ? initialData.image : `${IMAGE_BASE}/${initialData?.image}`)}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          if (!image) setImageRemoved(true);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4 w-full">
                    <Upload className="size-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-xs text-gray-500">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Employment & Salary Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="size-5 text-blue-600" />
            Employment & Salary Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <FieldLabel label="Employee Type" required />
              <CustomSelect
                value={type}
                onChange={(val) => setType(val)}
                options={[
                  { value: 'staff', label: 'Staff' },
                  { value: 'instructor', label: 'Instructor' }
                ]}
              />
              <ErrorMessage message={errors.type?.[0]} />
            </div>

            <div>
              <FieldLabel label="Salary Basis" required />
              <CustomSelect
                value={salaryBasis}
                onChange={(val) => setSalaryBasis(val)}
                options={[
                  { value: 'salary', label: 'Salary Based' },
                  ...(type === 'instructor' ? [
                    { value: 'percentage', label: 'Percentage Based' },
                    { value: 'none', label: 'No Fixed Salary' }
                  ] : [])
                ]}
              />
              <ErrorMessage message={errors.salary_basis?.[0]} />
            </div>

            <div>
              <FieldLabel label="Joining Date" />
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {salaryBasis === 'salary' && (
              <div>
                <FieldLabel label="Monthly Salary Amount" required />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">Rs.</span>
                  <Input
                    type="number"
                    min="0"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(Math.max(0, Number(e.target.value)).toString())}
                    className="pl-10 h-11"
                    placeholder="0.00"
                  />
                </div>
                <ErrorMessage message={errors.salary_amount?.[0]} />
              </div>
            )}

            {salaryBasis === 'percentage' && (
              <div>
                <FieldLabel label="Percentage (%)" required />
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 100) setPercentage("100");
                      else setPercentage(Math.max(0, val).toString());
                    }}
                    className="h-11"
                    placeholder="e.g. 50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">%</span>
                </div>
                <ErrorMessage message={errors.percentage?.[0]} />
              </div>
            )}

            <div>
              <FieldLabel label="Status" />
              <button
                type="button"
                onClick={() => setStatus(!status)}
                className={cn(
                  "w-full px-4 py-2 text-left rounded-lg border transition-all h-11",
                  status 
                    ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" 
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{status ? 'Active' : 'Inactive'}</span>
                  <div className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    status ? "bg-green-500" : "bg-gray-400"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                      status ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Instructor Specific Fields */}
        {type === 'instructor' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="size-5 text-blue-600" />
              Instructor Details
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel label="Professional Title" required />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Vocalist, Kathak Expert"
                  className="h-11"
                />
                <ErrorMessage message={errors.title?.[0]} />
              </div>

              <div>
                <FieldLabel label="About / Bio" />
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell us about the instructor's background and expertise..."
                  rows={4}
                />
              </div>


            </div>
          </div>
        )}
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
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white px-8 h-11 text-base font-medium shadow-sm"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  {initialData ? 'Update Employee' : 'Add Employee'}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
