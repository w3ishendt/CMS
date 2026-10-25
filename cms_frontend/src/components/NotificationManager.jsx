import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useNotificationStore } from '../stores/useAppStore';

const NotificationManager = () => {
  const { notifications, removeNotification } = useNotificationStore();

  useEffect(() => {
    // Process new notifications
    notifications.forEach(notification => {
      const { id, type, title, message } = notification;
      
      // Show toast based on type
      switch (type) {
        case 'success':
          toast.success(message, {
            description: title !== 'Success' ? title : undefined,
            id: id.toString(),
            onDismiss: () => removeNotification(id)
          });
          break;
        case 'error':
          toast.error(message, {
            description: title !== 'Error' ? title : undefined,
            id: id.toString(),
            onDismiss: () => removeNotification(id)
          });
          break;
        case 'warning':
          toast.warning(message, {
            description: title !== 'Warning' ? title : undefined,
            id: id.toString(),
            onDismiss: () => removeNotification(id)
          });
          break;
        case 'info':
          toast.info(message, {
            description: title !== 'Info' ? title : undefined,
            id: id.toString(),
            onDismiss: () => removeNotification(id)
          });
          break;
        default:
          toast(message, {
            description: title,
            id: id.toString(),
            onDismiss: () => removeNotification(id)
          });
      }
      
      // Remove notification from store after showing toast
      removeNotification(id);
    });
  }, [notifications, removeNotification]);

  return null; // This component doesn't render anything
};

export default NotificationManager;