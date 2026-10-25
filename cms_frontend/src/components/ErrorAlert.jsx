import React from 'react';
import { AlertTriangle, X, RefreshCw, Info, CheckCircle } from 'lucide-react';

const ErrorAlert = ({ 
  type = 'error', 
  title, 
  message, 
  onClose, 
  onRetry, 
  className = '',
  showIcon = true 
}) => {
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: 'text-green-400',
          button: 'text-green-600 hover:text-green-800'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-400',
          button: 'text-yellow-600 hover:text-yellow-800'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-400',
          button: 'text-blue-600 hover:text-blue-800'
        };
      case 'error':
      default:
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: 'text-red-400',
          button: 'text-red-600 hover:text-red-800'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'error':
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`border rounded-md p-4 ${styles.container} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <div className={styles.icon}>
              {getIcon()}
            </div>
          </div>
        )}
        <div className={`${showIcon ? 'ml-3' : ''} flex-1`}>
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          {message && (
            <div className={`text-sm ${title ? 'mt-2' : ''}`}>
              {typeof message === 'string' ? (
                <p>{message}</p>
              ) : (
                message
              )}
            </div>
          )}
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className={`inline-flex items-center text-sm font-medium ${styles.button} hover:underline`}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 ${styles.button} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;