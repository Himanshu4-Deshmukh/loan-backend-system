import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface LoginForm {
  userid: string
  password: string
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    await login(data.userid, data.password)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Loan Management System
          </h1>
          <p className="text-gray-600">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login form */}
        <div className="card">
          <div className="card-content p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User ID */}
              <div className="form-group">
                <label htmlFor="userid" className="form-label">
                  User ID
                </label>
                <input
                  {...register('userid', { 
                    required: 'User ID is required',
                    minLength: {
                      value: 3,
                      message: 'User ID must be at least 3 characters'
                    }
                  })}
                  type="text"
                  id="userid"
                  className="input"
                  placeholder="Enter your user ID"
                  autoComplete="username"
                />
                {errors.userid && (
                  <p className="form-error">{errors.userid.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="input pr-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-lg w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 Loan Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}