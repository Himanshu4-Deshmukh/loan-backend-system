import { format, formatDistanceToNow, isValid } from 'date-fns'

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-ZM').format(num)
}

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!isValid(dateObj)) return 'Invalid date'
  return format(dateObj, 'MMM dd, yyyy')
}

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!isValid(dateObj)) return 'Invalid date'
  return format(dateObj, 'MMM dd, yyyy HH:mm')
}

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (!isValid(dateObj)) return 'Invalid date'
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'Active': 'badge-success',
    'Completed': 'badge-primary',
    'Overdue': 'badge-danger',
    'Not Paid': 'badge-warning',
    'Cancelled': 'badge-secondary',
    'Pending': 'badge-warning',
    'Approved': 'badge-success',
    'Rejected': 'badge-danger',
    'Reversed': 'badge-secondary',
    'Failed': 'badge-danger',
  }
  return statusColors[status] || 'badge-secondary'
}

export const getPriorityColor = (priority: string): string => {
  const priorityColors: Record<string, string> = {
    'low': 'badge-secondary',
    'medium': 'badge-warning',
    'high': 'badge-danger',
    'urgent': 'badge-danger',
  }
  return priorityColors[priority] || 'badge-secondary'
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format as +260 XX XXX XXXX for Zambian numbers
  if (cleaned.length === 12 && cleaned.startsWith('260')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  
  // Format as 0XX XXX XXXX for local numbers
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  
  return phone
}

export const validateNRC = (nrc: string): boolean => {
  // Zambian NRC format: XXXXXX/XX/X
  const nrcRegex = /^\d{6}\/\d{2}\/\d$/
  return nrcRegex.test(nrc)
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  // Zambian phone number validation
  const phoneRegex = /^(\+260|0)[7-9]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}