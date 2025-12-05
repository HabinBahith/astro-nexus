import { Satellite, Activity, Rocket, Brain, Menu, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: "home", label: "Home", icon: Globe2, path: "/" },
  { id: "tracker", label: "ISS Tracker", icon: Satellite, path: "/tracker" },
  { id: "weather", label: "Space Weather", icon: Activity, path: "/weather" },
  { id: "missions", label: "Missions", icon: Rocket, path: "/missions" },
  { id: "ai", label: "AI Explainer", icon: Brain, path: "/ai" },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentPath = pathname;

  const isActivePath = (target: string) =>
    target === "/" ? currentPath === "/" : currentPath.startsWith(target);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan-subtle">
                <Satellite className="w-5 h-5 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-status-success rounded-full status-pulse" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-wider text-foreground">
                ASTRO<span className="text-primary">NEXUS</span>
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Mission Control
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={isActivePath(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className="gap-2"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-success/10 border border-status-success/30">
              <div className="w-2 h-2 bg-status-success rounded-full status-pulse" />
              <span className="text-xs font-medium text-status-success uppercase tracking-wide">
                Systems Online
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={isActivePath(item.path) ? "default" : "ghost"}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start gap-3"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
