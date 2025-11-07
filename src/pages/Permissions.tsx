import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Bell, Mic, Check } from "lucide-react";
import { toast } from "sonner";

const Permissions = () => {
  const navigate = useNavigate();
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationGranted(permission === "granted");
      if (permission === "granted") {
        toast.success("Notification permission granted");
      }
    }
  };

  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      toast.success("Microphone permission granted");
    } catch (error) {
      toast.error("Microphone permission denied");
    }
  };

  const handleContinue = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Setup Permissions</h2>
          <p className="mt-2 text-muted-foreground">
            We need a few permissions to provide the best experience
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-6 border border-border rounded-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Get reminders for daily tasks
                </p>
              </div>
              {notificationGranted && (
                <Check className="h-6 w-6 text-success" />
              )}
            </div>
            {!notificationGranted && (
              <Button
                className="w-full"
                variant="outline"
                onClick={requestNotificationPermission}
              >
                Enable Notifications
              </Button>
            )}
          </div>

          <div className="p-6 border border-border rounded-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Microphone</h3>
                <p className="text-sm text-muted-foreground">
                  Use voice-to-text for journaling
                </p>
              </div>
              {micGranted && (
                <Check className="h-6 w-6 text-success" />
              )}
            </div>
            {!micGranted && (
              <Button
                className="w-full"
                variant="outline"
                onClick={requestMicPermission}
              >
                Enable Microphone
              </Button>
            )}
          </div>
        </div>

        <Button className="w-full h-12" onClick={handleContinue}>
          Continue to App
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          You can change these permissions later in Settings
        </p>
      </div>
    </div>
  );
};

export default Permissions;
