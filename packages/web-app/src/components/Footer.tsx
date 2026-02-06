import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin } from "lucide-react";
import logo from "@/assets/thinkspace-logo.png";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/30">
      <div className="container mx-auto px-6 lg:px-12 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="ThinkSpace" className="h-36 w-auto" />
            <p className="text-sm text-muted-foreground font-light">
              The Enterprise AI Operating System for knowledge work.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground uppercase tracking-wider">Products</h4>
            <div className="space-y-2 text-sm text-muted-foreground font-light">
              <Link to="/products/thinkbase" className="block hover:text-primary transition-smooth">ThinkBase</Link>
              <Link to="/products/thinkassist" className="block hover:text-primary transition-smooth">ThinkAssist</Link>
              <Link to="/products/thinkagent" className="block hover:text-primary transition-smooth">ThinkAgent</Link>
              <Link to="/products/thinkconnect" className="block hover:text-primary transition-smooth">ThinkConnect</Link>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground uppercase tracking-wider">Solutions</h4>
            <div className="space-y-2 text-sm text-muted-foreground font-light">
              <Link to="/legal" className="block hover:text-primary transition-smooth">Legal Teams</Link>
              <Link to="/finance" className="block hover:text-primary transition-smooth">Finance Teams</Link>
              <Link to="/security" className="block hover:text-primary transition-smooth">Security</Link>
              <Link to="/pricing" className="block hover:text-primary transition-smooth">Pricing</Link>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground uppercase tracking-wider">Company</h4>
            <div className="space-y-2 text-sm text-muted-foreground font-light">
              <Link to="/about" className="block hover:text-primary transition-smooth">About Us</Link>
              <Link to="/resources" className="block hover:text-primary transition-smooth">Resources</Link>
              <Link to="/privacy" className="block hover:text-primary transition-smooth">Privacy</Link>
              <Link to="/terms" className="block hover:text-primary transition-smooth">Terms</Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground font-light">
            © 2024 ThinkSpace. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground font-light">
            <span>ISO 27001 Compliant</span>
            <span>•</span>
            <span>GDPR Compliant</span>
            <span>•</span>
            <span>Enterprise Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;