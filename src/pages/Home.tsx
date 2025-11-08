import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Award, Flame, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";

interface UserData {
  displayName: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  entriesCount: number;
  unlockedBadges: string[];
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const xpForNextLevel = Math.pow(userData?.level || 1, 2) * 100;
  const xpProgress = ((userData?.totalXP || 0) % xpForNextLevel) / xpForNextLevel * 100;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome back, {userData?.displayName || "User"}!
          </h2>
          <p className="text-muted-foreground">Let's continue your growth journey</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Level {userData?.level}</p>
                <p className="text-2xl font-bold">{(userData?.totalXP || 0) % xpForNextLevel} / {xpForNextLevel} XP</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={xpProgress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {xpForNextLevel - ((userData?.totalXP || 0) % xpForNextLevel)} XP to Level {(userData?.level || 1) + 1}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{userData?.entriesCount || 0}</p>
              <p className="text-xs text-muted-foreground">total journals</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{userData?.unlockedBadges.length || 0}</p>
              <p className="text-xs text-muted-foreground">unlocked achievements</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{userData?.currentStreak || 0}</p>
              <p className="text-xs text-muted-foreground">days in a row</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-14 text-lg"
            onClick={() => navigate("/tasks")}
          >
            Today's Tasks
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 text-lg"
            onClick={() => navigate("/weekly-report")}
          >
            View Weekly Report
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
