import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, User, Mail, Lock, Users, MapPin } from 'lucide-react';
import { useUser } from '../contexts/UserContext.tsx';
import { parseApiError, validateRoleHierarchy, validateSiteAssignments, handleApiCall } from '../utils/errorHandler';
import { apiService } from '../services/apiService';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorAlert from './ErrorAlert';

const EditUserModal = ({ isOpen, onClose, onUserUpdated, userToEdit }) => {
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
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Load initial data when form opens or user changes
  useEffect(() => {
    if (isOpen && userToEdit) {
      loadInitialData();
    }
  }, [isOpen, userToEdit]);

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
      // Pre-populate form with existing user data
      if (userToEdit) {
        const userRole = Array.isArray(userToEdit.roles) ? userToEdit.roles[0] : userToEdit.roles;
        setFormData({
          username: userToEdit.username || '',
          email: userToEdit.email || '',
          firstName: userToEdit.firstName || '',
          lastName: userToEdit.lastName || '',
          password: '',
          confirmPassword: '',
          active: userToEdit.active !== undefined ? userToEdit.active : true,
          roles: Array.isArray(userToEdit.roles) ? userToEdit.roles : [userToEdit.roles],
          parentUserId: userToEdit.parentUserId || null,
          siteIds: userToEdit.siteIds || []
        });
        setSelectedRole(userRole);
      }
      
      // Load sites for admin users immediately
      if (hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR'])) {
                await loadAllSites();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setGeneralError({
        title: 'Initialization Failed',
        message: 'Failed to initialize the edit form. Please try again.',
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
      if (!hasAnyRole(['SUPER_ADMIN', 'ADMINISTRATOR'])) {
                setErrors(prev => ({ ...prev, sites: 'Only Super Admin and Administrator users can view all sites' }));
        setAvailableSites([]);
        return;
      }

      // Try to get proper site objects first, fallback to device status sites
      try {
        const response = await apiService.getAvailableSites();
        if (response && response.sites && Array.isArray(response.sites)) {
          // If we get proper site objects, use them
          const sitesData = response.sites.map(siteName => ({
            id: siteName, // Keep as string for now since backend expects siteNames
            name: siteName,
            location: null
          }));
          setAvailableSites(sitesData);
          setErrors(prev => ({ ...prev, sites: '' }));
          return;
        }
      } catch (availableSitesError) {
        console.warn('⚠️ getAvailableSites failed, trying device status sites:', availableSitesError);
      }

      // Fallback to device status sites
      const response = await apiService.getDeviceStatusSites();
      let sitesData = response || [];
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        if (typeof sitesData[0] === 'string') {
          sitesData = sitesData.map(siteName => ({
            id: siteName, // Keep as string since backend expects siteNames
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAvailableSites(sitesData);
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('❌ Error loading sites:', error);
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
            
      let sitesData = response.sites || response;
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        if (typeof sitesData[0] === 'string') {
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAssignableSites(sitesData || []);
      setErrors(prev => ({ ...prev, assignableSites: '' }));
    } catch (error) {
      console.error('❌ Error loading assignable sites:', error);
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
            
      let sitesData = response || [];
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        if (typeof sitesData[0] === 'string') {
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAvailableSites(sitesData);
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('❌ Error loading sites for multi-site operator:', error);
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
            
      let sitesData = response || [];
            
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        if (typeof sitesData[0] === 'string') {
          sitesData = sitesData.map(siteName => ({
            id: siteName,
            name: siteName,
            location: null
          }));
                  }
      }
      
            setAvailableSites(sitesData);
      setErrors(prev => ({ ...prev, sites: '' }));
    } catch (error) {
      console.error('❌ Error loading sites for operator:', error);
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
    setShowPasswordFields(false);
  };

  const validateRoleHierarchyLocal = (role, parentUserId) => {
    if (role === 'DISTRIBUTOR' && parentUserId) {
      return 'Distributors cannot have a parent user';
    }
    return null;
  };

  const handleRoleChange = (role) => {
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
    
    if (name === 'parentUserId') {
      const hierarchyError = validateRoleHierarchyLocal(selectedRole, newValue);
      if (hierarchyError) {
        setErrors(prev => ({ ...prev, parentUserId: hierarchyError }));
      } else {
        setErrors(prev => ({ ...prev, parentUserId: '' }));
      }
    } else {
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

    // Password validation (only if password fields are shown and password is provided)
    if (showPasswordFields && formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role validation
    if (!selectedRole) {
      newErrors.role = 'Please select a role';
    }

    // Role hierarchy validation
    if (selectedRole) {
      const currentUserRole = currentUser?.roles?.[0] || currentUser?.role;
      const roleValidation = validateRoleHierarchy(currentUserRole, selectedRole, formData.parentUserId);
      if (roleValidation) {
        newErrors.role = roleValidation.message;
      }
    }

    // Site assignment validation
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

    const hierarchyError = validateRoleHierarchyLocal(selectedRole, formData.parentUserId);
    if (hierarchyError) {
      setErrors(prev => ({ ...prev, role: hierarchyError }));
      return;
    }

    setSubmitLoading(true);
    try {
      // Map siteIds to siteNames for the API request
      const sitesToDisplay = getSitesToDisplay();
      const siteNames = formData.siteIds.map(siteId => {
        const site = sitesToDisplay.find(s => s.id === siteId);
        return site ? site.name : siteId; // fallback to siteId if site not found
      });

      const userData = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        active: formData.active,
        roles: [selectedRole],
        siteNames: siteNames
      };

      // Only include password if it's being changed
      if (showPasswordFields && formData.password) {
        userData.password = formData.password;
      }

      // Only add parentUserId for operators
      if (selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') {
        userData.parentUserId = formData.parentUserId;
      }

      await handleApiCall(
        () => apiService.updateUser(userToEdit.id, userData),
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
      
      onUserUpdated?.();
      onClose();
      resetForm();
    } catch (parsedError) {
      console.error('Error updating user:', parsedError);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getSitesToDisplay = () => {
    let sitesToDisplay = [];
    if (selectedRole === 'DISTRIBUTOR') {
      sitesToDisplay = availableSites || [];
    } else if (selectedRole === 'MULTI_SITE_OPERATOR') {
      sitesToDisplay = availableSites || [];
    } else if (selectedRole === 'OPERATOR') {
      sitesToDisplay = availableSites || [];
    }
    
    return sitesToDisplay || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* General Error Alert */}
        {generalError && (
          <div className="mb-4">
            <ErrorAlert
              type={generalError.type}
              title={generalError.title}
              message={generalError.message}
              onClose={() => setGeneralError(null)}
            />
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="inline h-4 w-4 mr-1" />
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Password Change Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password Settings
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
                </button>
              </div>

              {showPasswordFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Lock className="inline h-4 w-4 mr-1" />
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Lock className="inline h-4 w-4 mr-1" />
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Users className="inline h-4 w-4 mr-1" />
                Role *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.role ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a role</option>
                {getAvailableRoleOptions().map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.role}
                </p>
              )}
            </div>

            {/* Parent Distributor Selection */}
            {(selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Distributor
                </label>
                <select
                  name="parentUserId"
                  value={formData.parentUserId || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.parentUserId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select parent distributor (optional)</option>
                  {distributors.map(distributor => (
                    <option key={distributor.id} value={distributor.id}>
                      {distributor.firstName} {distributor.lastName} ({distributor.username})
                    </option>
                  ))}
                </select>
                {errors.parentUserId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.parentUserId}
                  </p>
                )}
              </div>
            )}

            {/* Site Assignment */}
            {(selectedRole === 'DISTRIBUTOR' || selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Site Assignment {(selectedRole === 'OPERATOR' || selectedRole === 'MULTI_SITE_OPERATOR') && '*'}
                </label>
                
                {errors.sites && (
                  <p className="mb-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.sites}
                  </p>
                )}
                
                {errors.assignableSites && (
                  <p className="mb-2 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.assignableSites}
                  </p>
                )}
                
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                  {getSitesToDisplay().length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      {selectedRole === 'OPERATOR' && formData.parentUserId 
                        ? 'Loading assignable sites...' 
                        : selectedRole === 'OPERATOR'
                        ? 'Select a parent distributor to view assignable sites'
                        : 'No sites available'
                      }
                    </p>
                  ) : (
                    getSitesToDisplay().map(site => (
                      <label key={site.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                        <input
                          type="checkbox"
                          checked={formData.siteIds.includes(site.id)}
                          onChange={() => handleSiteSelection(site.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {site.name}
                          {site.location && (
                            <span className="text-gray-500 dark:text-gray-400 ml-1">({site.location})</span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                
                {errors.siteIds && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.siteIds}
                  </p>
                )}
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
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active User
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Inactive users cannot log in to the system
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.submit}
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditUserModal;