import { AlertTriangle, Clock, MessageSquare, X } from 'lucide-react'
import { useState } from 'react'

interface Alert {
  type: string
  message: string
  severity: 'high' | 'medium' | 'low'
  count: number
}

interface AlertsPanelProps {
  alerts: Alert[]
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [dismissed, setDismissed] = useState<string[]>([])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return AlertTriangle
      case 'due_soon':
        return Clock
      case 'messages':
        return MessageSquare
      default:
        return AlertTriangle
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-50 border-danger-200 text-danger-800'
      case 'medium':
        return 'bg-warning-50 border-warning-200 text-warning-800'
      case 'low':
        return 'bg-primary-50 border-primary-200 text-primary-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const visibleAlerts = alerts.filter(alert => !dismissed.includes(alert.type))

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-3">
      {visibleAlerts.map((alert) => {
        const Icon = getAlertIcon(alert.type)
        return (
          <div
            key={alert.type}
            className={`rounded-lg border p-4 ${getAlertColor(alert.severity)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{alert.message}</span>
              </div>
              <button
                onClick={() => setDismissed([...dismissed, alert.type])}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}