import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminders: boolean;
  weeklyInsights: boolean;
  reminderTime: string;
  lastReminderSent?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  dailyReminders: true,
  weeklyInsights: false,
  reminderTime: "21:00",
};

// Get notification preferences from Firestore
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, "users", userId, "settings", "notifications");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { ...DEFAULT_PREFERENCES, ...docSnap.data() } as NotificationPreferences;
    }
    
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

// Save notification preferences to Firestore
export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "settings", "notifications");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        ...preferences,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(docRef, {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    throw error;
  }
}

// Check if it's time to send a reminder
export function shouldSendReminder(
  preferences: NotificationPreferences,
  toleranceMinutes: number = 5
): boolean {
  if (!preferences.enabled || !preferences.dailyReminders) {
    return false;
  }

  const now = new Date();
  const [hours, minutes] = preferences.reminderTime.split(":").map(Number);
  
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);

  // Check if we're within the tolerance window
  const diffMs = Math.abs(now.getTime() - reminderTime.getTime());
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes > toleranceMinutes) {
    return false;
  }

  // Check if we already sent a reminder today
  if (preferences.lastReminderSent) {
    const lastSent = new Date(preferences.lastReminderSent);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastSent.setHours(0, 0, 0, 0);
    
    if (lastSent.getTime() === today.getTime()) {
      return false;
    }
  }

  return true;
}

// Calculate ms until next reminder
export function getTimeUntilReminder(reminderTime: string): number {
  const [hours, minutes] = reminderTime.split(":").map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled.getTime() - now.getTime();
}

// Format time for display
export function formatReminderTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
