import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Sparkles, ChevronLeft, TrendingUp } from "lucide-react";
import { awardXP, checkAndAwardBadge, BADGES } from "@/utils/gamification";
import OnboardingCelebration from "@/components/OnboardingCelebration";
import { playXPSound, playBadgeSound, triggerBadgeConfetti } from "@/utils/celebrationEffects";

const ONBOARDING_QUESTIONS = [
  {
    id: "occupation",
    question: "What do you do?",
    placeholder: "e.g., Student, Software Engineer, Designer, Entrepreneur...",
    type: "input" as const,
    xp: 2,
  },
  {
    id: "goals",
    question: "What are your main goals for personal growth?",
    placeholder: "e.g., Build better habits, track progress, stay motivated...",
    type: "textarea" as const,
    xp: 3,
  },
  {
    id: "motivation",
    question: "What motivates you to journal daily?",
    placeholder: "Share your motivation...",
    type: "textarea" as const,
    xp: 3,
  },
  {
    id: "expectations",
    question: "What do you hope to achieve in the next 30 days?",
    placeholder: "Your 30-day vision...",
    type: "textarea" as const,
    xp: 4,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentQuestion = ONBOARDING_QUESTIONS[currentStep];
  const totalXP = ONBOARDING_QUESTIONS.reduce((sum, q) => sum + q.xp, 0);
  const earnedXP = ONBOARDING_QUESTIONS.slice(0, currentStep)
    .filter(q => answers[q.id]?.trim())
    .reduce((sum, q) => sum + q.xp, 0);
  const progressPercentage = (currentStep / ONBOARDING_QUESTIONS.length) * 100;

  const handleNext = async () => {
    const answer = answers[currentQuestion.id]?.trim();
    
    if (!answer) {
      toast.error("Please answer the question before continuing");
      return;
    }

    if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update user profile with onboarding completion (keep displayName from signup)
      await setDoc(
        doc(db, "users", user.uid),
        {
          hasCompletedOnboarding: true,
          onboardingAnswers: answers,
        },
        { merge: true }
      );

      // Award total XP for completing onboarding
      const xpResult = await awardXP(user.uid, totalXP);
      playXPSound();
      
      // Award the Getting Started badge
      const badgeAwarded = await checkAndAwardBadge(user.uid, 'getting_started');
      
      if (badgeAwarded) {
        setTimeout(() => {
          playBadgeSound();
          triggerBadgeConfetti();
        }, 300);
      }

      // Show celebration screen
      setTimeout(() => {
        setShowCelebration(true);
      }, 800);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCelebrationContinue = () => {
    navigate("/");
  };

  const handleSkip = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          hasCompletedOnboarding: true,
        },
        { merge: true }
      );
      
      navigate("/");
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      toast.error("Failed to skip onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (showCelebration) {
    const badge = BADGES.find(b => b.id === 'getting_started')!;
    return (
      <OnboardingCelebration
        name={user?.displayName || "User"}
        totalXP={totalXP}
        badge={badge}
        onContinue={handleCelebrationContinue}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Welcome to Your Growth Journey
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {ONBOARDING_QUESTIONS.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-2">
            Answer questions to get started and earn {totalXP} XP!
          </p>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress: {Math.round(progressPercentage)}%</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {earnedXP} / {totalXP} XP
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold">
              {currentQuestion.question}
            </Label>
            
            {currentQuestion.type === "input" ? (
              <Input
                value={answers[currentQuestion.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                }
                placeholder={currentQuestion.placeholder}
                className="text-base"
              />
            ) : (
              <Textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                }
                placeholder={currentQuestion.placeholder}
                rows={5}
                className="text-base"
              />
            )}
            
            <p className="text-sm text-muted-foreground">
              +{currentQuestion.xp} XP for answering
            </p>
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleBack}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              onClick={handleNext}
              disabled={loading || !answers[currentQuestion.id]?.trim()}
            >
              {loading
                ? "Processing..."
                : currentStep < ONBOARDING_QUESTIONS.length - 1
                ? "Next"
                : "Complete"}
            </Button>
          </div>

          <div className="flex gap-2 justify-center">
            {ONBOARDING_QUESTIONS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
