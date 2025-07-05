import { useState } from 'react'
import { useQuery } from 'react-query'
import { Plus, Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react'
import { customersApi } from '../../services/api'
import { formatDate, formatPhoneNumber } from '../../utils/formatters'
import { Link } from 'react-router-dom'
import CustomerModal from '../../components/customers/CustomerModal'
import Pagination from '../../components/common/Pagination'

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  const { data, isLoading, refetch } = useQuery(
    ['customers', page, search, status],
    () => customersApi.getAll({ page, limit: 10, search, status }),
    {
      keepPreviousData: true,
    }
  )

  const customers = data?.customers || []
  const pagination = data?.pagination || {}

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer)
    setShowModal(true)
  }

  const handleAdd = () => {
    setSelectedCustomer(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedCustomer(null)
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary btn-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Export button */}
            <button className="btn btn-secondary btn-md">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Customers table */}
      <div className="card">
        <div className="card-content p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>NRC Number</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Employment</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer: any) => (
                    <tr key={customer._id}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900">{customer.fullName}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{customer.nrcNumber}</td>
                      <td>{formatPhoneNumber(customer.phoneNumber)}</td>
                      <td>{customer.city}</td>
                      <td>
                        <span className="badge badge-secondary">
                          {customer.employmentStatus}
                        </span>
                      </td>
                      <td>{formatDate(customer.createdAt)}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/customers/${customer._id}`}
                            className="p-1 text-gray-400 hover:text-primary-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1 text-gray-400 hover:text-warning-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-danger-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* Customer modal */}
      {showModal && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}