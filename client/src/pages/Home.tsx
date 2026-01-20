import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { Search, MapPin, Home as HomeIcon, Building, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuth();

  const { data: featuredProperties, isLoading } = trpc.property.featured.useQuery({ limit: 6 });
  const { data: favoriteIds } = trpc.favorite.ids.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const quickFilters = [
    { label: "Houses for Sale", status: "sale", type: "house", icon: HomeIcon },
    { label: "Apartments for Rent", status: "rent", type: "apartment", icon: Building },
    { label: "All Rentals", status: "rent", type: undefined, icon: MapPin },
    { label: "All Sales", status: "sale", type: undefined, icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Dramatic Background */}
        <div className="absolute inset-0 gradient-hero" />
        
        {/* Geometric Accents */}
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-accent/20 rotate-45 animate-pulse-glow" />
        <div className="absolute bottom-32 right-20 w-24 h-24 border-2 border-primary/20 rotate-12 animate-pulse-glow" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-primary/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-accent/10 rounded-full blur-xl animate-float" style={{ animationDelay: "2s" }} />

        {/* Content */}
        <div className="relative z-10 container text-center px-4 pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-slide-up">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Honiara, Solomon Islands</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-shadow-dramatic animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Find Your Perfect
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Home in Honiara
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Discover premium properties for rent and sale in the Solomon Islands.
            Your dream home awaits.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="relative flex gap-2 p-2 rounded-2xl bg-card/50 backdrop-blur-md border border-border/50 glow-teal">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by location, property type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 glow-orange">
                Search
              </Button>
            </div>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap justify-center gap-3 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            {quickFilters.map((filter) => (
              <Button
                key={filter.label}
                variant="outline"
                className="gap-2 bg-card/30 backdrop-blur-sm border-border/50 hover:bg-card/50 hover:border-primary/50"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (filter.status) params.set("status", filter.status);
                  if (filter.type) params.set("type", filter.type);
                  setLocation(`/search?${params.toString()}`);
                }}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Featured Properties Section */}
      <section className="py-20 bg-background">
        <div className="container">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                Featured Properties
              </h2>
              <p className="text-muted-foreground">
                Handpicked properties in prime Honiara locations
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/search")}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-xl image-placeholder"
                />
              ))}
            </div>
          ) : featuredProperties && featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isFavorite={favoriteIds?.includes(property.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <HomeIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Properties Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Be the first to list a property on HausFinder
              </p>
              <Button onClick={() => setLocation("/list-property")} className="glow-orange">
                List Your Property
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-cinematic opacity-50" />
        <div className="absolute top-10 right-10 w-40 h-40 border border-primary/20 rotate-45" />
        <div className="absolute bottom-10 left-10 w-32 h-32 border border-accent/20 -rotate-12" />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Ready to List Your Property?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Reach thousands of potential buyers and renters in Honiara.
              Our AI-powered tools help you create compelling listings in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gap-2 glow-orange"
                onClick={() => setLocation("/list-property")}
              >
                <Sparkles className="w-5 h-5" />
                List Your Property
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => setLocation("/map")}
              >
                <MapPin className="w-5 h-5" />
                Explore Map
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <HomeIcon className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HausFinder
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2026 HausFinder. The premier property platform for Solomon Islands.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Honiara, Solomon Islands</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
