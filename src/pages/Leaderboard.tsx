import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import Layout from "@/components/Layout";

interface LeaderboardUser {
  userId: string;
  displayName: string;
  photoURL: string;
  totalXP: number;
  level: number;
  currentStreak: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = collection(db, "users");

    // Simplified query - remove the email filter and email ordering
    const q = query(usersRef, orderBy("totalXP", "desc"), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => {
          const data = doc.data() as LeaderboardUser;
          return {
            ...data,
            userId: doc.id, // Ensure userId is set from document ID
          };
        });
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leaderboard:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const topThree = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Leaderboard</h2>

        {topThree.length > 0 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {topThree[1] && (
              <div className="flex flex-col items-center">
                <Medal className="h-8 w-8 text-gray-400 mb-2" />
                <Avatar className="h-16 w-16 mb-2 ring-4 ring-gray-400">
                  <AvatarImage src={topThree[1].photoURL} />
                  <AvatarFallback>
                    {topThree[1].displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">
                  {topThree[1].displayName || "Unknown User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Level {topThree[1].level}
                </p>
                <p className="text-xs font-bold text-primary">
                  {topThree[1].totalXP} XP
                </p>
              </div>
            )}

            {topThree[0] && (
              <div className="flex flex-col items-center -mt-6">
                <Trophy className="h-10 w-10 text-yellow-500 mb-2" />
                <Avatar className="h-20 w-20 mb-2 ring-4 ring-yellow-500">
                  <AvatarImage src={topThree[0].photoURL} />
                  <AvatarFallback>
                    {topThree[0].displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-base">
                  {topThree[0].displayName || "Unknown User"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Level {topThree[0].level}
                </p>
                <p className="text-sm font-bold text-primary">
                  {topThree[0].totalXP} XP
                </p>
              </div>
            )}

            {topThree[2] && (
              <div className="flex flex-col items-center">
                <Award className="h-8 w-8 text-amber-600 mb-2" />
                <Avatar className="h-16 w-16 mb-2 ring-4 ring-amber-600">
                  <AvatarImage src={topThree[2].photoURL} />
                  <AvatarFallback>
                    {topThree[2].displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">
                  {topThree[2].displayName || "Unknown User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Level {topThree[2].level}
                </p>
                <p className="text-xs font-bold text-primary">
                  {topThree[2].totalXP} XP
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {rest.map((userData, index) => (
            <Card
              key={userData.userId}
              className={
                userData.userId === user?.uid ? "ring-2 ring-primary" : ""
              }
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted-foreground w-8">
                    #{index + 4}
                  </span>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userData.photoURL} />
                    <AvatarFallback>
                      {userData.displayName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {userData.displayName || "Unknown User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {userData.level}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {userData.totalXP} XP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userData.currentStreak} 🔥
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No users on the leaderboard yet. Be the first!
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Leaderboard;
