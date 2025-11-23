import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Award, TrendingUp } from "lucide-react";

interface OnboardingCelebrationProps {
  name: string;
  totalXP: number;
  badge: {
    icon: string;
    name: string;
    description: string;
  };
  onContinue: () => void;
}

const OnboardingCelebration = ({ name, totalXP, badge, onContinue }: OnboardingCelebrationProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-2xl w-full animate-scale-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse blur-xl" />
              <Sparkles className="h-20 w-20 text-primary relative" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome, {name}! 🎉</CardTitle>
          <p className="text-muted-foreground mt-2">
            You're all set to begin your growth journey!
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* XP Earned */}
          <div className="flex items-center justify-center gap-4 p-6 bg-primary/5 rounded-lg">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">XP Earned</p>
              <p className="text-3xl font-bold text-primary">+{totalXP} XP</p>
            </div>
          </div>

          {/* First Badge */}
          <div className="flex items-center justify-center gap-4 p-6 bg-secondary/50 rounded-lg">
            <Award className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">First Badge Unlocked!</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{badge.icon}</span>
                <div>
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Start journaling daily to earn more XP, unlock badges, and track your progress!
            </p>
            <Button onClick={onContinue} size="lg" className="w-full">
              Let's Get Started! 🚀
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingCelebration;
