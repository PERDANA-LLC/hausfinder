import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { MapView as MapComponent } from "@/components/Map";
import {
  MapPin,
  Bed,
  Bath,
  X,
  Loader2,
  List,
  Map,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

interface PropertyMarker {
  id: number;
  title: string;
  price: string;
  status: "rent" | "sale";
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  location: string;
  latitude: string | null;
  longitude: string | null;
  images?: { url: string; isPrimary: boolean }[];
}

export default function MapViewPage() {
  const { isAuthenticated } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);
  const [showList, setShowList] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const { data: properties, isLoading } = trpc.property.forMap.useQuery();

  const { data: favoriteIds } = trpc.favorite.ids.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
      utils.favorite.ids.invalidate();
    },
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("en-SB", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    // Center on Honiara
    map.setCenter({ lat: -9.4456, lng: 159.9729 });
    map.setZoom(13);

    // Add markers when properties are loaded
    if (properties) {
      addMarkers(properties);
    }
  };

  const addMarkers = (props: PropertyMarker[]) => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    props.forEach((property) => {
      if (!property.latitude || !property.longitude) return;
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current!,
        title: property.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: property.status === "sale" ? "#e67e22" : "#1abc9c",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        setSelectedProperty(property);
        mapRef.current?.panTo({ lat, lng });
      });

      markersRef.current.push(marker);
    });
  };

  // Update markers when properties change
  useEffect(() => {
    if (properties && mapRef.current) {
      addMarkers(properties);
    }
  }, [properties]);

  const handlePropertyClick = (property: PropertyMarker) => {
    setSelectedProperty(property);
    if (property.latitude && property.longitude) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(15);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16 h-screen flex flex-col">
        {/* Controls */}
        <div className="p-4 border-b border-border bg-background flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Explore Honiara</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${properties?.length || 0} properties on map`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showList ? "default" : "outline"}
              size="sm"
              onClick={() => setShowList(!showList)}
              className="gap-2"
            >
              {showList ? <Map className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {showList ? "Show Map" : "Show List"}
            </Button>
          </div>
        </div>

        {/* Map & List Container */}
        <div className="flex-1 relative flex">
          {/* Map */}
          <div className={`flex-1 ${showList ? "hidden md:block md:w-1/2" : "w-full"}`}>
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <MapComponent onMapReady={handleMapReady} />
            )}
          </div>

          {/* Property List */}
          {showList && (
            <div className="w-full md:w-1/2 h-full overflow-y-auto bg-background border-l border-border">
              <div className="p-4 space-y-4">
                {properties?.map((property: PropertyMarker) => {
                  const primaryImage =
                    property.images?.find((img: { url: string; isPrimary: boolean }) => img.isPrimary) || property.images?.[0];
                  const isFavorite = favoriteIds?.includes(property.id);

                  return (
                    <Card
                      key={property.id}
                      className={`cursor-pointer transition-all ${
                        selectedProperty?.id === property.id
                          ? "ring-2 ring-primary"
                          : "hover:shadow-lg"
                      }`}
                      onClick={() => handlePropertyClick(property)}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {primaryImage ? (
                              <img
                                src={primaryImage.url}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Badge
                                className={`text-xs ${
                                  property.status === "sale"
                                    ? "bg-primary/20 text-primary"
                                    : "bg-secondary/20 text-secondary"
                                }`}
                              >
                                {property.status === "sale" ? "Sale" : "Rent"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAuthenticated) {
                                    toast.error("Please sign in to save favorites");
                                    return;
                                  }
                                  toggleFavorite.mutate({ propertyId: property.id });
                                }}
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isFavorite ? "fill-red-500 text-red-500" : ""
                                  }`}
                                />
                              </Button>
                            </div>
                            <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-1">
                              {property.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {property.location}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {property.bedrooms && (
                                <span className="flex items-center gap-0.5">
                                  <Bed className="w-3 h-3" />
                                  {property.bedrooms}
                                </span>
                              )}
                              {property.bathrooms && (
                                <span className="flex items-center gap-0.5">
                                  <Bath className="w-3 h-3" />
                                  {property.bathrooms}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-primary mt-1">
                              SBD {formatPrice(property.price)}
                              {property.status === "rent" && (
                                <span className="text-xs font-normal">/mo</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Property Card (Mobile) */}
          {selectedProperty && !showList && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 animate-slide-up">
              <Card className="shadow-lg">
                <CardContent className="p-0">
                  <button
                    className="absolute top-2 right-2 z-10 p-1 bg-background/80 rounded-full"
                    onClick={() => setSelectedProperty(null)}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {selectedProperty.images && selectedProperty.images.length > 0 && (
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img
                        src={
                          selectedProperty.images.find((img) => img.isPrimary)?.url ||
                          selectedProperty.images[0].url
                        }
                        alt={selectedProperty.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={
                          selectedProperty.status === "sale"
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary/20 text-secondary"
                        }
                      >
                        {selectedProperty.status === "sale" ? "For Sale" : "For Rent"}
                      </Badge>
                      <Badge variant="outline">{selectedProperty.propertyType}</Badge>
                    </div>

                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                      {selectedProperty.title}
                    </h3>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-3 h-3" />
                      {selectedProperty.location}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      {selectedProperty.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {selectedProperty.bedrooms} Beds
                        </span>
                      )}
                      {selectedProperty.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          {selectedProperty.bathrooms} Baths
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-primary">
                        SBD {formatPrice(selectedProperty.price)}
                        {selectedProperty.status === "rent" && (
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        )}
                      </p>

                      <Link href={`/property/${selectedProperty.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Legend */}
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <p className="text-xs font-medium text-foreground mb-2">Legend</p>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#e67e22]" />
                <span className="text-muted-foreground">For Sale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#1abc9c]" />
                <span className="text-muted-foreground">For Rent</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
