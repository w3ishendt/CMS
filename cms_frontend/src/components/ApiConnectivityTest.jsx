import React, { useState } from 'react';
import { apiService } from '../services/apiService';

const ApiConnectivityTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testApiConnectivity = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      // Test the users endpoint that was previously failing
      const response = await apiService.getUsersWithHierarchy({ page: 0, size: 5 });
      
      setTestResult({
        success: true,
        message: `✅ API Connection Successful! Retrieved ${response.totalElements} users.`,
        data: {
          totalUsers: response.totalElements,
          currentPage: response.number,
          totalPages: response.totalPages,
          usersOnPage: response.content?.length || 0
        }
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ API Connection Failed: ${error?.message || 'Unknown error'}`,
        error: {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">API Connectivity Test</h3>
      
      <button
        onClick={testApiConnectivity}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {testResult && (
        <div className={`p-4 rounded-md ${
          testResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`font-medium ${
            testResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {testResult.message}
          </p>
          
          {testResult.success && testResult.data && (
            <div className="mt-2 text-sm text-green-700">
              <p>Total Users: {testResult.data.totalUsers}</p>
              <p>Current Page: {testResult.data.currentPage + 1}</p>
              <p>Total Pages: {testResult.data.totalPages}</p>
              <p>Users on Page: {testResult.data.usersOnPage}</p>
            </div>
          )}
          
          {!testResult.success && testResult.error && (
            <div className="mt-2 text-sm text-red-700">
              <p>Status: {testResult.error.status || 'Unknown'}</p>
              <p>Details: {JSON.stringify(testResult.error.data || testResult.error.message)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiConnectivityTest;