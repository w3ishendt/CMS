// (new) Zustand store for application state management
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Main application store
export const useAppStore = create(
  devtools(
    (set, get) => ({
      // UI State
      sidebarOpen: false,
      loading: false,
      notifications: [],
      
      // Data Cache
      users: [],
      // REMOVED: sites: [],
      devices: [],
      dashboardData: null,
      
      // Pagination State
      usersPagination: {
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0
      },
      // REMOVED: sitesPagination
      devicesPagination: {
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0
      },
      
      // Filter State
      usersFilter: {
        search: '',
        role: '',
        active: null,
        sortBy: 'id',
        sortDir: 'asc'
      },
      // REMOVED: sitesFilter
      devicesFilter: {
        search: '',
        // REMOVED: siteId: null,
        status: '',
        type: '',
        sortBy: 'id',
        sortDir: 'asc'
      },
      
      // Actions
      
      // UI Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLoading: (loading) => set({ loading }),
      
      // Notification Actions
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...notification
        }]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Data Actions
      setUsers: (users, pagination) => set({ 
        users, 
        usersPagination: pagination || get().usersPagination 
      }),
      // REMOVED: setSites method
      setDevices: (devices, pagination) => set({ 
        devices, 
        devicesPagination: pagination || get().devicesPagination 
      }),
      setDashboardData: (dashboardData) => set({ dashboardData }),
      
      // Filter Actions
      setUsersFilter: (filter) => set((state) => ({
        usersFilter: { ...state.usersFilter, ...filter }
      })),
      // REMOVED: setSitesFilter method
      setDevicesFilter: (filter) => set((state) => ({
        devicesFilter: { ...state.devicesFilter, ...filter }
      })),
      
      // Reset filters
      resetUsersFilter: () => set({
        usersFilter: {
          search: '',
          role: '',
          active: null,
          sortBy: 'id',
          sortDir: 'asc'
        }
      }),
      // REMOVED: resetSitesFilter method
      resetDevicesFilter: () => set({
        devicesFilter: {
          search: '',
          // REMOVED: siteId: null,
          status: '',
          type: '',
          sortBy: 'id',
          sortDir: 'asc'
        }
      }),
      
      // Utility Actions
      updateUser: (userId, updatedUser) => set((state) => ({
        users: state.users.map(user => 
          user.id === userId ? { ...user, ...updatedUser } : user
        )
      })),
      removeUser: (userId) => set((state) => ({
        users: state.users.filter(user => user.id !== userId)
      })),
      addUser: (newUser) => set((state) => ({
        users: [newUser, ...state.users]
      })),
      
      // REMOVED: updateSite, removeSite, addSite methods
      
      updateDevice: (deviceId, updatedDevice) => set((state) => ({
        devices: state.devices.map(device => 
          device.id === deviceId ? { ...device, ...updatedDevice } : device
        )
      })),
      removeDevice: (deviceId) => set((state) => ({
        devices: state.devices.filter(device => device.id !== deviceId)
      })),
      addDevice: (newDevice) => set((state) => ({
        devices: [newDevice, ...state.devices]
      })),
      
      // Clear all data (useful for logout)
      clearAllData: () => set({
        users: [],
        // REMOVED: sites: [],
        devices: [],
        dashboardData: null,
        notifications: [],
        usersPagination: { page: 0, size: 20, totalElements: 0, totalPages: 0 },
        // REMOVED: sitesPagination
        devicesPagination: { page: 0, size: 20, totalElements: 0, totalPages: 0 }
      })
    }),
    {
      name: 'cms-app-store'
    }
  )
);

// Notification store for toast messages
export const useNotificationStore = create(
  devtools(
    (set) => ({
      notifications: [],
      
      showSuccess: (message, title = 'Success') => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          type: 'success',
          title,
          message,
          timestamp: new Date().toISOString()
        }]
      })),
      
      showError: (message, title = 'Error') => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          type: 'error',
          title,
          message,
          timestamp: new Date().toISOString()
        }]
      })),
      
      showWarning: (message, title = 'Warning') => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          type: 'warning',
          title,
          message,
          timestamp: new Date().toISOString()
        }]
      })),
      
      showInfo: (message, title = 'Info') => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          type: 'info',
          title,
          message,
          timestamp: new Date().toISOString()
        }]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearAll: () => set({ notifications: [] })
    }),
    {
      name: 'cms-notification-store'
    }
  )
);

export default useAppStore;