import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Layers, Eye, EyeOff, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    setSubmitting(true);
    setApiError(null);
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setApiError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-slate-950/50">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary-100 dark:bg-primary-950/50 rounded-2xl text-primary-600 dark:text-primary-400">
              <Layers className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your booking dashboard
          </p>
        </div>

        {apiError && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full pl-11 pr-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:bg-white dark:focus:bg-slate-800 transition-all ${
                    errors.email ? 'border-red-500 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                  placeholder="name@example.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`block w-full pl-11 pr-11 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:bg-white dark:focus:bg-slate-800 transition-all ${
                    errors.password ? 'border-red-500 ring-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-all shadow-md shadow-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
