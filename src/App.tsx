import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { checkDailyBonus } from "./utils/gamification";
import { playDailyBonusSound, triggerDailyBonusConfetti } from "./utils/celebrationEffects";
import { toast } from "sonner";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Tasks from "./pages/Tasks";
import Diary from "./pages/Diary";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import WeeklyReport from "./pages/WeeklyReport";
import WeeklyGoals from "./pages/WeeklyGoals";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [dailyBonusChecked, setDailyBonusChecked] = useState(false);
  
  useEffect(() => {
    if (user) {
      // Reload user to get latest email verification status
      user.reload().then(async () => {
        // Check user profile for email verification requirement
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const requiresVerification = userData?.emailVerificationEnabled === true;
        
        // Check if email is verified only for users who require it
        if (user.email !== "admin@gmail.com" && requiresVerification && !user.emailVerified) {
          toast.error("Please verify your email to access the app");
          return;
        }
        
        const checkOnboarding = async () => {
          // For existing users who don't have the field, assume they've completed onboarding
          const hasPrivacyPolicy = userData?.hasAcceptedPrivacyPolicy !== false;
          const completed = userData?.hasCompletedOnboarding !== false && hasPrivacyPolicy;
          setHasCompletedOnboarding(completed);
          
          // Check daily bonus only once per session for users who completed onboarding
          if (completed && !dailyBonusChecked) {
            setDailyBonusChecked(true);
            const bonusXP = await checkDailyBonus(user.uid);
            if (bonusXP > 0) {
              setTimeout(() => {
                playDailyBonusSound();
                triggerDailyBonusConfetti();
                toast.success(`Daily Login Bonus! +${bonusXP} XP 🎉`, {
                  description: "Come back tomorrow for another bonus!"
                });
              }, 1000);
            }
          }
        };
        checkOnboarding();
      });
    } else {
      setDailyBonusChecked(false);
    }
  }, [user, dailyBonusChecked]);
  
  if (loading || (user && hasCompletedOnboarding === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/welcome" />;
  
  if (!hasCompletedOnboarding) return <Navigate to="/onboarding" />;
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return !user ? <>{children}</> : <Navigate to="/" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/splash" element={<Splash />} />
              <Route path="/welcome" element={<Splash />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/diary" element={<ProtectedRoute><Diary /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/weekly-report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
              <Route path="/weekly-goals" element={<ProtectedRoute><WeeklyGoals /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin-panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
