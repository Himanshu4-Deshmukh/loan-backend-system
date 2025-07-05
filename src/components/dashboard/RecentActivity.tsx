import { formatRelativeTime } from '../../utils/formatters'

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
  user?: {
    name: string
  }
}

interface RecentActivityProps {
  activities: Activity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer_created':
        return '👤'
      case 'loan_created':
        return '💳'
      case 'payment_recorded':
        return '💰'
      default:
        return '📝'
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
      </div>
      <div className="card-content">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {activity.user && (
                    <span className="text-xs text-gray-500">by {activity.user.name}</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}