import { useState, useEffect, useCallback } from "react";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Check if push notifications are supported
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    
    if (isSupported) {
      setState((prev) => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
        isSubscribed: Notification.permission === "granted",
      }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Push notifications are not supported in this browser",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      
      setState((prev) => ({
        ...prev,
        permission,
        isSubscribed: permission === "granted",
        isLoading: false,
        error: permission === "denied" 
          ? "Notification permission was denied. Please enable it in your browser settings." 
          : null,
      }));

      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to request notification permission",
      }));
      return false;
    }
  }, [state.isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!state.isSupported || state.permission !== "granted") {
        console.warn("Cannot send notification: permission not granted");
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: "/journal-logo-removebg-preview.png",
          badge: "/journal-logo-removebg-preview.png",
          ...options,
        });

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [state.isSupported, state.permission]
  );

  const sendTestNotification = useCallback(() => {
    return sendNotification("Camply Notification", {
      body: "Your push notifications are working! Time to journal.",
      tag: "test-notification",
    });
  }, [sendNotification]);

  const scheduleReminder = useCallback(
    (time: string, message: string) => {
      if (!state.isSubscribed) {
        console.warn("Cannot schedule reminder: not subscribed");
        return null;
      }

      // Parse the time (HH:MM format)
      const [hours, minutes] = time.split(":").map(Number);
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const delay = scheduledTime.getTime() - now.getTime();

      // Store the timeout ID so it can be cleared if needed
      const timeoutId = setTimeout(() => {
        sendNotification("Daily Reminder", {
          body: message,
          tag: "daily-reminder",
        });
      }, delay);

      return timeoutId;
    },
    [state.isSubscribed, sendNotification]
  );

  return {
    ...state,
    requestPermission,
    sendNotification,
    sendTestNotification,
    scheduleReminder,
  };
}
