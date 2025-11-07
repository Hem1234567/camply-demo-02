import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Settings as SettingsIcon, LogOut } from "lucide-react";
import { BADGES } from "@/utils/gamification";
import Layout from "@/components/Layout";
import { xpForNextLevel } from "@/utils/gamification";

interface UserData {
  displayName: string;
  photoURL: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  entriesCount: number;
  unlockedBadges: string[];
  createdAt: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      setUserData(userDoc.data() as UserData);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/welcome");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const xpNeeded = userData ? xpForNextLevel(userData.level) : 100;
  const currentLevelXP = userData ? userData.totalXP % xpNeeded : 0;
  const xpProgress = (currentLevelXP / xpNeeded) * 100;
  
  const memberDays = userData?.createdAt 
    ? Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userData?.photoURL} />
                <AvatarFallback className="text-2xl">
                  {userData?.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-2xl font-bold">{userData?.displayName}</h2>
                <p className="text-muted-foreground">Level {userData?.level}</p>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentLevelXP} XP</span>
                  <span>{xpNeeded} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{userData?.currentStreak || 0}</p>
              <p className="text-sm text-muted-foreground">days in a row</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{userData?.entriesCount || 0}</p>
              <p className="text-sm text-muted-foreground">total journals</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xl font-semibold">{memberDays} days</p>
            <p className="text-sm text-muted-foreground">Member</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {BADGES.map((badge) => {
                const isUnlocked = userData?.unlockedBadges?.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-lg border ${
                      isUnlocked ? 'bg-primary/10 border-primary' : 'bg-muted/50 opacity-50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <h3 className="font-semibold text-sm">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/settings")}
          >
            <SettingsIcon className="mr-2 h-5 w-5" />
            Settings
          </Button>
          
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
