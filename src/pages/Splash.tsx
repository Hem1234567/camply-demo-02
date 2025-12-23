import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (user) {
        navigate("/", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

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
