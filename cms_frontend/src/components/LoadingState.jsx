import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = ({ 
  message = 'Loading...', 
  size = 'medium', 
  className = '',
  showSpinner = true,
  fullScreen = false 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          spinner: 'w-4 h-4',
          text: 'text-sm',
          container: 'py-4'
        };
      case 'large':
        return {
          spinner: 'w-8 h-8',
          text: 'text-lg',
          container: 'py-12'
        };
      case 'medium':
      default:
        return {
          spinner: 'w-6 h-6',
          text: 'text-base',
          container: 'py-8'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const content = (
    <div className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}>
      {showSpinner && (
        <Loader2 className={`${sizeClasses.spinner} text-blue-600 animate-spin mb-3`} />
      )}
      <p className={`${sizeClasses.text} text-gray-600 font-medium`}>
        {message}
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingState;