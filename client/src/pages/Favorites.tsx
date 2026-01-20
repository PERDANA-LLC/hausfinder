import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { Heart, Loader2, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function Favorites() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: favorites, isLoading } = trpc.favorite.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: favoriteIds } = trpc.favorite.ids.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleFavoriteToggle = () => {
    utils.favorite.list.invalidate();
    utils.favorite.ids.invalidate();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your saved properties
          </p>
          <a href={getLoginUrl()}>
            <Button className="glow-orange">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">My Favorites</h1>
            <p className="text-muted-foreground">
              Properties you've saved for later
            </p>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : favorites && favorites.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-6">
                {favorites.length} saved {favorites.length === 1 ? "property" : "properties"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isFavorite={favoriteIds?.includes(property.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Favorites Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring properties and save your favorites by clicking the heart icon
              </p>
              <Button onClick={() => setLocation("/search")}>Browse Properties</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
