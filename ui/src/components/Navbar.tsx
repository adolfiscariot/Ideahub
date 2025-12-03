import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import adeptLogo from '@/assets/adeptwebp.webp';

export const Navbar = () => {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-8">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={adeptLogo} alt="Adept Technologies" className="h-12 w-auto" />
            {/* <span className="font-serif font-semibold text-lg text-foreground">IdeaHub</span> */}
          </Link>

          <div className="flex items-center gap-1">
            <NavLink
              to="/groups"
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeClassName="text-foreground bg-accent"
            >
              Groups
            </NavLink>
            <NavLink
              to="/ideahub"
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeClassName="text-foreground bg-accent"
            >
              Ideahub
            </NavLink>
            <NavLink
              to="/dashboard"
              className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeClassName="text-foreground bg-accent"
            >
              Dashboard
            </NavLink>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {api.isAuthenticated() ? (
            <Button
              variant="ghost"
              onClick={() => {
                api.clearToken();
                window.location.reload(); // Simple way to reset state
              }}
            >
              Logout
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
