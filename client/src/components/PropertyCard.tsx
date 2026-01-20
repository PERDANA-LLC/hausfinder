import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Heart, Bed, Bath, MapPin, Eye } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface PropertyImage {
  id: number;
  url: string;
  isPrimary: boolean;
}

interface PropertyCardProps {
  property: {
    id: number;
    title: string;
    price: string;
    propertyType: "house" | "apartment" | "land" | "commercial";
    status: "rent" | "sale";
    bedrooms: number | null;
    bathrooms: number | null;
    location: string;
    viewCount: number;
    images?: PropertyImage[];
  };
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}

export default function PropertyCard({
  property,
  isFavorite = false,
  onFavoriteToggle,
}: PropertyCardProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
      utils.favorite.ids.invalidate();
      onFavoriteToggle?.();
    },
    onError: () => {
      toast.error("Failed to update favorites");
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites");
      return;
    }
    toggleFavorite.mutate({ propertyId: property.id });
  };

  const primaryImage = property.images?.find((img) => img.isPrimary) || property.images?.[0];
  const formattedPrice = new Intl.NumberFormat("en-SB", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(parseFloat(property.price));

  const propertyTypeLabels = {
    house: "House",
    apartment: "Apartment",
    land: "Land",
    commercial: "Commercial",
  };

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="property-card overflow-hidden cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status Badge */}
          <Badge
            className={`absolute top-3 left-3 ${
              property.status === "sale"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            For {property.status === "sale" ? "Sale" : "Rent"}
          </Badge>

          {/* Property Type Badge */}
          <Badge variant="outline" className="absolute top-3 right-12 bg-background/80 backdrop-blur-sm">
            {propertyTypeLabels[property.propertyType]}
          </Badge>

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background ${
              isFavorite ? "text-red-500" : "text-muted-foreground"
            }`}
            onClick={handleFavoriteClick}
            disabled={toggleFavorite.isPending}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <p className="text-white font-bold text-xl text-shadow-dramatic">
              SBD {formattedPrice}
              {property.status === "rent" && (
                <span className="text-sm font-normal opacity-80">/month</span>
              )}
            </p>
          </div>

          {/* Views */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/80 text-sm">
            <Eye className="w-3 h-3" />
            {property.viewCount}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
            {property.title}
          </h3>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{property.location}</span>
          </div>

          {/* Features */}
          {(property.bedrooms || property.bathrooms) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {property.bedrooms && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{property.bedrooms} Beds</span>
                </div>
              )}
              {property.bathrooms && (
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{property.bathrooms} Baths</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
