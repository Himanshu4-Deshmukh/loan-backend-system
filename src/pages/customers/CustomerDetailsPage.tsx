import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { ArrowLeft, Edit, CreditCard, DollarSign, Phone, Mail, MapPin } from 'lucide-react'
import { customersApi } from '../../services/api'
import { formatCurrency, formatDate, formatPhoneNumber, getStatusColor } from '../../utils/formatters'

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: customerData, isLoading } = useQuery(
    ['customer', id],
    () => customersApi.getSummary(id!),
    {
      enabled: !!id,
    }
  )

  const { data: loansData } = useQuery(
    ['customer-loans', id],
    () => customersApi.getLoans(id!),
    {
      enabled: !!id,
    }
  )

  const { data: paymentsData } = useQuery(
    ['customer-payments', id],
    () => customersApi.getPayments(id!),
    {
      enabled: !!id,
    }
  )

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="card-content p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const customer = customerData?.summary?.customer
  const summary = customerData?.summary

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/customers" className="btn btn-primary btn-md mt-4">
          Back to Customers
        </Link>
      </div>
    )
  }

  const loans = loansData?.loans || []
  const payments = paymentsData?.payments || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/customers"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.fullName}</h1>
            <p className="text-gray-600">Customer Details</p>
          </div>
        </div>
        <button className="btn btn-primary btn-md">
          <Edit className="w-4 h-4 mr-2" />
          Edit Customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{customer.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">NRC Number</label>
                  <p className="text-gray-900 font-mono">{customer.nrcNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{formatPhoneNumber(customer.phoneNumber)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{customer.email || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="text-gray-900">{customer.age} years</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900">{customer.gender}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{customer.address}, {customer.city}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Employment Information</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Employment Status</label>
                  <span className="badge badge-secondary">
                    {customer.employmentStatus}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-gray-900">{customer.companyName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Employee Number</label>
                  <p className="text-gray-900">{customer.employeeNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monthly Income</label>
                  <p className="text-gray-900">
                    {customer.monthlyIncome ? formatCurrency(customer.monthlyIncome) : 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Loans */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Recent Loans</h3>
            </div>
            <div className="card-content">
              {loans.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No loans found</p>
              ) : (
                <div className="space-y-3">
                  {loans.slice(0, 5).map((loan: any) => (
                    <div key={loan._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{loan.loanType}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(loan.loanAmount)} • {formatDate(loan.createdAt)}
                        </p>
                      </div>
                      <span className={`badge ${getStatusColor(loan.status)}`}>
                        {loan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Recent Payments</h3>
            </div>
            <div className="card-content">
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments found</p>
              ) : (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment: any) => (
                    <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(payment.paymentAmount)}</p>
                        <p className="text-sm text-gray-500">
                          {payment.paymentMethod} • {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <span className={`badge ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Summary</h3>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Total Loans</span>
                  </div>
                  <span className="font-semibold">{summary?.totalLoans || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-success-500" />
                    <span className="text-sm text-gray-600">Active Loans</span>
                  </div>
                  <span className="font-semibold text-success-600">{summary?.activeLoans || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Total Borrowed</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(summary?.totalBorrowed || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-success-500" />
                    <span className="text-sm text-gray-600">Total Paid</span>
                  </div>
                  <span className="font-semibold text-success-600">{formatCurrency(summary?.totalPaid || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-warning-500" />
                    <span className="text-sm text-gray-600">Outstanding</span>
                  </div>
                  <span className="font-semibold text-warning-600">{formatCurrency(summary?.totalOutstanding || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Status</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Status</label>
                  <span className={`badge ${customer.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Risk Level</label>
                  <span className={`badge ${
                    customer.riskLevel === 'Low' ? 'badge-success' :
                    customer.riskLevel === 'Medium' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {customer.riskLevel || 'Medium'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <div className="card-content">
              <div className="space-y-2">
                <Link
                  to={`/loans/new?customerId=${customer._id}`}
                  className="btn btn-primary btn-sm w-full"
                >
                  Create New Loan
                </Link>
                <button className="btn btn-secondary btn-sm w-full">
                  Record Payment
                </button>
                <button className="btn btn-secondary btn-sm w-full">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}