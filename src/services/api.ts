import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (credentials: { userid: string; password: string }) =>
    api.post('/auth/login', credentials).then((res) => res.data),
  
  logout: () =>
    api.post('/auth/logout').then((res) => res.data),
  
  validateSession: () =>
    api.get('/auth/validate-session').then((res) => res.data),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data).then((res) => res.data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data).then((res) => res.data),
}

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    api.get('/dashboard/stats').then((res) => res.data),
  
  getOverview: () =>
    api.get('/dashboard/overview').then((res) => res.data),
  
  getFinancial: () =>
    api.get('/dashboard/financial').then((res) => res.data),
  
  getChartData: (type: string) =>
    api.get(`/dashboard/charts/${type}`).then((res) => res.data),
  
  getAlerts: () =>
    api.get('/dashboard/alerts').then((res) => res.data),
}

// Customers API
export const customersApi = {
  getAll: (params?: any) =>
    api.get('/customers', { params }).then((res) => res.data),
  
  getById: (id: string) =>
    api.get(`/customers/${id}`).then((res) => res.data),
  
  create: (data: any) =>
    api.post('/customers', data).then((res) => res.data),
  
  update: (id: string, data: any) =>
    api.put(`/customers/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/customers/${id}`).then((res) => res.data),
  
  getLoans: (id: string) =>
    api.get(`/customers/${id}/loans`).then((res) => res.data),
  
  getPayments: (id: string) =>
    api.get(`/customers/${id}/payments`).then((res) => res.data),
  
  getSummary: (id: string) =>
    api.get(`/customers/${id}/summary`).then((res) => res.data),
  
  search: (query: string) =>
    api.get(`/customers/search/${query}`).then((res) => res.data),
}

// Loans API
export const loansApi = {
  getAll: (params?: any) =>
    api.get('/loans', { params }).then((res) => res.data),
  
  getById: (id: string) =>
    api.get(`/loans/${id}`).then((res) => res.data),
  
  create: (data: any) =>
    api.post('/loans', data).then((res) => res.data),
  
  update: (id: string, data: any) =>
    api.put(`/loans/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/loans/${id}`).then((res) => res.data),
  
  getDetails: (id: string) =>
    api.get(`/loans/${id}/details`).then((res) => res.data),
  
  getPayments: (id: string) =>
    api.get(`/loans/${id}/payments`).then((res) => res.data),
  
  approve: (id: string) =>
    api.put(`/loans/${id}/approve`).then((res) => res.data),
  
  reject: (id: string, reason: string) =>
    api.put(`/loans/${id}/reject`, { rejectionReason: reason }).then((res) => res.data),
  
  createReloan: (id: string, data: any) =>
    api.post(`/loans/${id}/reloan`, data).then((res) => res.data),
  
  getOverdue: () =>
    api.get('/loans/filter/overdue').then((res) => res.data),
  
  getDueSoon: () =>
    api.get('/loans/filter/due-soon').then((res) => res.data),
  
  calculate: (data: any) =>
    api.post('/loans/calculate', data).then((res) => res.data),
}

// Payments API
export const paymentsApi = {
  getAll: (params?: any) =>
    api.get('/payments', { params }).then((res) => res.data),
  
  getById: (id: string) =>
    api.get(`/payments/${id}`).then((res) => res.data),
  
  create: (data: any) =>
    api.post('/payments', data).then((res) => res.data),
  
  update: (id: string, data: any) =>
    api.put(`/payments/${id}`, data).then((res) => res.data),
  
  reverse: (id: string, reason: string) =>
    api.put(`/payments/${id}/reverse`, { reversalReason: reason }).then((res) => res.data),
  
  confirm: (id: string) =>
    api.put(`/payments/${id}/confirm`).then((res) => res.data),
  
  generateReceipt: (id: string) =>
    api.get(`/payments/${id}/receipt`).then((res) => res.data),
  
  getStats: () =>
    api.get('/payments/stats/overview').then((res) => res.data),
}

// Reports API
export const reportsApi = {
  generate: (type: string, format: string, params?: any) =>
    api.get(`/reports/${type}/${format}`, { 
      params,
      responseType: 'blob'
    }).then((res) => res.data),
  
  getTemplates: () =>
    api.get('/reports/templates').then((res) => res.data),
}

// Users API (Admin only)
export const usersApi = {
  getAll: (params?: any) =>
    api.get('/admin/users', { params }).then((res) => res.data),
  
  getById: (id: string) =>
    api.get(`/admin/users/${id}`).then((res) => res.data),
  
  create: (data: any) =>
    api.post('/admin/users', data).then((res) => res.data),
  
  update: (id: string, data: any) =>
    api.put(`/admin/users/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/admin/users/${id}`).then((res) => res.data),
  
  activate: (id: string) =>
    api.put(`/admin/users/${id}/activate`).then((res) => res.data),
  
  deactivate: (id: string) =>
    api.put(`/admin/users/${id}/deactivate`).then((res) => res.data),
  
  getSubAdmins: () =>
    api.get('/admin/subadmins').then((res) => res.data),
  
  createSubAdmin: (data: any) =>
    api.post('/admin/subadmins', data).then((res) => res.data),
  
  getSystemStats: () =>
    api.get('/admin/system-stats').then((res) => res.data),
}

// Messages API
export const messagesApi = {
  getAll: (params?: any) =>
    api.get('/messages', { params }).then((res) => res.data),
  
  markAsRead: (id: string) =>
    api.put(`/messages/${id}/read`).then((res) => res.data),
  
  getUnread: () =>
    api.get('/messages/filter/unread').then((res) => res.data),
  
  getStats: () =>
    api.get('/messages/stats/overview').then((res) => res.data),
}

export default api