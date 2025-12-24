import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  Moon,
  Bell,
  BellRing,
  Mic,
  MicOff,
  Shield,
  Database,
  HelpCircle,
  Info,
  Volume2,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Lock,
  Eye,
  Send,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// Type definitions
interface SettingItem {
  id: string;
  icon: any;
  label: string;
  description: string;
  type: "toggle" | "navigation";
  value?: boolean;
  onChange?: (value: boolean) => void;
}

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [weeklyInsightsEnabled, setWeeklyInsightsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("21:00");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState("standard");
  const [cacheSize, setCacheSize] = useState("10 MB");
  const [autoPunctuation, setAutoPunctuation] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [privacyPolicyLoading, setPrivacyPolicyLoading] = useState(false);
  const [reAcceptChecked, setReAcceptChecked] = useState(false);

  // Push notifications hook
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    preferences: notificationPrefs,
    preferencesLoading: notificationPrefsLoading,
    requestPermission: requestPushPermission,
    sendTestNotification,
    updatePreferences: updateNotificationPrefs,
  } = usePushNotifications();

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Check if Speech Recognition is supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = selectedLanguage;

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setTranscript("");
        };

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript((prev) => prev + finalTranscript + " ");
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setPermissionGranted(false);
            setPermissionError(
              "Microphone access was denied. Please allow microphone permission in your browser settings."
            );
          } else if (event.error === "audio-capture") {
            setPermissionError(
              "No microphone found. Please check your audio input devices."
            );
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      setPermissionError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setPermissionGranted(true);
      mediaStreamRef.current = stream;

      // Initialize speech recognition after permission is granted
      initializeSpeechRecognition();

      return true;
    } catch (error: any) {
      console.error("Microphone permission denied:", error);
      setPermissionGranted(false);

      if (error.name === "NotAllowedError") {
        setPermissionError(
          "Microphone permission was denied. Please allow microphone access in your browser settings and try again."
        );
      } else if (error.name === "NotFoundError") {
        setPermissionError(
          "No microphone found. Please check if your microphone is connected and try again."
        );
      } else {
        setPermissionError(
          "Unable to access microphone. Please check your browser permissions and try again."
        );
      }

      return false;
    }
  };

  // Handle voice recognition toggle
  const handleVoiceToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestMicrophonePermission();
      if (granted) {
        setVoiceEnabled(true);
      } else {
        setVoiceEnabled(false);
      }
    } else {
      setVoiceEnabled(false);
      if (isListening) {
        stopListening();
      }
      // Stop media stream when disabling voice
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  // Start listening
  const startListening = async () => {
    if (!voiceEnabled || !permissionGranted) {
      await handleVoiceToggle(true);
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        setTranscript("");
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        // Reinitialize if there's an error
        initializeSpeechRecognition();
        recognitionRef.current.start();
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
    setIsListening(false);
  };

  // Test microphone function
  const testMicrophone = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    if (!voiceEnabled) {
      const granted = await requestMicrophonePermission();
      if (granted) {
        setVoiceEnabled(true);
        setTimeout(() => startListening(), 500);
      }
      return;
    }

    if (!permissionGranted) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    startListening();
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript("");
  };

  const settings: SettingsSection[] = [
    {
      title: "Preferences",
      items: [
        {
          id: "dark-mode",
          icon: Moon,
          label: "Dark Mode",
          description: "Switch between light and dark themes",
          type: "toggle",
          value: theme === "dark",
          onChange: toggleTheme,
        },
        {
          id: "notifications",
          icon: pushSubscribed ? BellRing : Bell,
          label: "Push Notifications",
          description: pushSubscribed 
            ? "Notifications enabled" 
            : "Enable push notifications for reminders",
          type: "navigation",
        },
        {
          id: "voice",
          icon: voiceEnabled && permissionGranted ? Volume2 : Mic,
          label: "Voice Recognition",
          description: voiceEnabled
            ? permissionGranted
              ? "Microphone enabled - Ready to use"
              : "Microphone permission required"
            : "Enable voice-to-text for journaling",
          type: "navigation",
        },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        {
          id: "privacy-policy",
          icon: FileText,
          label: "Privacy Policy",
          description: "View and manage your privacy policy consent",
          type: "navigation",
        },
        {
          id: "privacy",
          icon: Shield,
          label: "Privacy Settings",
          description: "Control your data sharing preferences",
          type: "navigation",
        },
        {
          id: "data",
          icon: Database,
          label: "Data & Storage",
          description: `Manage app data and cache (${cacheSize} used)`,
          type: "navigation",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          id: "help",
          icon: HelpCircle,
          label: "Help & Support",
          description: "Get help and contact us at support@camply.app",
          type: "navigation",
        },
        {
          id: "about",
          icon: Info,
          label: "About Camply",
          description: "Version 1.0.0 - Your personal growth companion",
          type: "navigation",
        },
      ],
    },
  ];

  const handleItemClick = (item: SettingItem) => {
    if (item.type === "navigation") {
      setActiveModal(item.id);
      // Reset re-accept checkbox when opening privacy policy modal
      if (item.id === "privacy-policy") {
        setReAcceptChecked(false);
        // Load current privacy policy status
        loadPrivacyPolicyStatus();
      }
    }
  };

  const loadPrivacyPolicyStatus = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      setPrivacyPolicyAccepted(userData?.hasAcceptedPrivacyPolicy === true);
    } catch (error) {
      console.error("Error loading privacy policy status:", error);
    }
  };

  const handleReAcceptPrivacyPolicy = async () => {
    if (!user) return;
    if (!reAcceptChecked) {
      toast.error("Please check the box to confirm acceptance");
      return;
    }

    setPrivacyPolicyLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
      });
      setPrivacyPolicyAccepted(true);
      toast.success("Privacy policy accepted successfully");
      closeModal();
    } catch (error) {
      console.error("Error accepting privacy policy:", error);
      toast.error("Failed to update. Please try again.");
    } finally {
      setPrivacyPolicyLoading(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    if (isListening) {
      stopListening();
    }
    setPermissionError("");
    setReAcceptChecked(false);
  };

  const clearCache = () => {
    setCacheSize("0 MB");
    // Add your actual cache clearing logic here
    console.log("Cache cleared");
    // You might want to add a confirmation toast here
  };

  // Modal content configurations
  const modalConfigs = {
    notifications: {
      title: "Push Notification Settings",
      content: (
        <div className="space-y-4">
          {/* Browser Support Check */}
          {!pushSupported && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Browser Not Supported
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Push notifications are not supported in your browser. Try using Chrome, Edge, or Safari.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission Status */}
          {pushSupported && (
            <div
              className={`p-3 rounded-lg ${
                pushSubscribed
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : pushPermission === "denied"
                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  : "bg-muted border border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                {pushSubscribed ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : pushPermission === "denied" ? (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                )}
                <p
                  className={`text-sm font-medium ${
                    pushSubscribed
                      ? "text-green-800 dark:text-green-300"
                      : pushPermission === "denied"
                      ? "text-red-800 dark:text-red-300"
                      : "text-foreground"
                  }`}
                >
                  {pushSubscribed
                    ? "Notifications enabled"
                    : pushPermission === "denied"
                    ? "Notifications blocked"
                    : "Notifications not enabled"}
                </p>
              </div>
              {pushPermission === "denied" && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  Please enable notifications in your browser settings.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {pushError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{pushError}</p>
              </div>
            </div>
          )}

          {/* Enable Button */}
          {pushSupported && !pushSubscribed && pushPermission !== "denied" && (
            <Button
              onClick={async () => {
                const granted = await requestPushPermission();
                if (granted) {
                  toast.success("Push notifications enabled!");
                }
              }}
              disabled={pushLoading}
              className="w-full"
            >
              {pushLoading ? (
                "Requesting permission..."
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          )}

          {/* Settings when enabled */}
          {pushSubscribed && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Receive daily journaling reminders
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.dailyReminders ?? true}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateNotificationPrefs({ dailyReminders: checked });
                      toast.success(checked ? "Daily reminders enabled" : "Daily reminders disabled");
                    } catch {
                      toast.error("Failed to update preferences");
                    }
                  }}
                  disabled={notificationPrefsLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Insights</p>
                  <p className="text-sm text-muted-foreground">
                    Get weekly progress reports
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs?.weeklyInsights ?? false}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateNotificationPrefs({ weeklyInsights: checked });
                      toast.success(checked ? "Weekly insights enabled" : "Weekly insights disabled");
                    } catch {
                      toast.error("Failed to update preferences");
                    }
                  }}
                  disabled={notificationPrefsLoading}
                />
              </div>
              <div className="pt-2">
                <p className="font-medium mb-2">Reminder Time</p>
                <input
                  type="time"
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  value={notificationPrefs?.reminderTime ?? "21:00"}
                  onChange={async (e) => {
                    try {
                      await updateNotificationPrefs({ reminderTime: e.target.value });
                      toast.success("Reminder time updated");
                    } catch {
                      toast.error("Failed to update reminder time");
                    }
                  }}
                  disabled={notificationPrefsLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {notificationPrefs?.dailyReminders 
                    ? "You'll receive a reminder at this time daily while the app is open"
                    : "Enable daily reminders to receive notifications"}
                </p>
              </div>

              {/* Test Notification Button */}
              <Button
                variant="outline"
                onClick={() => {
                  const notification = sendTestNotification();
                  if (notification) {
                    toast.success("Test notification sent!");
                  } else {
                    toast.error("Failed to send notification");
                  }
                }}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </>
          )}
        </div>
      ),
    },
    voice: {
      title: "Voice Recognition Settings",
      content: (
        <div className="space-y-6">
          {/* Browser Support Check */}
          {!isSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Browser Not Supported
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Voice recognition is not supported in your browser. Try
                    using Chrome, Edge, or Safari for the best experience.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Voice Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Voice Recognition</p>
              <p className="text-sm text-muted-foreground">
                {voiceEnabled
                  ? "Microphone access enabled"
                  : "Enable voice-to-text for journaling"}
              </p>
            </div>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={handleVoiceToggle}
              disabled={!isSupported}
            />
          </div>

          {/* Permission Status */}
          {voiceEnabled && (
            <div
              className={`p-3 rounded-lg ${
                permissionGranted
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {permissionGranted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <MicOff className="h-4 w-4 text-red-600" />
                )}
                <p
                  className={`text-sm font-medium ${
                    permissionGranted ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {permissionGranted
                    ? "Microphone permission granted"
                    : "Microphone permission required"}
                </p>
              </div>
              {!permissionGranted && (
                <p className="text-sm text-red-700 mt-1">
                  Please enable microphone access in your browser settings to
                  use voice features.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {permissionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{permissionError}</p>
              </div>
            </div>
          )}

          {/* Additional Settings - Only show when voice is enabled */}
          {voiceEnabled && isSupported && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-punctuation</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically add punctuation to transcribed text
                  </p>
                </div>
                <Switch
                  checked={autoPunctuation}
                  onCheckedChange={setAutoPunctuation}
                />
              </div>

              <div className="space-y-2">
                <p className="font-medium">Recognition Language</p>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="fr-FR">French (France)</option>
                  <option value="de-DE">German (Germany)</option>
                  <option value="it-IT">Italian (Italy)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select the language you'll be speaking for better accuracy
                </p>
              </div>

              {/* Microphone Test Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">Test Microphone</p>
                  {transcript && (
                    <Button
                      onClick={clearTranscript}
                      variant="ghost"
                      size="sm"
                      className="h-8"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={testMicrophone}
                    variant={isListening ? "destructive" : "default"}
                    className="w-full"
                    disabled={!permissionGranted && voiceEnabled}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Start Listening Test
                      </>
                    )}
                  </Button>

                  {isListening && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-800">
                          Listening... Speak now
                        </p>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"
                              style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: "0.6s",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-blue-700">
                        Speak clearly into your microphone. Click "Stop
                        Listening" when finished.
                      </p>
                    </div>
                  )}

                  {transcript && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">
                        Transcribed Text:
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {transcript}
                      </p>
                    </div>
                  )}

                  {voiceEnabled && !permissionGranted && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        Microphone Access Required
                      </p>
                      <p className="text-sm text-amber-700 mb-3">
                        To test voice recognition, please allow microphone
                        access in your browser settings.
                      </p>
                      <Button
                        onClick={() => requestMicrophonePermission()}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Grant Microphone Permission
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Tips for Better Recognition:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Speak clearly and at a moderate pace</li>
                  <li>• Reduce background noise when possible</li>
                  <li>• Use a good quality microphone</li>
                  <li>• Keep the microphone close to your mouth</li>
                </ul>
              </div>
            </>
          )}

          {/* Instructions when voice is disabled */}
          {!voiceEnabled && isSupported && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Enable Voice Features
              </p>
              <p className="text-sm text-blue-700">
                Turn on voice recognition to use speech-to-text for your journal
                entries. You'll need to allow microphone access when prompted.
                This feature works best in quiet environments with a clear
                microphone.
              </p>
            </div>
          )}
        </div>
      ),
    },
    privacy: {
      title: "Privacy Settings",
      content: (
        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2">Data Collection Level</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value="minimal"
                  checked={privacyLevel === "minimal"}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  className="text-primary"
                />
                <div>
                  <span className="font-medium">Minimal</span>
                  <p className="text-sm text-muted-foreground">
                    Essential data only for app functionality
                  </p>
                </div>
              </label>
              <label className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value="standard"
                  checked={privacyLevel === "standard"}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  className="text-primary"
                />
                <div>
                  <span className="font-medium">Standard</span>
                  <p className="text-sm text-muted-foreground">
                    Collect data to improve app experience
                  </p>
                </div>
              </label>
              <label className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value="analytics"
                  checked={privacyLevel === "analytics"}
                  onChange={(e) => setPrivacyLevel(e.target.value)}
                  className="text-primary"
                />
                <div>
                  <span className="font-medium">Analytics</span>
                  <p className="text-sm text-muted-foreground">
                    Help improve Camply with usage data
                  </p>
                </div>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Anonymous Usage Data</p>
              <p className="text-sm text-muted-foreground">
                Share anonymous usage statistics
              </p>
            </div>
            <Switch checked={privacyLevel !== "minimal"} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Personalized Tips</p>
              <p className="text-sm text-muted-foreground">
                Receive personalized recommendations
              </p>
            </div>
            <Switch checked={privacyLevel === "analytics"} />
          </div>
        </div>
      ),
    },
    data: {
      title: "Data & Storage Management",
      content: (
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">Storage Usage</p>
              <p className="text-sm font-mono">{cacheSize}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: cacheSize === "0 MB" ? "0%" : "45%" }}
              ></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">Journal Entries</p>
                <p className="text-sm text-muted-foreground">
                  Your personal journal data
                </p>
              </div>
              <p className="text-sm font-mono">8.2 MB</p>
            </div>

            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium">Cache Files</p>
                <p className="text-sm text-muted-foreground">
                  Temporary app data
                </p>
              </div>
              <p className="text-sm font-mono">1.8 MB</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={clearCache} variant="outline" className="w-full">
              Clear Cache
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This will free up storage but won't delete your journal entries
            </p>
          </div>

          <div className="text-center pt-2">
            <Button variant="link" className="text-primary">
              Export My Data
            </Button>
          </div>
        </div>
      ),
    },
    help: {
      title: "Help & Support",
      content: (
        <div className="space-y-4">
          <div className="bg-primary/10 p-4 rounded-lg text-center">
            <HelpCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="font-medium">We're here to help!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact our support team for any questions or issues
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">
                support@camply.app
              </p>
            </div>

            <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">FAQ & Guides</p>
              <p className="text-sm text-muted-foreground">
                Visit help.camply.app for documentation
              </p>
            </div>

            <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <p className="font-medium">Community Forum</p>
              <p className="text-sm text-muted-foreground">
                Join our user community for tips
              </p>
            </div>
          </div>

          <Button className="w-full">Contact Support</Button>
        </div>
      ),
    },
    about: {
      title: "About Camply",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-2 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <p className="font-medium">Camply</p>
            <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Your personal growth companion for daily journaling and
              reflection.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 border rounded-lg">
              <Mic className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Voice Journaling</p>
            </div>
            <div className="p-2 border rounded-lg">
              <Shield className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Privacy Focused</p>
            </div>
            <div className="p-2 border rounded-lg">
              <Bell className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Daily Reminders</p>
            </div>
            <div className="p-2 border rounded-lg">
              <Database className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Progress Tracking</p>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground border-t pt-3">
            <p>© 2024 Camply. All rights reserved.</p>
          </div>
        </div>
      ),
    },
    "privacy-policy": {
      title: "Privacy Policy",
      content: (
        <div className="space-y-4">
          {privacyPolicyAccepted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">You have accepted the privacy policy</p>
            </div>
          )}

          <ScrollArea className="h-64 rounded-md border p-4">
            <div className="space-y-6 text-sm text-muted-foreground">
              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  1. Introduction
                </h3>
                <p>
                  Welcome to Camply. We are committed to protecting your personal information 
                  and your right to privacy. This Privacy Policy explains how we collect, use, 
                  disclose, and safeguard your information when you use our application.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4" />
                  2. Information We Collect
                </h3>
                <p className="mb-2">We collect information that you provide directly to us:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Account information (name, email address)</li>
                  <li>Profile information (profile picture)</li>
                  <li>Journal entries and personal reflections</li>
                  <li>Goals and progress tracking data</li>
                  <li>Usage data and app interactions</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4" />
                  3. How We Use Your Information
                </h3>
                <p className="mb-2">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Track your personal growth journey</li>
                  <li>Send you notifications and updates</li>
                  <li>Personalize your experience</li>
                  <li>Ensure the security of your account</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">4. Data Security</h3>
                <p>
                  We implement appropriate technical and organizational measures to protect 
                  your personal information. Your journal entries and personal data are 
                  encrypted and stored securely. We do not sell your personal information 
                  to third parties.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">5. Your Rights</h3>
                <p className="mb-2">You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">6. Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us 
                  through the app settings or email support.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-2">7. Updates to This Policy</h3>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you 
                  of any changes by posting the new Privacy Policy on this page and updating 
                  the "Last Updated" date.
                </p>
                <p className="mt-2 text-xs">Last Updated: December 2024</p>
              </section>
            </div>
          </ScrollArea>

          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox 
              id="re-accept" 
              checked={reAcceptChecked} 
              onCheckedChange={(checked) => setReAcceptChecked(checked === true)}
            />
            <label 
              htmlFor="re-accept" 
              className="text-sm font-medium cursor-pointer leading-relaxed"
            >
              I have read and agree to the Privacy Policy and Terms of Service
            </label>
          </div>

          <Button
            className="w-full"
            onClick={handleReAcceptPrivacyPolicy}
            disabled={!reAcceptChecked || privacyPolicyLoading}
          >
            {privacyPolicyLoading ? "Saving..." : privacyPolicyAccepted ? "Re-accept Privacy Policy" : "Accept Privacy Policy"}
          </Button>
        </div>
      ),
    },
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        {settings.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between ${
                    item.type === "navigation"
                      ? "cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                      : ""
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        item.id === "voice" && voiceEnabled && permissionGranted
                          ? "bg-green-100 text-green-600"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {item.type === "toggle" && (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  )}

                  {item.type === "navigation" && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Modal for settings */}
        <Dialog
          open={!!activeModal}
          onOpenChange={(open) => !open && closeModal()}
        >
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {activeModal === "voice" && <Mic className="h-5 w-5" />}
                {activeModal === "notifications" && (
                  <Bell className="h-5 w-5" />
                )}
                {activeModal === "privacy-policy" && <FileText className="h-5 w-5" />}
                {activeModal === "privacy" && <Shield className="h-5 w-5" />}
                {activeModal === "data" && <Database className="h-5 w-5" />}
                {activeModal === "help" && <HelpCircle className="h-5 w-5" />}
                {activeModal === "about" && <Info className="h-5 w-5" />}
                {activeModal &&
                  modalConfigs[activeModal as keyof typeof modalConfigs]?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] pr-2">
              {activeModal &&
                modalConfigs[activeModal as keyof typeof modalConfigs]?.content}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Settings;
