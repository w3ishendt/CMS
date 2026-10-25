import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import authService from '../services/authService';

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testUsersAPI = async () => {
    addResult('🚀 Starting /api/users test...');
    setLoading(true);
    
    try {
      // Test if user is authenticated first
      const isAuth = authService.isAuthenticated();
      addResult(`✅ Authentication status: ${isAuth}`);
      
      if (!isAuth) {
        addResult('❌ User not authenticated - please login first');
        setLoading(false);
        return;
      }

      // Get user info
      const userInfo = authService.getUserInfo();
      addResult(`👤 Current user: ${userInfo?.username} (${userInfo?.role})`);
      
      // Test token validity
      try {
        const token = await authService.getValidToken();
        addResult(`🔑 Token obtained successfully (length: ${token.length})`);
      } catch (tokenError: any) {
        addResult(`❌ Token error: ${tokenError.message}`);
        setLoading(false);
        return;
      }

      // Now test the actual API call
      addResult('📡 Making API call to /api/users...');
      const response = await apiService.getUsers({
        page: 0,
        size: 10
      });
      
      addResult(`✅ SUCCESS: Received ${response.content?.length || 0} users`);
      addResult(`📊 Response keys: ${Object.keys(response).join(', ')}`);
      
    } catch (error: any) {
      addResult(`❌ ERROR: ${error.message || 'Unknown error'}`);
      addResult(`🔍 Error type: ${typeof error}`);
      addResult(`🔍 Error code: ${error.code || 'No code'}`);
      addResult(`🔍 Has response: ${!!error.response}`);
      addResult(`🔍 Has request: ${!!error.request}`);
      
      if (error.response) {
        addResult(`📄 Response status: ${error.response.status}`);
        addResult(`📄 Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        addResult(`🌐 NETWORK ERROR: Request made but no response received`);
        addResult(`🌐 This indicates CORS, network, or server connectivity issues`);
      }
      
      console.error('Full error object:', error);
    } finally {
      setLoading(false);
    }
  };

  const testWorkingAPI = async () => {
    addResult('🚀 Testing working API (/sites/available)...');
    try {
      const response = await apiService.getAvailableSites();
      addResult(`✅ Working API SUCCESS: ${JSON.stringify(response).substring(0, 100)}...`);
    } catch (error: any) {
      addResult(`❌ Working API failed: ${error.message}`);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  // Auto-test on component mount
  useEffect(() => {
    addResult('🔧 ApiTest component mounted');
    // Auto-test after a short delay
    setTimeout(() => {
      testUsersAPI();
    }, 1000);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testUsersAPI}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test /api/users'}
        </button>
        
        <button
          onClick={testWorkingAPI}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
        >
          Test Working API
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded ml-2"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div key={index} className="text-sm font-mono">
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiTest;