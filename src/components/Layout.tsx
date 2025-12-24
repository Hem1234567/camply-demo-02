import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface LayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

const Layout = ({ children, hideNav = false }: LayoutProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <img 
            src="/journal-logo-removebg-preview.png" 
            alt="Camply Logo" 
            className="h-10 w-auto"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default Layout;
