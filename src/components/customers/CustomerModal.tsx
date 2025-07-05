import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Loader2 } from 'lucide-react'
import { customersApi } from '../../services/api'
import toast from 'react-hot-toast'

interface CustomerModalProps {
  customer?: any
  onClose: () => void
}

interface CustomerForm {
  fullName: string
  nrcNumber: string
  phoneNumber: string
  email?: string
  address: string
  city: string
  dateOfBirth: string
  age: number
  gender: string
  maritalStatus: string
  companyName?: string
  employeeNumber?: string
  employmentStatus: string
  monthlyIncome?: number
  bankName?: string
  accountNumber?: string
  nextOfKin?: string
  relationship?: string
  nextOfKinPhone?: string
}

export default function CustomerModal({ customer, onClose }: CustomerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CustomerForm>({
    defaultValues: customer || {},
  })

  const onSubmit = async (data: CustomerForm) => {
    setIsLoading(true)
    try {
      if (isEdit) {
        await customersApi.update(customer._id, data)
        toast.success('Customer updated successfully')
      } else {
        await customersApi.create(data)
        toast.success('Customer created successfully')
      }
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  {...register('fullName', { required: 'Full name is required' })}
                  type="text"
                  className="input"
                />
                {errors.fullName && (
                  <p className="form-error">{errors.fullName.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">NRC Number *</label>
                <input
                  {...register('nrcNumber', { required: 'NRC number is required' })}
                  type="text"
                  className="input"
                  placeholder="123456/12/1"
                />
                {errors.nrcNumber && (
                  <p className="form-error">{errors.nrcNumber.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  {...register('phoneNumber', { required: 'Phone number is required' })}
                  type="tel"
                  className="input"
                />
                {errors.phoneNumber && (
                  <p className="form-error">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input
                  {...register('dateOfBirth', { required: 'Date of birth is required' })}
                  type="date"
                  className="input"
                />
                {errors.dateOfBirth && (
                  <p className="form-error">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Age *</label>
                <input
                  {...register('age', { 
                    required: 'Age is required',
                    min: { value: 18, message: 'Must be at least 18 years old' }
                  })}
                  type="number"
                  className="input"
                />
                {errors.age && (
                  <p className="form-error">{errors.age.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select
                  {...register('gender', { required: 'Gender is required' })}
                  className="input"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="form-error">{errors.gender.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <select
                  {...register('maritalStatus')}
                  className="input"
                >
                  <option value="">Select status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              <div className="form-group md:col-span-2">
                <label className="form-label">Address *</label>
                <input
                  {...register('address', { required: 'Address is required' })}
                  type="text"
                  className="input"
                />
                {errors.address && (
                  <p className="form-error">{errors.address.message}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  {...register('city', { required: 'City is required' })}
                  type="text"
                  className="input"
                />
                {errors.city && (
                  <p className="form-error">{errors.city.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select
                  {...register('employmentStatus')}
                  className="input"
                >
                  <option value="">Select status</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Retired">Retired</option>
                  <option value="Student">Student</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  {...register('companyName')}
                  type="text"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee Number</label>
                <input
                  {...register('employeeNumber')}
                  type="text"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Income</label>
                <input
                  {...register('monthlyIncome')}
                  type="number"
                  className="input"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Next of Kin */}
          <div>
            <h3 className="text-lg font-medium mb-4">Next of Kin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Next of Kin Name</label>
                <input
                  {...register('nextOfKin')}
                  type="text"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship</label>
                <input
                  {...register('relationship')}
                  type="text"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Next of Kin Phone</label>
                <input
                  {...register('nextOfKinPhone')}
                  type="tel"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Customer' : 'Create Customer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}