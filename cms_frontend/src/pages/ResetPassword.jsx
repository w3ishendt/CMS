// Reset Password page with token validation and password form
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useNotificationStore } from '../stores/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import apiService from '../services/apiService';

const ResetPassword = () => {
  const { token: pathToken } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotificationStore();
  
  // Extract token from either path parameter or query parameter
  const getToken = () => {
    // First try path parameter
    if (pathToken) {
      return pathToken;
    }
    // Then try query parameter
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('token');
  };
  
  const token = getToken();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordPolicy, setPasswordPolicy] = useState(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(true);
  const [tokenValid, setTokenValid] = useState(true);
  
  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecialChar: false,
    score: 0
  });
  
  // Load password policy on component mount
  useEffect(() => {
    const loadPasswordPolicy = async () => {
      try {
        const policy = await apiService.getPasswordPolicy();
        setPasswordPolicy(policy);
      } catch (error) {
        console.error('Failed to load password policy:', error);
        showError('Failed to load password requirements. Please try again.');
      } finally {
        setIsLoadingPolicy(false);
      }
    };
    
    loadPasswordPolicy();
  }, [showError]);
  
  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      showError('Invalid reset link. Please request a new password reset.');
    }
  }, [token, showError]);
  
  // Validate password strength in real-time
  useEffect(() => {
    if (!passwordPolicy || !formData.newPassword) {
      setPasswordStrength({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasDigit: false,
        hasSpecialChar: false,
        score: 0
      });
      return;
    }
    
    const password = formData.newPassword;
    const strength = {
      minLength: password.length >= passwordPolicy.minLength,
      hasUppercase: passwordPolicy.requireUppercase ? /[A-Z]/.test(password) : true,
      hasLowercase: passwordPolicy.requireLowercase ? /[a-z]/.test(password) : true,
      hasDigit: passwordPolicy.requireDigit ? /\d/.test(password) : true,
      hasSpecialChar: passwordPolicy.requireSpecialChar ? 
        new RegExp(`[${passwordPolicy.allowedSpecialChars.replace(/[\[\]\\]/g, '\\$&')}]`).test(password) : true
    };
    
    const score = Object.values(strength).filter(Boolean).length;
    strength.score = score;
    
    setPasswordStrength(strength);
  }, [formData.newPassword, passwordPolicy]);
  
  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordPolicy) {
      // Check against password policy
      if (formData.newPassword.length < passwordPolicy.minLength) {
        errors.newPassword = `Password must be at least ${passwordPolicy.minLength} characters long`;
      } else if (passwordPolicy.requireUppercase && !/[A-Z]/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain at least one uppercase letter';
      } else if (passwordPolicy.requireLowercase && !/[a-z]/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain at least one lowercase letter';
      } else if (passwordPolicy.requireDigit && !/\d/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain at least one digit';
      } else if (passwordPolicy.requireSpecialChar && 
                 !new RegExp(`[${passwordPolicy.allowedSpecialChars.replace(/[\[\]\\]/g, '\\$&')}]`).test(formData.newPassword)) {
        errors.newPassword = 'Password must contain at least one special character';
      }
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await apiService.confirmPasswordReset(
        token,
        formData.newPassword,
        formData.confirmPassword
      );
      
      if (result.success) {
        showSuccess(result.message);
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showError('Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        
        switch (errorData.code) {
          case 'INVALID_TOKEN':
          case 'TOKEN_EXPIRED':
            setTokenValid(false);
            showError('This reset link has expired or is invalid. Please request a new password reset.');
            break;
          case 'PASSWORD_POLICY_VIOLATION':
            setFormErrors({ newPassword: errorData.message });
            break;
          case 'PASSWORD_MISMATCH':
            setFormErrors({ confirmPassword: 'Passwords do not match' });
            break;
          default:
            showError(errorData.message || 'An error occurred. Please try again.');
        }
      } else {
        showError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Password strength indicator component
  const PasswordStrengthIndicator = () => {
    if (!passwordPolicy || !formData.newPassword) return null;
    
    const requirements = [
      { key: 'minLength', label: `At least ${passwordPolicy.minLength} characters`, met: passwordStrength.minLength },
      { key: 'hasUppercase', label: 'One uppercase letter', met: passwordStrength.hasUppercase, required: passwordPolicy.requireUppercase },
      { key: 'hasLowercase', label: 'One lowercase letter', met: passwordStrength.hasLowercase, required: passwordPolicy.requireLowercase },
      { key: 'hasDigit', label: 'One number', met: passwordStrength.hasDigit, required: passwordPolicy.requireDigit },
      { key: 'hasSpecialChar', label: 'One special character', met: passwordStrength.hasSpecialChar, required: passwordPolicy.requireSpecialChar }
    ].filter(req => req.required !== false);
    
    const strengthColors = {
      0: 'bg-red-500',
      1: 'bg-red-400',
      2: 'bg-yellow-500',
      3: 'bg-yellow-400',
      4: 'bg-green-400',
      5: 'bg-green-500'
    };
    
    const strengthLabels = {
      0: 'Very Weak',
      1: 'Weak',
      2: 'Fair',
      3: 'Good',
      4: 'Strong',
      5: 'Very Strong'
    };
    
    return (
      <div className="mt-2 space-y-2">
        {/* Strength Bar */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${strengthColors[passwordStrength.score]}`}
              style={{ width: `${(passwordStrength.score / requirements.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {strengthLabels[passwordStrength.score]}
          </span>
        </div>
        
        {/* Requirements List */}
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.key} className="flex items-center space-x-2">
              {req.met ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-xs ${req.met ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Loading state
  if (isLoadingPolicy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading password requirements...</p>
        </div>
      </div>
    );
  }
  
  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This password reset link is invalid or has expired.
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-400">
              Reset links expire after 15 minutes for security reasons.
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <Link
              to="/forgot-password"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request New Reset Link
            </Link>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below.
          </p>
        </div>
        
        {/* Reset Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                    formErrors.newPassword 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {formErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.newPassword}
                </p>
              )}
              <PasswordStrengthIndicator />
            </div>
            
            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                    formErrors.confirmPassword 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || passwordStrength.score < Object.values(passwordStrength).filter((_, i) => i < 5).length}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
          
          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;