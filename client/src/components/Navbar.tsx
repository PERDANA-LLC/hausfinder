import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Home,
  Search,
  Heart,
  MapPin,
  Plus,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadCount } = trpc.inquiry.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/map", label: "Map", icon: MapPin },
  ];

  const authLinks = [
    { href: "/favorites", label: "Favorites", icon: Heart },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 blur-overlay bg-background/80 border-b border-border">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Home className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HausFinder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            {isAuthenticated &&
              authLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2 relative"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.label}</span>
                    {link.href === "/dashboard" && unreadCount !== undefined && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hidden sm:flex"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {isAuthenticated ? (
              <>
                {/* Admin Dashboard Button - Only for Super Admin */}
                {user?.role === "superadmin" && (
                  <Link href="/admin">
                    <Button size="sm" variant="outline" className="hidden sm:flex gap-2 border-primary/50 text-primary hover:bg-primary/10">
                      <Shield className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>
                )}

                {/* List Property Button */}
                <Link href="/list-property">
                  <Button size="sm" className="hidden sm:flex gap-2 glow-orange">
                    <Plus className="w-4 h-4" />
                    List Property
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <User className="w-4 h-4" />
                      {unreadCount && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                        {unreadCount && unreadCount > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorites" className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" />
                        Favorites
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/list-property" className="cursor-pointer">
                        <Plus className="w-4 h-4 mr-2" />
                        List Property
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleTheme}>
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 mr-2" />
                      ) : (
                        <Moon className="w-4 h-4 mr-2" />
                      )}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="glow-orange">
                  Sign In
                </Button>
              </a>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  {authLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant={isActive(link.href) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <link.icon className="w-4 h-4" />
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                  {user?.role === "superadmin" && (
                    <Link href="/admin">
                      <Button
                        variant={isActive("/admin") ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2 text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Link href="/list-property">
                    <Button
                      className="w-full justify-start gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Plus className="w-4 h-4" />
                      List Property
                    </Button>
                  </Link>
                </>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
