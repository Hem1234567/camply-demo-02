import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Scheduled function that runs every minute to check for users
 * who need to receive their daily reminder notification
 */
export const sendScheduledReminders = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log(`Checking for reminders at ${currentTime}`);

    try {
      // Get all users
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        try {
          // Get user's notification preferences
          const prefsDoc = await db
            .collection("users")
            .doc(userId)
            .collection("settings")
            .doc("notifications")
            .get();

          if (!prefsDoc.exists) {
            continue;
          }

          const prefs = prefsDoc.data();

          // Check if notifications are enabled and it's the right time
          if (!prefs?.enabled || !prefs?.dailyReminders) {
            continue;
          }

          const reminderTime = prefs.reminderTime || "20:00";

          // Check if current time matches reminder time (within the same minute)
          if (reminderTime !== currentTime) {
            continue;
          }

          // Check if we already sent a reminder today
          const lastSent = prefs.lastReminderSent;
          if (lastSent) {
            const lastSentDate = new Date(lastSent);
            if (lastSentDate.toDateString() === now.toDateString()) {
              console.log(`Already sent reminder to user ${userId} today`);
              continue;
            }
          }

          // Get user's FCM tokens
          const tokensSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("fcmTokens")
            .get();

          if (tokensSnapshot.empty) {
            console.log(`No FCM tokens for user ${userId}`);
            continue;
          }

          const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
          const validTokens = tokens.filter((t): t is string => !!t);

          if (validTokens.length === 0) {
            continue;
          }

          // Send notification to all user's devices
          const message: admin.messaging.MulticastMessage = {
            notification: {
              title: "Daily Journaling Reminder 📝",
              body: "Time to reflect on your day! Open Camply to write your journal entry.",
            },
            data: {
              type: "daily_reminder",
              timestamp: now.toISOString(),
            },
            tokens: validTokens,
          };

          const response = await messaging.sendEachForMulticast(message);

          console.log(
            `Sent reminder to user ${userId}: ${response.successCount} success, ${response.failureCount} failures`
          );

          // Remove invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const error = resp.error;
                if (
                  error?.code === "messaging/invalid-registration-token" ||
                  error?.code === "messaging/registration-token-not-registered"
                ) {
                  invalidTokens.push(validTokens[idx]);
                }
              }
            });

            // Delete invalid tokens
            for (const token of invalidTokens) {
              const tokenDoc = tokensSnapshot.docs.find(
                (d) => d.data().token === token
              );
              if (tokenDoc) {
                await tokenDoc.ref.delete();
                console.log(`Deleted invalid token for user ${userId}`);
              }
            }
          }

          // Update last reminder sent time
          await db
            .collection("users")
            .doc(userId)
            .collection("settings")
            .doc("notifications")
            .update({
              lastReminderSent: now.toISOString(),
            });
        } catch (userError) {
          console.error(`Error processing user ${userId}:`, userError);
        }
      }

      console.log("Reminder check completed");
      return null;
    } catch (error) {
      console.error("Error in sendScheduledReminders:", error);
      throw error;
    }
  });

/**
 * HTTP endpoint to manually trigger a test notification for a user
 */
export const sendTestNotification = functions.https.onRequest(
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      const {userId} = req.body;

      if (!userId) {
        res.status(400).send({error: "userId is required"});
        return;
      }

      // Get user's FCM tokens
      const tokensSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("fcmTokens")
        .get();

      if (tokensSnapshot.empty) {
        res.status(404).send({error: "No FCM tokens found for user"});
        return;
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
      const validTokens = tokens.filter((t): t is string => !!t);

      if (validTokens.length === 0) {
        res.status(404).send({error: "No valid FCM tokens found"});
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: "Test Notification 🎉",
          body: "Your push notifications are working correctly!",
        },
        data: {
          type: "test",
          timestamp: new Date().toISOString(),
        },
        tokens: validTokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      res.status(200).send({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).send({error: "Failed to send notification"});
    }
  }
);
