import { useQuery } from 'react-query'
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { dashboardApi } from '../services/api'
import { formatCurrency, formatNumber, getStatusColor } from '../utils/formatters'
import StatsCard from '../components/dashboard/StatsCard'
import ChartCard from '../components/dashboard/ChartCard'
import RecentActivity from '../components/dashboard/RecentActivity'
import AlertsPanel from '../components/dashboard/AlertsPanel'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    dashboardApi.getStats
  )

  const { data: overview, isLoading: overviewLoading } = useQuery(
    'dashboard-overview',
    dashboardApi.getOverview
  )

  const { data: financial, isLoading: financialLoading } = useQuery(
    'dashboard-financial',
    dashboardApi.getFinancial
  )

  const { data: alerts } = useQuery(
    'dashboard-alerts',
    dashboardApi.getAlerts,
    {
      refetchInterval: 60000, // Refetch every minute
    }
  )

  if (statsLoading || overviewLoading || financialLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-content p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statsData = stats?.stats || {}
  const overviewData = overview?.overview || {}
  const financialData = financial?.financial || {}

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your loans.</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts?.alerts && alerts.alerts.length > 0 && (
        <AlertsPanel alerts={alerts.alerts} />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Customers"
          value={formatNumber(statsData.totalCustomers || 0)}
          icon={Users}
          color="primary"
          trend={`+${statsData.newCustomersThisMonth || 0} this month`}
        />
        <StatsCard
          title="Active Loans"
          value={formatNumber(statsData.activeLoans || 0)}
          icon={CreditCard}
          color="success"
          trend={`${statsData.totalLoans || 0} total loans`}
        />
        <StatsCard
          title="Total Outstanding"
          value={formatCurrency(statsData.totalOutstanding || 0)}
          icon={DollarSign}
          color="warning"
          trend={`${statsData.overdueLoans || 0} overdue`}
        />
        <StatsCard
          title="Collections"
          value={formatCurrency(statsData.totalPayments || 0)}
          icon={TrendingUp}
          color="primary"
          trend="Total collected"
        />
      </div>

      {/* Charts and overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan status chart */}
        <ChartCard
          title="Loan Portfolio"
          type="pie"
          data={[
            { name: 'Active', value: statsData.activeLoans || 0, color: '#22c55e' },
            { name: 'Completed', value: statsData.completedLoans || 0, color: '#3b82f6' },
            { name: 'Overdue', value: statsData.overdueLoans || 0, color: '#ef4444' },
            { name: 'Not Paid', value: statsData.notPaidLoans || 0, color: '#f59e0b' },
          ]}
        />

        {/* Monthly collections */}
        <ChartCard
          title="Monthly Collections"
          type="bar"
          data={financialData.monthlyCollections || []}
        />
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent customers */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Recent Customers</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {overviewData.recentCustomers?.slice(0, 5).map((customer: any) => (
                <div key={customer._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{customer.fullName}</p>
                    <p className="text-sm text-gray-500">{customer.nrcNumber}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent loans */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Recent Loans</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {overviewData.recentLoans?.slice(0, 5).map((loan: any) => (
                <div key={loan._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{loan.customerName}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(loan.loanAmount)}</p>
                  </div>
                  <span className={`badge ${getStatusColor(loan.status)}`}>
                    {loan.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Recent Payments</h3>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              {overviewData.recentPayments?.slice(0, 5).map((payment: any) => (
                <div key={payment._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{payment.customerName}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(payment.paymentAmount)}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content p-4 text-center">
            <CheckCircle className="w-8 h-8 text-success-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{statsData.completedLoans || 0}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
        <div className="card">
          <div className="card-content p-4 text-center">
            <Clock className="w-8 h-8 text-warning-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{statsData.notPaidLoans || 0}</p>
            <p className="text-sm text-gray-500">Not Paid</p>
          </div>
        </div>
        <div className="card">
          <div className="card-content p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{statsData.overdueLoans || 0}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
        </div>
        <div className="card">
          <div className="card-content p-4 text-center">
            <XCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{statsData.unreadMessages || 0}</p>
            <p className="text-sm text-gray-500">Messages</p>
          </div>
        </div>
      </div>
    </div>
  )
}