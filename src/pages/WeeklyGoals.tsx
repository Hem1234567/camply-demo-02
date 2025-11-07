import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { awardXP, checkAndAwardBadge } from "@/utils/gamification";

interface Goal {
  id: string;
  goalId: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

const WeeklyGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    const goalsRef = collection(db, 'weeklyGoals');
    const q = query(goalsRef, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    
    const goalsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Goal[];
    
    setGoals(goalsData.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setLoading(false);
  };

  const addGoal = async () => {
    if (!user || !newGoal.trim()) return;

    try {
      await addDoc(collection(db, 'weeklyGoals'), {
        goalId: `goal_${Date.now()}`,
        userId: user.uid,
        text: newGoal,
        completed: false,
        createdAt: new Date().toISOString()
      });

      setNewGoal("");
      toast.success("Goal added!");
      fetchGoals();
    } catch (error) {
      console.error("Error adding goal:", error);
      toast.error("Failed to add goal");
    }
  };

  const toggleGoal = async (goal: Goal) => {
    if (!user) return;

    try {
      const goalRef = doc(db, 'weeklyGoals', goal.id);
      const newCompleted = !goal.completed;
      
      await updateDoc(goalRef, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null
      });

      if (newCompleted) {
        await awardXP(user.uid, 30);
        
        const completedCount = goals.filter(g => g.completed).length + 1;
        if (completedCount >= 3) {
          await checkAndAwardBadge(user.uid, 'goal_crusher');
        }
        
        toast.success("Goal completed! +30 XP");
      }

      fetchGoals();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await deleteDoc(doc(db, 'weeklyGoals', goalId));
      toast.success("Goal deleted");
      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
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

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Weekly Goals</h2>
          <p className="text-muted-foreground">Set and track your personal goals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold">{completedGoals.length}</p>
              <p className="text-muted-foreground">Goals Completed This Week</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Enter your goal..."
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              />
              <Button onClick={addGoal} disabled={!newGoal.trim()}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>💡 Set specific and achievable goals</p>
              <p>🏆 Complete goals to earn 30 XP each</p>
              <p>⭐ Track your progress and build consistency</p>
            </div>
          </CardContent>
        </Card>

        {activeGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Checkbox
                    checked={goal.completed}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <p className="flex-1">{goal.text}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {completedGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <Checkbox checked={true} disabled />
                  <p className="flex-1 line-through text-muted-foreground">{goal.text}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {goals.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No goals yet. Set your first goal to get started!
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WeeklyGoals;
