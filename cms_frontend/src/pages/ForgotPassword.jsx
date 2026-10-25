// Forgot Password page with email input and captcha
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/useAppStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Mail, ArrowLeft, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import apiService from '../services/apiService';

const ForgotPassword = () => {
  const { showError, showSuccess } = useNotificationStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    captcha: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(null);
  
  // CAPTCHA state
  const [captchaData, setCaptchaData] = useState({
    token: '',
    imageBase64: ''
  });
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  
  // Generate new CAPTCHA
  const generateNewCaptcha = async () => {
    setIsLoadingCaptcha(true);
    try {
      const result = await apiService.generateCaptcha();
      setCaptchaData({
        token: result.token,
        imageBase64: result.imageBase64
      });
      // Clear captcha input when new captcha is generated
      setFormData(prev => ({ ...prev, captcha: '' }));
      // Clear captcha error
      if (formErrors.captcha) {
        setFormErrors(prev => ({ ...prev, captcha: '' }));
      }
    } catch (error) {
      console.error('Failed to generate CAPTCHA:', error);
      showError('Failed to load security verification. Please refresh the page.');
    } finally {
      setIsLoadingCaptcha(false);
    }
  };
  
  // Load CAPTCHA on component mount
  useEffect(() => {
    generateNewCaptcha();
  }, []);
  
  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.captcha.trim()) {
      errors.captcha = 'Captcha is required';
    } else if (formData.captcha.length < 3) {
      errors.captcha = 'Please enter a valid captcha';
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
      const result = await apiService.requestPasswordReset(
        formData.email.trim(),
        captchaData.token,
        formData.captcha.trim()
      );
      
      if (result.success) {
        setIsSubmitted(true);
        setRateLimitRemaining(result.rateLimitRemaining);
        showSuccess(result.message);
      } else {
        showError('Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
      
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        
        switch (errorData.code) {
          case 'RATE_LIMIT_EXCEEDED':
            showError('Too many reset requests. Please wait before trying again.');
            break;
          case 'INVALID_CAPTCHA':
            setFormErrors({ captcha: 'Invalid captcha. Please try again.' });
            // Generate new CAPTCHA on invalid captcha
            generateNewCaptcha();
            break;
          case 'INVALID_EMAIL':
            setFormErrors({ email: 'Please enter a valid email address.' });
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
  
  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              If an account with this email exists, you will receive a password reset link.
            </p>
          </div>
          
          {/* Success Message */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="text-center">
              <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                Password reset instructions have been sent to:
              </p>
              <p className="font-medium text-green-900 dark:text-green-300">
                {formData.email}
              </p>
              {rateLimitRemaining !== null && (
                <p className="text-xs text-green-700 dark:text-green-500 mt-2">
                  Remaining requests: {rateLimitRemaining}
                </p>
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
              What's next?
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-500 space-y-1">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the reset link within 15 minutes</li>
              <li>• Create a new secure password</li>
            </ul>
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
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        

        
        {/* Reset Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                    formErrors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.email}
                </p>
              )}
            </div>
            
            {/* Captcha Field */}
            <div>
              <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Security Verification
              </label>
              
              {/* CAPTCHA Image */}
              <div className="mt-2 flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {isLoadingCaptcha ? (
                    <div className="w-32 h-12 bg-gray-200 dark:bg-gray-700 rounded border flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : captchaData.imageBase64 ? (
                    <img
                      src={captchaData.imageBase64}
                      alt="CAPTCHA"
                      className="w-32 h-12 border rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={generateNewCaptcha}
                      title="Click to refresh CAPTCHA"
                    />
                  ) : (
                    <div className="w-32 h-12 bg-gray-200 dark:bg-gray-700 rounded border flex items-center justify-center">
                      <span className="text-xs text-gray-500">No CAPTCHA</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={generateNewCaptcha}
                  disabled={isLoadingCaptcha}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh CAPTCHA"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingCaptcha ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {/* CAPTCHA Input */}
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="captcha"
                  name="captcha"
                  type="text"
                  required
                  value={formData.captcha}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                    formErrors.captcha 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter the code shown above"
                  autoComplete="off"
                />
              </div>
              {formErrors.captcha && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.captcha}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Click the image or refresh button to get a new code
              </p>
            </div>
          </div>
          
          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                'Send Reset Link'
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

export default ForgotPassword;