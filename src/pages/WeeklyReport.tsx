import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Flame,
  TrendingUp,
  Target,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const WeeklyReport = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    entriesThisWeek: 0,
    currentStreak: 0,
    xpEarned: 0,
    goalsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekRange, setWeekRange] = useState("");

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
    }
  }, [user]);

  const getWeekRange = () => {
    const now = new Date();
    const weekStart = new Date(now);
    // Start from Monday
    weekStart.setDate(
      now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)
    );
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  const fetchWeeklyStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const { weekStart, weekEnd } = getWeekRange();

      setWeekRange(
        `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
      );

      // Convert to Firestore Timestamp for queries
      const weekStartTimestamp = Timestamp.fromDate(weekStart);
      const weekEndTimestamp = Timestamp.fromDate(weekEnd);

      // Format for string date comparison (for diary entries)
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      let tasksCount = 0;
      let diaryCount = 0;
      let xpFromTasks = 0;
      let goalsCount = 0;

      // 1. Fetch daily tasks - handle different date formats
      try {
        const tasksRef = collection(db, "dailyTasks");
        const tasksQuery = query(tasksRef, where("userId", "==", user.uid));
        const tasksSnapshot = await getDocs(tasksQuery);

        tasksSnapshot.forEach((doc) => {
          const data = doc.data();
          const completedAt = data.completedAt;

          // Handle different date formats
          let taskDate: Date | null = null;

          if (completedAt?.toDate) {
            // Firestore Timestamp
            taskDate = completedAt.toDate();
          } else if (completedAt) {
            // ISO string or other date format
            taskDate = new Date(completedAt);
          }

          if (taskDate && !isNaN(taskDate.getTime())) {
            // Check if task is within this week
            if (taskDate >= weekStart && taskDate <= weekEnd) {
              tasksCount++;
              xpFromTasks += data.xpEarned || 0;
            }
          }
        });
      } catch (tasksError) {
        console.error("Error fetching tasks:", tasksError);
      }

      // 2. Fetch diary entries
      try {
        const diaryRef = collection(db, "diaryEntries");
        const diaryQuery = query(diaryRef, where("userId", "==", user.uid));
        const diarySnapshot = await getDocs(diaryQuery);

        diarySnapshot.forEach((doc) => {
          const data = doc.data();
          const entryDate = data.date;

          if (entryDate) {
            // Diary entries use string dates like "2024-01-15"
            if (entryDate >= weekStartStr && entryDate <= weekEndStr) {
              diaryCount++;
            }
          }
        });
      } catch (diaryError) {
        console.error("Error fetching diary entries:", diaryError);
      }

      // 3. Fetch completed goals
      try {
        const goalsRef = collection(db, "weeklyGoals");
        const goalsQuery = query(
          goalsRef,
          where("userId", "==", user.uid),
          where("completed", "==", true)
        );
        const goalsSnapshot = await getDocs(goalsQuery);

        goalsSnapshot.forEach((doc) => {
          const data = doc.data();
          const completedAt = data.completedAt;

          let goalDate: Date | null = null;

          if (completedAt?.toDate) {
            goalDate = completedAt.toDate();
          } else if (completedAt) {
            goalDate = new Date(completedAt);
          }

          if (goalDate && !isNaN(goalDate.getTime())) {
            if (goalDate >= weekStart && goalDate <= weekEnd) {
              goalsCount++;
            }
          }
        });
      } catch (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }

      // 4. Fetch user streak
      let currentStreak = 0;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentStreak = userData.currentStreak || 0;
        }
      } catch (userError) {
        console.error("Error fetching user data:", userError);
      }

      // Calculate totals
      const totalEntries = tasksCount + diaryCount;
      const xpFromDiary = diaryCount * 10; // 10 XP per diary entry
      const totalXP = xpFromTasks + xpFromDiary;

      setStats({
        entriesThisWeek: totalEntries,
        currentStreak: currentStreak,
        xpEarned: totalXP,
        goalsCompleted: goalsCount,
      });
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      setError("Failed to load weekly stats. Please try refreshing the page.");
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
          <div className="flex items-center justify-between">
            <div className="flex-1 text-left">
              <h2 className="text-3xl font-bold">Weekly Report</h2>
              <p className="text-muted-foreground">Your Week in Review</p>
              <p className="text-sm text-muted-foreground">
                {weekRange || "This week"}
              </p>
            </div>
            <Button
              onClick={fetchWeeklyStats}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

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
      </div>
    </Layout>
  );
};

export default WeeklyReport;
