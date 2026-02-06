import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, LogOut } from "lucide-react";
import logo from "@/assets/thinkspace-logo.png";

const Header = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/home" className="flex items-center hover:opacity-80 transition-smooth">
            <img src={logo} alt="ThinkSpace" className="h-36" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth font-light outline-none">
                Products
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border-border/30">
                <DropdownMenuItem asChild>
                  <Link to="/products/thinkdoc" className="flex items-center">
                    ThinkDoc
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/products/thinkstudio" className="flex items-center">
                    ThinkStudio
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/security" className="text-muted-foreground hover:text-foreground transition-smooth font-light">
              Security
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-smooth font-light">
              Pricing
            </Link>
            <Link to="/resources" className="text-muted-foreground hover:text-foreground transition-smooth font-light">
              Resources
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-smooth font-light">
              About
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-smooth">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border/30">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full transition-all font-light"
                asChild
              >
                <Link to="/demo">Book a Demo</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
