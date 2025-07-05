import { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'primary' | 'success' | 'warning' | 'danger'
  trend?: string
  onClick?: () => void
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  onClick 
}: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  }

  return (
    <div 
      className={cn(
        "card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-medium"
      )}
      onClick={onClick}
    >
      <div className="card-content p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p className="text-xs text-gray-500 mt-1">{trend}</p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  )
}