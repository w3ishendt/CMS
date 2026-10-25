/**
 * Centralized error handling utility for RBAC system
 * Handles 403 Forbidden responses and role combination validation
 */

/**
 * Parse and format API error responses
 * @param {Error} error - The error object from API call
 * @returns {Object} Formatted error object with type, title, and message
 */
export const parseApiError = (error) => {
  const status = error.response?.status;
  const errorData = error.response?.data;
  const errorMessage = errorData?.message || error.message;

  // Handle 403 Forbidden responses
  if (status === 403) {
    return {
      type: 'error',
      title: 'Access Denied',
      message: getPermissionErrorMessage(errorMessage),
      isPermissionError: true
    };
  }

  // Handle 401 Unauthorized responses
  if (status === 401) {
    return {
      type: 'error',
      title: 'Authentication Required',
      message: 'Your session has expired. Please log in again.',
      requiresLogin: true
    };
  }

  // Handle 400 Bad Request (validation errors)
  if (status === 400) {
    return {
      type: 'error',
      title: 'Validation Error',
      message: getValidationErrorMessage(errorMessage),
      isValidationError: true
    };
  }

  // Handle 409 Conflict (duplicate resources)
  if (status === 409) {
    return {
      type: 'error',
      title: 'Conflict',
      message: getConflictErrorMessage(errorMessage),
      isConflictError: true
    };
  }

  // Handle 500 Internal Server Error
  if (status === 500) {
    return {
      type: 'error',
      title: 'Server Error',
      message: 'An internal server error occurred. Please try again later.',
      isServerError: true
    };
  }

  // Handle network errors
  if (!error.response) {
    return {
      type: 'error',
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      isNetworkError: true
    };
  }

  // Default error handling
  return {
    type: 'error',
    title: 'Error',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    isGenericError: true
  };
};

/**
 * Get specific permission error messages based on the error content
 * @param {string} errorMessage - The original error message
 * @returns {string} User-friendly permission error message
 */
const getPermissionErrorMessage = (errorMessage) => {
  const message = errorMessage?.toLowerCase() || '';

  if (message.includes('create user') || message.includes('user creation')) {
    return 'You do not have permission to create users with this role.';
  }

  if (message.includes('delete user') || message.includes('user deletion')) {
    return 'You do not have permission to delete this user.';
  }

  if (message.includes('edit user') || message.includes('update user')) {
    return 'You do not have permission to edit this user.';
  }

  if (message.includes('site access') || message.includes('site assignment')) {
    return 'You do not have permission to assign users to these sites.';
  }

  if (message.includes('role hierarchy') || message.includes('role assignment')) {
    return 'You cannot assign this role due to hierarchy restrictions.';
  }

  if (message.includes('parent distributor') || message.includes('parent assignment')) {
    return 'You do not have permission to assign this parent distributor.';
  }

  return 'You do not have sufficient permissions to perform this action.';
};

/**
 * Get specific validation error messages
 * @param {string} errorMessage - The original error message
 * @returns {string} User-friendly validation error message
 */
const getValidationErrorMessage = (errorMessage) => {
  const message = errorMessage?.toLowerCase() || '';

  if (message.includes('username') && message.includes('exists')) {
    return 'This username is already taken. Please choose a different username.';
  }

  if (message.includes('email') && message.includes('exists')) {
    return 'This email address is already registered. Please use a different email.';
  }

  if (message.includes('invalid role combination')) {
    return 'The selected role combination is not valid for your permission level.';
  }

  if (message.includes('site assignment') && message.includes('invalid')) {
    return 'The selected site assignments are not valid for this role.';
  }

  if (message.includes('parent required')) {
    return 'This role requires a parent distributor to be selected.';
  }

  if (message.includes('password')) {
    return 'Password does not meet the required security criteria.';
  }

  return errorMessage || 'Please check your input and try again.';
};

/**
 * Get specific conflict error messages
 * @param {string} errorMessage - The original error message
 * @returns {string} User-friendly conflict error message
 */
const getConflictErrorMessage = (errorMessage) => {
  const message = errorMessage?.toLowerCase() || '';

  if (message.includes('username')) {
    return 'This username is already in use. Please choose a different username.';
  }

  if (message.includes('email')) {
    return 'This email address is already registered. Please use a different email.';
  }

  return errorMessage || 'This resource already exists. Please check your input.';
};

/**
 * Validate role hierarchy and combinations
 * @param {string} currentUserRole - The current user's role
 * @param {string} targetRole - The role being assigned
 * @param {string} parentUserId - The parent user ID (if applicable)
 * @returns {Object|null} Error object if validation fails, null if valid
 */
export const validateRoleHierarchy = (currentUserRole, targetRole, parentUserId = null) => {
  const roleHierarchy = {
    'SUPER_ADMIN': ['ADMINISTRATOR', 'DISTRIBUTOR', 'MULTI_SITE_OPERATOR', 'OPERATOR'],
    'ADMINISTRATOR': ['DISTRIBUTOR', 'MULTI_SITE_OPERATOR', 'OPERATOR'],
    'DISTRIBUTOR': ['MULTI_SITE_OPERATOR', 'OPERATOR'],
    'MULTI_SITE_OPERATOR': [],
    'OPERATOR': []
  };

  const allowedRoles = roleHierarchy[currentUserRole] || [];

  if (!allowedRoles.includes(targetRole)) {
    return {
      type: 'error',
      title: 'Invalid Role Assignment',
      message: `You cannot assign the ${targetRole.replace('_', ' ')} role. Your permission level only allows: ${allowedRoles.join(', ').replace(/_/g, ' ')}.`,
      isRoleHierarchyError: true
    };
  }

  // Parent distributor is now optional for operator roles
  // Operators can be created without a parent distributor (parentUserId can be null)
  // This allows super admins to remove operators from distributors or create independent operators

  return null;
};

/**
 * Validate site assignments based on role and permissions
 * @param {string} role - The user role
 * @param {Array} siteIds - Array of site IDs being assigned
 * @param {Array} availableSites - Array of sites available to the current user
 * @returns {Object|null} Error object if validation fails, null if valid
 */
export const validateSiteAssignments = (role, siteIds, availableSites) => {
  if (!siteIds || siteIds.length === 0) {
    return {
      type: 'error',
      title: 'Site Assignment Required',
      message: 'At least one site must be assigned to this user.',
      isSiteValidationError: true
    };
  }

  // Role-specific site validation
  if (role === 'OPERATOR' && siteIds.length !== 1) {
    return {
      type: 'error',
      title: 'Invalid Site Assignment',
      message: 'Operators must be assigned to exactly one site.',
      isSiteValidationError: true
    };
  }

  if (role === 'MULTI_SITE_OPERATOR' && siteIds.length < 2) {
    return {
      type: 'error',
      title: 'Invalid Site Assignment',
      message: 'Multi-site operators must be assigned to at least 2 sites.',
      isSiteValidationError: true
    };
  }

  // Check if all assigned sites are available
  const availableSiteIds = availableSites.map(site => site.id || site.name);
  const invalidSites = siteIds.filter(siteId => !availableSiteIds.includes(siteId));

  if (invalidSites.length > 0) {
    return {
      type: 'error',
      title: 'Unauthorized Site Assignment',
      message: 'Some selected sites are not available for assignment.',
      isSiteValidationError: true
    };
  }

  return null;
};

/**
 * Handle API errors with automatic retry logic
 * @param {Function} apiCall - The API function to call
 * @param {Object} options - Options for retry logic
 * @returns {Promise} Promise that resolves with API result or rejects with formatted error
 */
export const handleApiCall = async (apiCall, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      const parsedError = parseApiError(error);

      // Don't retry on permission errors or validation errors
      if (parsedError.isPermissionError || parsedError.isValidationError || parsedError.isConflictError) {
        if (onError) onError(parsedError);
        throw parsedError;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        if (onError) onError(parsedError);
        throw parsedError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  // This should never be reached, but just in case
  const parsedError = parseApiError(lastError);
  if (onError) onError(parsedError);
  throw parsedError;
};

/**
 * Create a standardized error response for UI components
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {string} type - Error type (error, warning, info)
 * @returns {Object} Standardized error object
 */
export const createErrorResponse = (title, message, type = 'error') => {
  return {
    type,
    title,
    message,
    timestamp: new Date().toISOString()
  };
};