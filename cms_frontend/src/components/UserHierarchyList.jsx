import React from 'react';
import { ChevronRight, Users, User, Building } from 'lucide-react';

const UserHierarchyList = ({ users, onEditUser, onDeleteUser, isLoading, permissions, currentUserId }) => {
  // Group users by hierarchy
  const groupUsersByHierarchy = (users) => {
    const distributors = users.filter(user => user.roles.includes('DISTRIBUTOR'));
    const operators = users.filter(user => 
      user.roles.includes('OPERATOR') || user.roles.includes('MULTI_SITE_OPERATOR')
    );
    const assignedOperatorIds = new Set(operators.map(operator => operator.id));
    const rootUsers = users.filter(user =>
      !user.roles.includes('DISTRIBUTOR') &&
      !assignedOperatorIds.has(user.id)
    );

    const distributorGroups = distributors.map(distributor => ({
      ...distributor,
      children: operators.filter(op => op.parentUserId === distributor.id)
    }));

    return [
      ...rootUsers.map(user => ({
        ...user,
        children: operators.filter(op => op.parentUserId === user.id)
      })),
      ...distributorGroups
    ];
  };

  const getRoleBadgeColor = (roles) => {
    if (roles.includes('SUPER_ADMIN')) {
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    } else if (roles.includes('ADMINISTRATOR')) {
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    } else if (roles.includes('DISTRIBUTOR')) {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    } else if (roles.includes('MULTI_SITE_OPERATOR')) {
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    } else if (roles.includes('OPERATOR')) {
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getRoleIcon = (roles) => {
    if (roles.includes('DISTRIBUTOR')) return <Building className="w-4 h-4" />;
    if (roles.includes('MULTI_SITE_OPERATOR')) return <Users className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const formatSites = (user) => {
    let sitesToDisplay = [];
    
    if (user.sites && user.sites.length > 0) {
      sitesToDisplay = user.sites;
    } else if (user.assignedSiteNames && user.assignedSiteNames.length > 0) {
      sitesToDisplay = user.assignedSiteNames.map(siteName => ({
        name: siteName
      }));
    }
    
    if (sitesToDisplay.length === 0) {
      return <span className="text-gray-400">No sites</span>;
    }
    
    return (
      <div className="space-y-1">
        {sitesToDisplay.slice(0, 2).map((site, index) => (
          <div key={index} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {site.name}
          </div>
        ))}
        {sitesToDisplay.length > 2 && (
          <div className="text-xs text-gray-500">
            +{sitesToDisplay.length - 2} more
          </div>
        )}
      </div>
    );
  };

  const hierarchicalUsers = groupUsersByHierarchy(users);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hierarchicalUsers.map((distributor) => (
        <div key={distributor.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Distributor Row */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(distributor.roles)}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {distributor.firstName} {distributor.lastName}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({distributor.username})</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(distributor.roles)}`}>
                  {distributor.roles[0]}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  distributor.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {distributor.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatSites(distributor)}
                </div>
                <div className="flex space-x-2">
                  {permissions?.canManageUsers && (
                    <button
                      onClick={() => onEditUser(distributor)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {permissions?.canDeleteUsers && distributor.id !== currentUserId && (
                    <button
                      onClick={() => onDeleteUser(distributor)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Email:</span> {distributor.email}
            </div>
          </div>

          {/* Child Operators */}
          {distributor.children && distributor.children.length > 0 && (
            <div className="bg-white dark:bg-gray-800">
              {distributor.children.map((operator, index) => (
                <div key={operator.id} className={`p-4 pl-8 border-l-4 border-blue-200 dark:border-blue-600 ${
                   index < distributor.children.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''
                 }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        {getRoleIcon(operator.roles)}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {operator.firstName} {operator.lastName}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({operator.username})</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(operator.roles)}`}>
                        {operator.roles[0].replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        operator.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {operator.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatSites(operator)}
                      </div>
                      <div className="flex space-x-2">
                        {permissions?.canManageUsers && (
                          <button
                            onClick={() => onEditUser(operator)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {permissions?.canDeleteUsers && operator.id !== currentUserId && (
                          <button
                            onClick={() => onDeleteUser(operator)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Email:</span> {operator.email}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No child users message */}
          {(!distributor.children || distributor.children.length === 0) && (
            <div className="bg-white dark:bg-gray-800 p-4 pl-8 border-l-4 border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
              <ChevronRight className="w-4 h-4 inline mr-2" />
              No child users assigned
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserHierarchyList;
