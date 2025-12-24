import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  getTimeUntilReminder,
  NotificationPreferences,
} from "@/services/notificationService";

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | "default";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    error: null,
    preferences: null,
    preferencesLoading: true,
  });

  // Check browser support
  useEffect(() => {
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

  // Load preferences from Firebase
  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, preferences: null, preferencesLoading: false }));
      return;
    }

    const loadPreferences = async () => {
      setState((prev) => ({ ...prev, preferencesLoading: true }));
      try {
        const prefs = await getNotificationPreferences(user.uid);
        setState((prev) => ({ ...prev, preferences: prefs, preferencesLoading: false }));
      } catch (error) {
        console.error("Error loading notification preferences:", error);
        setState((prev) => ({ ...prev, preferencesLoading: false }));
      }
    };

    loadPreferences();
  }, [user]);

  // Schedule reminder based on preferences
  useEffect(() => {
    if (!state.preferences || !state.isSubscribed) return;
    if (!state.preferences.enabled || !state.preferences.dailyReminders) return;

    // Clear existing timeout
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }

    const scheduleNextReminder = () => {
      const delay = getTimeUntilReminder(state.preferences!.reminderTime);
      
      reminderTimeoutRef.current = setTimeout(() => {
        sendNotification("Daily Journaling Reminder", {
          body: "Time to reflect on your day! Open Camply to write your journal entry.",
          tag: "daily-reminder",
          requireInteraction: true,
        });

        // Update last reminder sent time
        if (user) {
          saveNotificationPreferences(user.uid, {
            lastReminderSent: new Date().toISOString(),
          });
        }

        // Schedule next reminder for tomorrow
        scheduleNextReminder();
      }, delay);
    };

    scheduleNextReminder();

    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, [state.preferences, state.isSubscribed, user]);

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
      
      const isGranted = permission === "granted";
      
      setState((prev) => ({
        ...prev,
        permission,
        isSubscribed: isGranted,
        isLoading: false,
        error: permission === "denied" 
          ? "Notification permission was denied. Please enable it in your browser settings." 
          : null,
      }));

      // Save to Firebase if granted
      if (isGranted && user) {
        await saveNotificationPreferences(user.uid, { enabled: true });
        const prefs = await getNotificationPreferences(user.uid);
        setState((prev) => ({ ...prev, preferences: prefs }));
      }

      return isGranted;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to request notification permission",
      }));
      return false;
    }
  }, [state.isSupported, user]);

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

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user) return;

      try {
        await saveNotificationPreferences(user.uid, updates);
        setState((prev) => ({
          ...prev,
          preferences: prev.preferences ? { ...prev.preferences, ...updates } : null,
        }));
      } catch (error) {
        console.error("Error updating notification preferences:", error);
        throw error;
      }
    },
    [user]
  );

  return {
    ...state,
    requestPermission,
    sendNotification,
    sendTestNotification,
    updatePreferences,
  };
}
