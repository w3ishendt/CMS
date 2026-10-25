import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext.tsx';
import { useAppStore, useNotificationStore } from '../stores/useAppStore';
import { apiService } from '../services/apiService';
import { parseApiError, handleApiCall } from '../utils/errorHandler';
import { CanManageUsers } from '../components/auth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import UserCreationForm from '../components/UserCreationForm';
import UserHierarchyList from '../components/UserHierarchyList';
import ErrorBoundary from '../components/ErrorBoundary';
import ErrorAlert from '../components/ErrorAlert';
import EditUserModal from '../components/EditUserModal';

import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Users,
  Building
} from 'lucide-react';

const UserManagement = () => {

  const { user: currentUser } = useAuth();
  const { permissions } = useUser();
  

  

  const { 
    users, 
    usersPagination, 
    usersFilter,
    setUsers,
    setUsersFilter,
    updateUser,
    removeUser,
    addUser
  } = useAppStore();
  const { showSuccess, showError, showInfo } = useNotificationStore();
  
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);
  const [availableSites, setAvailableSites] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roles: ['OPERATOR'],
    parentUserId: null,
    siteIds: [],
    active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [inheritAllSites, setInheritAllSites] = useState(false);
  
  // Role options with hierarchy
  const roleOptions = [
    { value: 'SUPER_ADMIN', label: 'Super Administrator', description: 'Full system access', requiresParent: false },
    { value: 'ADMINISTRATOR', label: 'Administrator', description: 'Administrative access', requiresParent: false },
    { value: 'DISTRIBUTOR', label: 'Distributor', description: 'Multi-site management', requiresParent: false },
    { value: 'MULTI_SITE_OPERATOR', label: 'Multi-Site Operator', description: 'Multiple site operations', requiresParent: true },
    { value: 'OPERATOR', label: 'Operator', description: 'Single site operations', requiresParent: true }
  ];
  
  // Load data on component mount
  useEffect(() => {
    loadUsers();
    loadSites();
    loadDistributors();
  }, [usersFilter, showHierarchy]);
  
  // Load users with hierarchy
  const loadUsers = async () => {
    setLoading(true);
    try {
      setError(null);

      

      // Add cache-busting parameter to prevent stale data
      const cacheBuster = Date.now();
      
      const response = showHierarchy 
        ? await apiService.getUsersWithHierarchy({
            page: usersPagination.page,
            size: usersPagination.size,
            sortBy: usersFilter.sortBy,
            sortDir: usersFilter.sortDir,
            search: usersFilter.search || undefined,
            role: usersFilter.role || undefined,
            active: usersFilter.active,
            includeHierarchy: true,
            _t: cacheBuster
          })
        : await apiService.getUsers({
            page: usersPagination.page,
            size: usersPagination.size,
            sortBy: usersFilter.sortBy,
            sortDir: usersFilter.sortDir,
            search: usersFilter.search || undefined,
            role: usersFilter.role || undefined,
            active: usersFilter.active,
            _t: cacheBuster
          });
      

      
      // Check if response has expected structure
      if (!response) {
        console.error('❌ UserManagement: Response is null or undefined');
        throw new Error('Invalid response: response is null');
      }
      

      
      // Extract content with fallback
      const content = response.content || response.data || response || [];
      
      // Extract pagination with safe fallbacks
      const pagination = {
        page: response.number ?? response.page ?? 0,
        size: response.size ?? response.pageSize ?? 20,
        totalElements: response.totalElements ?? response.total ?? 0,
        totalPages: response.totalPages ?? Math.ceil((response.totalElements ?? response.total ?? 0) / (response.size ?? response.pageSize ?? 20))
      };
      

      
      setUsers(content, pagination);
    } catch (error) {
      console.error('Failed to load users');
      
      setError({
        title: 'Failed to Load Users',
        message: error?.response?.data?.message || (error?.message ? String(error.message) : null) || 'Unable to fetch user data. Please check your connection and try again.',
        type: 'error'
      });
      if (showError) {
        showError('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLoadUsers = () => {
    setRetryCount(prev => prev + 1);
    loadUsers();
  };
  
  // Load available sites
  const loadSites = async () => {
    setLoadingSites(true);
    try {
      const response = await handleApiCall(
        () => apiService.getAvailableSites(),
        {
          maxRetries: 1,
          onError: (parsedError) => {
            if (parsedError.isPermissionError) {
              console.warn('No permission to load sites:', parsedError.message);
            } else {
              if (showError) {
                showError('Failed to load available sites');
              }
              setError({
                title: 'Failed to Load Sites',
                message: parsedError.message || 'Unable to fetch site data.',
                type: 'warning'
              });
            }
          }
        }
      );
      setAvailableSites(Array.isArray(response) ? response : response.sites || []);
    } catch (parsedError) {
      console.error('Error loading sites:', parsedError);
      // Error is already handled by the handleApiCall utility
    } finally {
      setLoadingSites(false);
    }
  };
  
  // Load distributors
  const loadDistributors = async () => {
    setLoadingDistributors(true);
    try {
      const response = await handleApiCall(
        () => apiService.getDistributors(),
        {
          maxRetries: 1,
          onError: (parsedError) => {
            if (parsedError.isPermissionError) {
              console.warn('No permission to load distributors:', parsedError.message);
            } else {
              if (showError) {
                showError('Failed to load distributors');
              }
            }
          }
        }
      );
      setDistributors(response);
    } catch (parsedError) {
      console.error('Error loading distributors:', parsedError);
      // Don't show error for distributors as it's not critical for viewing users
    } finally {
      setLoadingDistributors(false);
    }
  };
  
  // Handle role change and update form accordingly
  const handleRoleChange = async (selectedRole) => {
    const roleConfig = roleOptions.find(r => r.value === selectedRole);
    
    setFormData(prev => ({
      ...prev,
      roles: [selectedRole],
      parentUserId: roleConfig?.requiresParent ? prev.parentUserId : null,
      siteIds: []
    }));
    
    setInheritAllSites(false);
    setFilteredSites([]);
    
    // If role doesn't require parent, show all sites
    if (!roleConfig?.requiresParent) {
      setFilteredSites(availableSites);
    }
  };
  
  // Handle parent distributor change
  const handleParentChange = async (distributorId) => {
    setFormData(prev => ({ ...prev, parentUserId: distributorId, siteIds: [] }));
    setInheritAllSites(false);
    
    if (distributorId) {
      try {
        const assignableSites = await apiService.getDistributorAssignableSites(distributorId);
        setFilteredSites(assignableSites.filter(site => site.canAssign));
      } catch (error) {
        if (showError) {
          showError('Failed to load distributor sites');
        }
        setFilteredSites([]);
      }
    } else {
      setFilteredSites([]);
    }
  };
  
  // Handle inherit all sites toggle
  const handleInheritAllSites = (inherit) => {
    setInheritAllSites(inherit);
    if (inherit) {
      setFormData(prev => ({
        ...prev,
        siteIds: filteredSites.map(site => site.id)
      }));
    } else {
      setFormData(prev => ({ ...prev, siteIds: [] }));
    }
  };
  
  // Handle site selection
  const handleSiteSelection = (siteId, selected) => {
    setFormData(prev => ({
      ...prev,
      siteIds: selected 
        ? [...prev.siteIds, siteId]
        : prev.siteIds.filter(id => id !== siteId)
    }));
  };
  
  // Validate form with hierarchy rules
  const validateForm = (isEdit = false) => {
    const errors = {};
    const selectedRole = formData.roles[0];
    const roleConfig = roleOptions.find(r => r.value === selectedRole);
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!isEdit && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    // Role-specific validation
    if (roleConfig?.requiresParent && !formData.parentUserId) {
      errors.parentUserId = `${roleConfig.label} requires a parent distributor`;
    }
    
    // Site validation based on role
    if (selectedRole === 'OPERATOR') {
      if (!formData.siteIds || formData.siteIds.length !== 1) {
        errors.siteIds = 'OPERATOR role requires exactly 1 site';
      }
    } else if (selectedRole === 'MULTI_SITE_OPERATOR') {
      if (!formData.siteIds || formData.siteIds.length === 0) {
        errors.siteIds = 'MULTI_SITE_OPERATOR role requires at least 1 site';
      }
    } else if (selectedRole === 'DISTRIBUTOR') {
      if (!formData.siteIds || formData.siteIds.length === 0) {
        errors.siteIds = 'DISTRIBUTOR role requires at least 1 site';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleUserCreated = async () => {
    try {
      setError(null);
      await loadUsers();
      showSuccess('User created successfully!');
    } catch (error) {
      console.error('Error refreshing user list:', error);
      setError({
        title: 'User Created but List Update Failed',
        message: 'The user was created successfully, but we couldn\'t refresh the user list. Please refresh the page manually.',
        type: 'warning'
      });
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roles: ['OPERATOR'],
      parentUserId: null,
      siteIds: [],
      active: true
    });
    setFormErrors({});
    setShowPassword(false);
    setInheritAllSites(false);
    setFilteredSites([]);
  };
  
  // Handle search
  const handleSearch = (e) => {
    const search = e.target.value;
    setUsersFilter({ search });
  };
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setUsersFilter({ [key]: value });
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setUsersFilter({ page: newPage });
  };
  
  // Get role badge color
  const getRoleBadgeColor = (roles) => {
    const role = Array.isArray(roles) ? roles[0] : roles;
    const colors = {
      DISTRIBUTOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      MULTI_SITE_OPERATOR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      OPERATOR: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[role] || colors.OPERATOR;
  };

  // Handle edit user
  const handleEditUser = (user) => {

    setUserToEdit(user);
    setShowEditModal(true);
  };

  // Handle edit user modal close
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setUserToEdit(null);
  };

  // Handle user updated
  const handleUserUpdated = () => {
    showSuccess('User updated successfully');
    
    // Force a complete refresh by clearing any cached data
    setUsers([], { page: 0, size: pageSize, totalElements: 0, totalPages: 0 });
    
    // Add a small delay to ensure the UI updates before reloading
    setTimeout(() => {
      loadUsers(); // Reload the user list
    }, 100);
  };

  // Handle delete user
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await handleApiCall(
        () => apiService.deleteUser(user.id),
        {
          maxRetries: 1,
          onError: (parsedError) => {
            setError({
              title: 'Failed to Delete User',
              message: parsedError.message,
              type: 'error'
            });
            if (showError) {
        showError(`Failed to delete user: ${parsedError.message}`);
      }
          }
        }
      );
      
      showSuccess(`User "${user.username}" has been deleted successfully.`);
      loadUsers(); // Reload the user list
    } catch (parsedError) {
      console.error('Error deleting user:', parsedError);
      // Error is already handled by the handleApiCall utility
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const searchTerm = usersFilter.search?.toLowerCase() || '';
    const matchesSearch = !searchTerm || 
      user.firstName?.toLowerCase().includes(searchTerm) ||
      user.lastName?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.username?.toLowerCase().includes(searchTerm);
    
    const matchesRole = !usersFilter.role || 
      (Array.isArray(user.roles) ? user.roles.includes(usersFilter.role) : user.roles === usersFilter.role);
    
    const matchesActive = usersFilter.active === null || user.active === usersFilter.active;
    
    return matchesSearch && matchesRole && matchesActive;
  });
  
  // Render user hierarchy
  const renderUserHierarchy = (user) => {
    const hasChildren = user.childUsers && user.childUsers.length > 0;
    const hasParent = user.parentUser;
    
    return (
      <div className="flex items-center space-x-2">
        {hasParent && (
          <div className="flex items-center text-xs text-gray-500">
            <Users className="h-3 w-3 mr-1" />
            <span>Under: {user.parentUser.firstName} {user.parentUser.lastName}</span>
          </div>
        )}
        {hasChildren && (
          <div className="flex items-center text-xs text-blue-600">
            <Building className="h-3 w-3 mr-1" />
            <span>{user.childUsers.length} subordinate{user.childUsers.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <ErrorBoundary onRetry={handleRetryLoadUsers} fallbackMessage="Failed to load user management interface">
        <div className="p-6">
          {/* Error Alert */}
          {error && (
            <ErrorAlert
              type={error.type}
              title={error.title}
              message={error.message}
              onClose={() => setError(null)}
              onRetry={error.type === 'error' ? handleRetryLoadUsers : undefined}
            />
          )}
          
          {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage hierarchical user roles, permissions, and site assignments
              </p>
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showHierarchy}
                onChange={(e) => setShowHierarchy(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Hierarchy</span>
            </label>
          </div>
        </div>
        
        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={usersFilter.search || ''}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white w-full"
              />
            </div>
            
            {/* Role Filter */}
            <select
              value={usersFilter.role || ''}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Roles</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={usersFilter.active == null ? '' : String(usersFilter.active)}
              onChange={(e) => handleFilterChange('active', e.target.value === '' ? null : e.target.value === 'true')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          {/* Create User Button */}
          {permissions?.canCreateUsers && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </button>
          )}
        </div>
        
        {/* User Display - Hierarchy or Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {showHierarchy ? (
             <UserHierarchyList 
               users={filteredUsers}
               onEditUser={handleEditUser}
               onDeleteUser={handleDeleteUser}
               isLoading={loading}
               permissions={permissions}
               currentUserId={currentUser?.id}
             />
          ) : (
            loading ? (
              <div className="p-8 text-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Sites
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                       {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.roles)}`}>
                              {roleOptions.find(r => r.value === (Array.isArray(user.roles) ? user.roles[0] : user.roles))?.label || (Array.isArray(user.roles) ? user.roles[0] : user.roles)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(() => {
                                // Handle both user.sites (objects) and user.assignedSiteNames (strings)
                                let sitesToDisplay = [];
                                
                                if (user.sites && user.sites.length > 0) {
                                  sitesToDisplay = user.sites;
                                } else if (user.assignedSiteNames && user.assignedSiteNames.length > 0) {
                                  sitesToDisplay = user.assignedSiteNames.map(siteName => ({
                                    id: siteName,
                                    name: siteName
                                  }));
                                }
                                
                                return sitesToDisplay.length > 0 ? (
                                  <div className="space-y-1">
                                    {sitesToDisplay.slice(0, 2).map(site => (
                                      <div key={site.id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                        {site.name}
                                      </div>
                                    ))}
                                    {sitesToDisplay.length > 2 && (
                                      <div className="text-xs text-gray-500">
                                        +{sitesToDisplay.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No sites</span>
                                );
                              })()} 
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {permissions?.canManageUsers && (
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Edit user"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {permissions?.canDeleteUsers && user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredUsers.length === 0 && (
                   <div className="text-center py-8 text-gray-500">
                     No users found
                   </div>
                 )}
              </>
            )
          )}
        </div>
        
        {/* Create User Modal */}
        {showCreateModal && (
          <UserCreationForm
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onUserCreated={handleUserCreated}
          />
        )}
        
        {/* Edit User Modal */}
        {showEditModal && userToEdit && (
          <EditUserModal
          isOpen={showEditModal}
          onClose={handleEditModalClose}
          onUserUpdated={handleUserUpdated}
          userToEdit={userToEdit}
          availableSites={availableSites}
          distributors={distributors}
        />
        )}
        </div>
      </ErrorBoundary>
  );
};

export default UserManagement;