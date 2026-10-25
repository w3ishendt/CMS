import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, User, Mail, Lock, Users, MapPin } from 'lucide-react';
import { useUser } from '../contexts/UserContext.tsx';
import { parseApiError, validateRoleHierarchy, validateSiteAssignments, handleApiCall } from '../utils/errorHandler';
import { apiService } from '../services/apiService';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ErrorAlert';



const UserCreationForm = ({ isOpen, onClose, onUserCreated }) => {
  const { currentUser, getAvailableRoles, hasPermission, hasAnyRole } = useUser();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    active: true,
    roles: [],
    parentUserId: null,
    siteIds: []
  });

  const [selectedRole, setSelectedRole] = useState('');
  const [distributors, setDistributors] = useState([]);
  const [availableSites, setAvailableSites] = useState([]);
  const [assignableSites, setAssignableSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [generalError, setGeneralError] = useState(null);



  // Get available roles based on current user's permissions
  const getAvailableRoleOptions = () => {
    if (!currentUser) return [];
    
    const availableRoles = getAvailableRoles();
    const roleOptions = [
      { value: 'SUPER_ADMIN', label: 'Super Administrator' },
      { value: 'ADMINISTRATOR', label: 'Administrator' },
      { value: 'DISTRIBUTOR', label: 'Distributor' },
      { value: 'MULTI_SITE_OPERATOR', label: 'Multi-Site Operator' },
      { value: 'OPERATOR', label: 'Operator' }
    ];
    
    return roleOptions.filter(role => availableRoles.includes(role.value));
  };

  // Load initial data when form opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Load distributors and sites when role changes
  useEffect(() => {
    if (selectedRole === 'OPERATOR') {
      loadDistributors();
      loadSitesForOperator();
    } else if (selectedRole === 'MULTI_SITE_OPERATOR') {
      loadDistributors();
      loadSitesForMultiSiteOperator();
    } else if (selectedRole === 'DISTRIBUTOR') {
      loadAllSites();
    }
  }, [selectedRole]);

  // Load assignable sites when parent distributor changes
  useEffect(() => {
    if (formData.parentUserId && (selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR')) {
      loadAssignableSites(formData.parentUserId);
    }
  }, [formData.parentUserId, selectedRole]);

  const loadInitialData = async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      // Reset form when opening
      resetForm();
      
      // Load sites for admin users immediately
      if (hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR'])) {
        await loadAllSites();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setGeneralError({
        title: 'Initialization Failed',
        message: 'Failed to initialize the form. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDistributors = async () => {
    try {
      const response = await apiService.getDistributors();
      setDistributors(response);
      setGeneralError(null);
    } catch (error) {
      console.error('Error loading distributors:', error);
      setGeneralError({
        title: 'Failed to Load Distributors',
        message: error.response?.data?.message || 'Unable to load distributor list. Please try again.',
        type: 'warning'
      });
    }
  };

  const loadAllSites = async () => {
    try {
      // Check if user has SUPER_ADMIN or ADMINISTRATOR role
      if (!hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR'])) {
        setErrors(prev => ({ ...prev, sites: 'Only Super Admin and Administrator users can view all sites' }));
        setAvailableSites([]);
        return;
      }

      // Use the new device status sites endpoint for SUPER_ADMIN and ADMINISTRATOR
      const response = await apiService.getDeviceStatusSites();
      
      // Handle the response - API now returns array directly, not wrapped in sites property
      let sitesData = response || [];
      
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        // Check if sites are strings or objects
        if (typeof sitesData[0] === 'string') {
          // Convert string array to object array for rendering
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
        }
      }
      
      setAvailableSites(sitesData);
      // Clear any previous errors
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('Error loading sites:', error);
      if (error.response?.status === 403) {
        setErrors(prev => ({ ...prev, sites: 'You do not have permission to view sites' }));
      } else {
        setErrors(prev => ({ ...prev, sites: `Failed to load sites: ${error.response?.data?.message || error.message}` }));
      }
      setAvailableSites([]);
    }
  };

  const loadAssignableSites = async (distributorId) => {
    try {
      const response = await apiService.getDistributorAssignableSites(distributorId);
      
      // Handle the response - ensure consistent data structure
      let sitesData = response.sites || response;
      
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        // Check if sites are strings or objects
        if (typeof sitesData[0] === 'string') {
          // Convert string array to object array for rendering
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAssignableSites(sitesData || []);
      // Clear selected sites when parent changes
      setFormData(prev => ({ ...prev, siteIds: [] }));
      // Clear any previous errors
      setErrors(prev => ({ ...prev, assignableSites: '' }));
    } catch (error) {
      // Enhanced error logging for debugging
      console.error('❌ Error loading assignable sites:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error response headers:', error.response?.headers);
      
      if (error.response?.status === 403) {
        setErrors(prev => ({ ...prev, assignableSites: 'You do not have permission to access these sites' }));
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
        setErrors(prev => ({ ...prev, assignableSites: `Failed to load assignable sites: ${errorMessage}` }));
      }
      setAssignableSites([]);
    }
  };

  const loadSitesForMultiSiteOperator = async () => {
    try {
            
      const response = await apiService.getDeviceStatusSites();
            
      // Handle the response - API returns array directly
      let sitesData = response || [];
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        // Check if sites are strings or objects
        if (typeof sitesData[0] === 'string') {
          // Convert string array to object array for rendering
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAvailableSites(sitesData);
      // Clear any previous errors
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('❌ Error loading sites for multi-site operator:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        setErrors(prev => ({ ...prev, sites: 'You do not have permission to view sites' }));
      } else {
        setErrors(prev => ({ ...prev, sites: `Failed to load sites: ${error.response?.data?.message || error.message}` }));
      }
      setAvailableSites([]);
    }
  };

  const loadSitesForOperator = async () => {
    try {
            
      const response = await apiService.getDeviceStatusSites();
            
      // Handle the response - API returns array directly
      let sitesData = response || [];
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        // Check if sites are strings or objects
        if (typeof sitesData[0] === 'string') {
          // Convert string array to object array for rendering
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAvailableSites(sitesData);
      // Clear any previous errors
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('❌ Error loading sites for operator:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        setErrors(prev => ({ ...prev, sites: 'You do not have permission to view sites' }));
      } else {
        setErrors(prev => ({ ...prev, sites: `Failed to load sites: ${error.response?.data?.message || error.message}` }));
      }
      setAvailableSites([]);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      active: true,
      roles: [],
      parentUserId: null,
      siteIds: []
    });
    setSelectedRole('');
    setDistributors([]);
    setAvailableSites([]);
    setAssignableSites([]);
    setErrors({});
    setGeneralError(null);
  };

  const validateRoleHierarchyLocal = (role, parentUserId) => {
    // Prevent invalid role combinations
    if (role === 'DISTRIBUTOR' && parentUserId) {
      return 'Distributors cannot have a parent user';
    }
    // Note: OPERATOR and MULTI_SITE_OPERATOR no longer require parent distributor
    // as they get sites directly from device status API
    return null;
  };

  const handleRoleChange = (role) => {
    // Validate if user can create this role
    const availableRoles = getAvailableRoles();
    if (!availableRoles.includes(role)) {
      setErrors(prev => ({ 
        ...prev, 
        role: 'You do not have permission to create users with this role' 
      }));
      return;
    }
    
    setSelectedRole(role);
    setFormData(prev => ({
      ...prev,
      roles: [role],
      parentUserId: role === 'DISTRIBUTOR' || role === 'ADMINISTRATOR' || role === 'SUPER_ADMIN' ? null : prev.parentUserId,
      siteIds: []
    }));
    
    // Clear related errors and validate role hierarchy
    const hierarchyError = validateRoleHierarchyLocal(role, formData.parentUserId);
    setErrors(prev => ({ 
      ...prev, 
      role: hierarchyError || '', 
      parentUserId: '', 
      siteIds: '' 
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Real-time validation for parent user selection
    if (name === 'parentUserId') {
      const hierarchyError = validateRoleHierarchyLocal(selectedRole, newValue);
      if (hierarchyError) {
        setErrors(prev => ({ ...prev, parentUserId: hierarchyError }));
      } else {
        setErrors(prev => ({ ...prev, parentUserId: '' }));
      }
    } else {
      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleSiteSelection = (siteId) => {
    setFormData(prev => {
      const isSelected = prev.siteIds.includes(siteId);
      const newSiteIds = isSelected
        ? prev.siteIds.filter(id => id !== siteId)
        : [...prev.siteIds, siteId];
      return { ...prev, siteIds: newSiteIds };
    });
    if (errors.siteIds) {
      setErrors(prev => ({ ...prev, siteIds: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic field validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters long';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters long';
    }

    // Password validation with strength requirements
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!selectedRole) {
      newErrors.role = 'Please select a role';
    }

    // Role hierarchy validation using utility
    if (selectedRole) {
      const currentUserRole = currentUser?.roles?.[0] || currentUser?.role;
      
            
      const roleValidation = validateRoleHierarchy(currentUserRole, selectedRole, formData.parentUserId);
            if (roleValidation) {
        newErrors.role = roleValidation.message;
      }
    }

    // Site assignment validation using utility
    // For distributors, siteIds is optional; for operators, it's required
    if (selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') {
      if (formData.siteIds.length === 0) {
        newErrors.siteIds = 'Please select at least one site';
      } else {
        const siteValidation = validateSiteAssignments(selectedRole, formData.siteIds, getSitesToDisplay());
        if (siteValidation) {
          newErrors.siteIds = siteValidation.message;
        }
      }
    } else if (selectedRole === 'DISTRIBUTOR' && formData.siteIds.length > 0) {
      // For distributors, only validate if sites are selected (optional)
      const siteValidation = validateSiteAssignments(selectedRole, formData.siteIds, getSitesToDisplay());
      if (siteValidation) {
        newErrors.siteIds = siteValidation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Additional role hierarchy validation before submission
    const hierarchyError = validateRoleHierarchyLocal(selectedRole, formData.parentUserId);
    if (hierarchyError) {
      setErrors(prev => ({ ...prev, role: hierarchyError }));
      return;
    }

    setSubmitLoading(true);
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        active: formData.active,
        roles: formData.roles,
        // Keep siteIds as strings, no conversion needed
        siteIds: formData.siteIds
      };

      // Only add parentUserId for operators, not distributors
      // Send null if no parent distributor is selected (allows removing operators from distributors)
      if (selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') {
        userData.parentUserId = formData.parentUserId || null;
      }

      await handleApiCall(
        () => apiService.createUser(userData),
        {
          maxRetries: 2,
          onError: (parsedError) => {
            if (parsedError.field) {
              setErrors(prev => ({ ...prev, [parsedError.field]: parsedError.message }));
            } else {
              setErrors({ submit: parsedError.message });
            }
          }
        }
      );
      
      onUserCreated?.();
      onClose();
      resetForm();
    } catch (parsedError) {
      // Error is already handled by the handleApiCall utility
      console.error('Error creating user:', parsedError);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getSitesToDisplay = () => {
        let sitesToDisplay = [];
    if (selectedRole === 'DISTRIBUTOR') {
      sitesToDisplay = availableSites || [];
    } else if (selectedRole === 'MULTI_SITE_OPERATOR') {
      // Multi-site operators use sites from device-status API (stored in availableSites)
      sitesToDisplay = availableSites || [];
    } else if (selectedRole === 'OPERATOR') {
      // Regular operators now also use sites from device-status API (stored in availableSites)
      sitesToDisplay = availableSites || [];
    }
    
                        
    const result = sitesToDisplay || [];
        return result;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={submitLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* General Error Alert */}
        {generalError && (
          <div className="mb-6">
            <ErrorAlert
              type={generalError.type}
              title={generalError.title}
              message={generalError.message}
              onClose={() => setGeneralError(null)}
              onRetry={generalError.type === 'error' ? loadInitialData : undefined}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={submitLoading}
              >
                <option value="">Select a role</option>
                {getAvailableRoleOptions().map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Parent Distributor Selection (for Operators) */}
            {(selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Distributor (Optional)
                </label>
                <select
                  name="parentUserId"
                  value={formData.parentUserId || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.parentUserId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitLoading}
                >
                  <option value="">No parent distributor (independent operator)</option>
                  {distributors.map(distributor => (
                    <option key={distributor.id} value={distributor.id}>
                      {distributor.firstName} {distributor.lastName} ({distributor.username})
                    </option>
                  ))}
                </select>
                {errors.parentUserId && <p className="text-red-500 text-sm mt-1">{errors.parentUserId}</p>}
                {errors.distributors && <p className="text-red-500 text-sm mt-1">{errors.distributors}</p>}
              </div>
            )}

            {/* Site Assignment */}
            {selectedRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Assignment *
                  {selectedRole === 'DISTRIBUTOR' && ' (All available sites)'}
                  {selectedRole === 'MULTI_SITE_OPERATOR' && ' (All sites from device status API)'}
                  {selectedRole === 'OPERATOR' && ' (All sites from device status API)'}
                </label>
                <div className={`border rounded-md p-3 max-h-40 overflow-y-auto ${
                  errors.sites ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}>
                  {errors.sites ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm">{errors.sites}</p>
                      </div>
                      {selectedRole === 'DISTRIBUTOR' && (
                        <button 
                          type="button"
                          onClick={() => {
                                                        setErrors(prev => ({ ...prev, sites: '' }));
                            loadAllSites();
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Retry Loading Sites
                        </button>
                      )}
                    </div>
                  ) : (() => {
                                                            
                    // Safe function call with error handling
                    let sitesResult;
                    try {
                      if (typeof getSitesToDisplay === 'function') {
                        sitesResult = getSitesToDisplay();
                      } else {
                        console.error('❌ ERROR: getSitesToDisplay is not a function!', typeof getSitesToDisplay);
                        sitesResult = [];
                      }
                    } catch (error) {
                      console.error('❌ ERROR: Exception calling getSitesToDisplay:', error);
                      sitesResult = [];
                    }
                    
                                                                                
                    // Ensure we always return an array
                    const finalResult = Array.isArray(sitesResult) ? sitesResult : [];
                    return finalResult;
                  })().length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-gray-500 text-sm">
                        {selectedRole === 'DISTRIBUTOR' 
                          ? 'No sites available. Click below to load sites.' 
                          : selectedRole === 'MULTI_SITE_OPERATOR'
                          ? 'No sites available from device status API.'
                          : selectedRole === 'OPERATOR'
                          ? 'No sites available from device status API.'
                          : 'Sites will be loaded from device status API'}
                      </p>
                      {selectedRole === 'DISTRIBUTOR' && (
                        <button 
                          type="button"
                          onClick={() => {
                                                        loadAllSites();
                          }}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Load Available Sites
                        </button>
                      )}
                      <div className="text-xs mt-2 space-y-1 p-2 bg-gray-50 rounded">
                         <p className="text-blue-600 font-medium">Debug Info:</p>
                         <p className="text-gray-600">
                           Role: {selectedRole || 'None'} | Available: {availableSites.length} | Assignable: {assignableSites.length}
                         </p>
                         <p className="text-gray-600">
                           User: {currentUser?.username || 'Not loaded'} | Roles: {currentUser?.roles?.join(', ') || 'None'}
                         </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                                                
                        // Safe function call with error handling
                        let sitesForMap;
                        try {
                          if (typeof getSitesToDisplay === 'function') {
                            sitesForMap = getSitesToDisplay();
                          } else {
                            console.error('❌ ERROR: getSitesToDisplay is not a function for map!', typeof getSitesToDisplay);
                            sitesForMap = [];
                          }
                        } catch (error) {
                          console.error('❌ ERROR: Exception calling getSitesToDisplay for map:', error);
                          sitesForMap = [];
                        }
                        
                                                                        
                        if (!Array.isArray(sitesForMap)) {
                          console.error('❌ ERROR: getSitesToDisplay() did not return an array!', sitesForMap);
                          return [];
                        }
                        return sitesForMap;
                      })().map(site => (
                        <label key={site.id || site.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.siteIds.includes(site.id || site.name)}
                            onChange={() => handleSiteSelection(site.id || site.name)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={submitLoading}
                          />
                          <span className="text-sm text-gray-700">
                            {site.name} {site.location && `(${site.location})`}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {errors.siteIds && <p className="text-red-500 text-sm mt-1">{errors.siteIds}</p>}
                {errors.sites && <p className="text-red-500 text-sm mt-1">{errors.sites}</p>}
                {errors.assignableSites && <p className="text-red-500 text-sm mt-1">{errors.assignableSites}</p>}
              </div>
            )}

            {/* Active Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={submitLoading}
                />
                <span className="text-sm font-medium text-gray-700">Active User</span>
              </label>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={submitLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={submitLoading}
              >
                {submitLoading && <LoadingSpinner />}
                <span>{submitLoading ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserCreationForm;