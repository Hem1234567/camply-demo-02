import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, sendEmailVerification } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check user profile for email verification requirement
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userData = userDoc.data();
      const requiresVerification = userData?.emailVerificationEnabled === true;
      
      // Check if email is verified (skip for admin and users who don't require verification)
      if (email !== "admin@gmail.com" && requiresVerification && !userCredential.user.emailVerified) {
        toast.error("Please verify your email before logging in.", {
          description: "Check your inbox for the verification link.",
          action: {
            label: "Resend",
            onClick: async () => {
              try {
                await sendEmailVerification(userCredential.user);
                toast.success("Verification email sent!");
              } catch (error) {
                toast.error("Failed to resend verification email");
              }
            }
          },
          duration: 10000
        });
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      toast.success("Welcome back!");
      
      // Redirect admin to admin panel, others to home
      if (email === "admin@gmail.com") {
        navigate("/admin-panel");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      let errorMessage = "Failed to sign in";
      
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Google accounts are already verified
      toast.success("Welcome back!");
      
      // Redirect admin to admin panel, others to home
      if (result.user.email === "admin@gmail.com") {
        navigate("/admin-panel");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Camply
          </h1>
          <h2 className="mt-6 text-3xl font-bold text-foreground">Welcome back</h2>
          <p className="mt-2 text-muted-foreground">Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="font-semibold text-primary hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
