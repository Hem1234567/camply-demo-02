import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, Moon, Bell, Mic, Shield, Database, HelpCircle, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const settings = [
    {
      title: "Preferences",
      items: [
        {
          icon: Moon,
          label: "Dark Mode",
          description: "Switch between light and dark themes",
          type: "toggle",
          value: theme === "dark",
          onChange: toggleTheme
        },
        {
          icon: Bell,
          label: "Notifications",
          description: "Daily reminders for journaling",
          type: "navigation",
          path: "/settings/notifications"
        },
        {
          icon: Mic,
          label: "Voice Recognition",
          description: "Microphone and speech-to-text settings",
          type: "navigation",
          path: "/settings/voice"
        }
      ]
    },
    {
      title: "Privacy & Security",
      items: [
        {
          icon: Shield,
          label: "Privacy Settings",
          description: "Control your data sharing preferences",
          type: "navigation",
          path: "/settings/privacy"
        },
        {
          icon: Database,
          label: "Data & Storage",
          description: "Manage app data and cache (10 MB used)",
          type: "navigation",
          path: "/settings/data"
        }
      ]
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Help & Support",
          description: "Get help and contact us at support@camply.app",
          type: "navigation",
          path: "/settings/help"
        },
        {
          icon: Info,
          label: "About Camply",
          description: "Version 1.0.0 - Your personal growth companion",
          type: "navigation",
          path: "/settings/about"
        }
      ]
    }
  ];

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
                    item.type === "navigation" ? "cursor-pointer" : ""
                  }`}
                  onClick={() => item.type === "navigation" && item.path && navigate(item.path)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
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
      </div>
    </Layout>
  );
};

export default Settings;
