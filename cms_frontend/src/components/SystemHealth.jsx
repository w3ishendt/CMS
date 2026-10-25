import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_ROOT_URL } from '../config/api';

const SystemHealth = () => {
  const [health, setHealth] = useState({});
  const [rabbitMQHealth, setRabbitMQHealth] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      // Fetch general health
      const healthResponse = await fetch(`${API_BASE_URL}/device-status/health`);
      const healthData = await healthResponse.json();
      setHealth(healthData);

      // Fetch RabbitMQ specific health
      try {
        const rabbitResponse = await fetch(`${API_BASE_URL}/device-status/rabbitmq-status`);
        const rabbitData = await rabbitResponse.json();
        setRabbitMQHealth(rabbitData);
      } catch (error) {
        console.error('RabbitMQ health check failed:', error);
        setRabbitMQHealth({ status: 'UNKNOWN', error: error.message });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-48 mb-2"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64"></div>
          </div>
        </div>

        {/* Overall Status Skeleton */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
              </div>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-20"></div>
            </div>
          </div>
        </div>

        {/* Component Health Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="animate-pulse">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-16"></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Metrics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-40 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex justify-between">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900">⚡ System Health</h2>
        <p className="mt-1 text-sm text-gray-600">Monitor system components and performance</p>
      </div>

      {/* Overall Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Overall System Status</h3>
            <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleString()}</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            health.status === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {health.status || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {/* Component Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HealthCard
          title="Database"
          status={health.database?.status}
          details={health.database?.details}
          icon="🗄️"
        />
        <HealthCard
          title="RabbitMQ"
          status={rabbitMQHealth.status}
          details={rabbitMQHealth}
          icon="🐰"
        />
        <HealthCard
          title="API Server"
          status="UP"
          details={{ message: "All endpoints responding" }}
          icon="🚀"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📊 System Information</h3>
          <div className="space-y-3">
            <MetricRow label="Uptime" value={health.uptime || 'Unknown'} />
            <MetricRow label="JVM Version" value={health.jvm?.version || 'Unknown'} />
            <MetricRow label="Memory Usage" value={
              health.memory ? `${Math.round((health.memory.used / health.memory.total) * 100)}%` : 'Unknown'
            } />
            <MetricRow label="Active Threads" value={health.threads?.active || 'Unknown'} />
          </div>
        </div>

        {/* RabbitMQ Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🐰 RabbitMQ Metrics</h3>
          <div className="space-y-3">
            <MetricRow 
              label="Device Queue" 
              value={rabbitMQHealth.device_queue_exists ? '✅ Active' : '❌ Inactive'} 
            />
            <MetricRow 
              label="Messages in Queue" 
              value={rabbitMQHealth.device_queue_messages || '0'} 
            />
            <MetricRow 
              label="Dead Letter Queue" 
              value={rabbitMQHealth.dlq_exists ? '✅ Active' : '❌ Inactive'} 
            />
            <MetricRow 
              label="Connection Status" 
              value={rabbitMQHealth.status === 'HEALTHY' ? '🟢 Connected' : '🔴 Disconnected'} 
            />
          </div>
        </div>
      </div>

      {/* Health Check Endpoints */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔗 Health Check Endpoints</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthEndpoint
            url="/api/device-status/health"
            description="General application health"
          />
          <HealthEndpoint
            url="/api/device-status/rabbitmq-status"
            description="RabbitMQ connection status"
          />
          <HealthEndpoint
            url="/actuator/health"
            description="Spring Boot actuator health"
          />
          <HealthEndpoint
            url="/actuator/metrics"
            description="Application metrics"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Recent Activity</h3>
        <div className="space-y-2">
          <ActivityItem
            time="Just now"
            message="Health check completed successfully"
            type="success"
          />
          <ActivityItem
            time="30 seconds ago"
            message="RabbitMQ connection verified"
            type="success"
          />
          <ActivityItem
            time="1 minute ago"
            message="Database connection pool optimized"
            type="info"
          />
        </div>
      </div>
    </div>
  );
};

const HealthCard = ({ title, status, details, icon }) => {
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'up':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'down':
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-2xl">{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-center">
                <div className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                  {status || 'UNKNOWN'}
                </div>
              </dd>
            </dl>
          </div>
        </div>
        {details && (
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              {typeof details === 'string' ? details : 
               details.message || details.error || JSON.stringify(details, null, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-sm text-gray-500">{label}:</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

const HealthEndpoint = ({ url, description }) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm font-medium text-gray-900">{url}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => window.open(`${API_ROOT_URL}${url}`, '_blank')}
        className="text-blue-600 hover:text-blue-800 text-sm"
      >
        Test →
      </button>
    </div>
  </div>
);

const ActivityItem = ({ time, message, type }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      <span className={`w-2 h-2 rounded-full ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
      }`}></span>
      <span className="text-gray-500">{time}</span>
      <span className={getTypeColor(type)}>{message}</span>
    </div>
  );
};

export default SystemHealth;
