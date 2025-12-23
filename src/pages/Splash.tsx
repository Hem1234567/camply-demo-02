import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // If already logged in, skip splash and go directly to dashboard
    if (!loading && user) {
      navigate("/", { replace: true });
      return;
    }

    // For non-logged in users, show splash for 2 seconds then go to login
    if (!loading && !user) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        navigate("/login", { replace: true });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  // Don't show splash if user is already logged in
  if (!loading && user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="text-center animate-pulse">
        <img 
          src="/journal-logo-removebg-preview.png" 
          alt="Camply Logo" 
          className="w-32 h-32 mx-auto mb-4"
        />
        <h1 className="text-4xl font-bold text-white">Camply</h1>
      </div>
    </div>
  );
};

export default Splash;
