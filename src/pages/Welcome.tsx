import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Target, TrendingUp, Award } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-primary p-6 text-white">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Camply</h1>
          <p className="text-lg text-white/90">Your Personal Growth Companion</p>
        </div>

        <div className="space-y-6 py-8">
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur">
            <Sparkles className="h-8 w-8" />
            <div className="text-left">
              <h3 className="font-semibold">Daily Reflections</h3>
              <p className="text-sm text-white/80">Guided journaling for mindfulness</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur">
            <Target className="h-8 w-8" />
            <div className="text-left">
              <h3 className="font-semibold">Weekly Goals</h3>
              <p className="text-sm text-white/80">Track your progress and achievements</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur">
            <TrendingUp className="h-8 w-8" />
            <div className="text-left">
              <h3 className="font-semibold">Level Up</h3>
              <p className="text-sm text-white/80">Earn XP and unlock badges</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur">
            <Award className="h-8 w-8" />
            <div className="text-left">
              <h3 className="font-semibold">Compete & Grow</h3>
              <p className="text-sm text-white/80">Join the leaderboard</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-12 text-lg font-semibold bg-white text-primary hover:bg-white/90"
            onClick={() => navigate('/signup')}
          >
            Get Started
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 text-lg text-white hover:bg-white/10"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
