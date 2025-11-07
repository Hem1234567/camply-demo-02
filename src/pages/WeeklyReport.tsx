import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Flame, TrendingUp, Target } from "lucide-react";
import Layout from "@/components/Layout";

const WeeklyReport = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    entriesThisWeek: 0,
    currentStreak: 0,
    xpEarned: 0,
    goalsCompleted: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyStats();
  }, [user]);

  const fetchWeeklyStats = async () => {
    if (!user) return;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    try {
      const tasksRef = collection(db, 'dailyTasks');
      const tasksQuery = query(
        tasksRef,
        where('userId', '==', user.uid),
        where('completedAt', '>=', weekStart.toISOString())
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const diaryRef = collection(db, 'diaryEntries');
      const diaryQuery = query(
        diaryRef,
        where('userId', '==', user.uid),
        where('date', '>=', weekStart.toISOString().split('T')[0])
      );
      const diarySnapshot = await getDocs(diaryQuery);

      const goalsRef = collection(db, 'weeklyGoals');
      const goalsQuery = query(
        goalsRef,
        where('userId', '==', user.uid),
        where('completed', '==', true),
        where('completedAt', '>=', weekStart.toISOString())
      );
      const goalsSnapshot = await getDocs(goalsQuery);

      const totalEntries = tasksSnapshot.size + diarySnapshot.size;
      const xpFromTasks = tasksSnapshot.docs.reduce((sum, doc) => sum + (doc.data().xpEarned || 0), 0);
      const xpFromDiary = diarySnapshot.size * 10;

      setStats({
        entriesThisWeek: totalEntries,
        currentStreak: 0, // Will be fetched from user doc
        xpEarned: xpFromTasks + xpFromDiary,
        goalsCompleted: goalsSnapshot.size
      });

      const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', user.uid)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setStats(prev => ({ ...prev, currentStreak: userData.currentStreak || 0 }));
      }
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
    } finally {
      setLoading(false);
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Weekly Report</h2>
          <p className="text-muted-foreground">Your Week in Review</p>
          <p className="text-sm text-muted-foreground">See your progress and achievements</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <FileText className="h-8 w-8 text-primary mb-2" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.entriesThisWeek}</p>
              <p className="text-sm text-muted-foreground">Entries This Week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Flame className="h-8 w-8 text-primary mb-2" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.currentStreak}</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.xpEarned}</p>
              <p className="text-sm text-muted-foreground">XP Earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Target className="h-8 w-8 text-primary mb-2" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.goalsCompleted}</p>
              <p className="text-sm text-muted-foreground">Goals Completed</p>
            </CardContent>
          </Card>
        </div>

        {stats.entriesThisWeek === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Keep journaling to see your weekly insights and patterns!
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default WeeklyReport;
