import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { MapView } from "@/components/Map";
import {
  Heart,
  Bed,
  Bath,
  MapPin,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Mail,
  Phone,
  User,
  Loader2,
  Maximize,
  Home,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { toast } from "sonner";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const propertyId = parseInt(id || "0");

  const { data: property, isLoading } = trpc.property.get.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

  const { data: isFavorite } = trpc.favorite.check.useQuery(
    { propertyId },
    { enabled: isAuthenticated && propertyId > 0 }
  );

  const utils = trpc.useUtils();

  const toggleFavorite = trpc.favorite.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
      utils.favorite.check.invalidate({ propertyId });
      utils.favorite.ids.invalidate();
    },
  });

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    senderName: user?.name || "",
    senderEmail: user?.email || "",
    senderPhone: "",
    message: "",
  });

  const sendInquiry = trpc.inquiry.create.useMutation({
    onSuccess: () => {
      toast.success("Inquiry sent successfully! The owner will contact you soon.");
      setContactForm((prev) => ({ ...prev, message: "" }));
    },
    onError: () => {
      toast.error("Failed to send inquiry. Please try again.");
    },
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.senderName || !contactForm.senderEmail || !contactForm.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    sendInquiry.mutate({
      propertyId,
      ...contactForm,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This property may have been removed or is no longer available.
          </p>
          <Button onClick={() => setLocation("/search")}>Browse Properties</Button>
        </div>
      </div>
    );
  }

  const images = property.images || [];
  const formattedPrice = new Intl.NumberFormat("en-SB", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(parseFloat(property.price));

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Fullscreen Image Modal */}
      {showFullscreen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setShowFullscreen(false)}
          >
            <ChevronLeft className="w-6 h-6 rotate-45" />
          </button>
          <img
            src={images[currentImageIndex].url}
            alt={property.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}

      <main className="pt-20 pb-12">
        {/* Back Button */}
        <div className="container mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Image Gallery */}
        <div className="container mb-8">
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImageIndex].url}
                  alt={property.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowFullscreen(true)}
                />
                <button
                  className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-lg hover:bg-black/70"
                  onClick={() => setShowFullscreen(true)}
                >
                  <Maximize className="w-5 h-5" />
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? "bg-white" : "bg-white/50"
                          }`}
                          onClick={() => setCurrentImageIndex(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === currentImageIndex ? "border-primary" : "border-transparent"
                  }`}
                  onClick={() => setCurrentImageIndex(idx)}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    className={
                      property.status === "sale"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }
                  >
                    For {property.status === "sale" ? "Sale" : "Rent"}
                  </Badge>
                  <Badge variant="outline">
                    {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm ml-auto">
                    <Eye className="w-4 h-4" />
                    {property.viewCount} views
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {property.title}
                </h1>

                <div className="flex items-center gap-1 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  {property.location}
                  {property.address && ` • ${property.address}`}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-primary">
                    SBD {formattedPrice}
                    {property.status === "rent" && (
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    )}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleFavorite.mutate({ propertyId })}
                      disabled={!isAuthenticated}
                    >
                      <Heart
                        className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleShare}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        <Bed className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bedrooms</p>
                          <p className="font-semibold">{property.bedrooms}</p>
                        </div>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        <Bath className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Bathrooms</p>
                          <p className="font-semibold">{property.bathrooms}</p>
                        </div>
                      </div>
                    )}
                    {property.area && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                        <Maximize className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Area</p>
                          <p className="font-semibold">{property.area} sqm</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {property.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {property.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Amenities */}
              {property.amenities && (
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.split(",").map((amenity, idx) => (
                        <Badge key={idx} variant="secondary">
                          {amenity.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Map */}
              {property.latitude && property.longitude && (
                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] rounded-lg overflow-hidden">
                      <MapView
                        onMapReady={(map) => {
                          const position = {
                            lat: parseFloat(property.latitude!),
                            lng: parseFloat(property.longitude!),
                          };
                          map.setCenter(position);
                          map.setZoom(15);
                          new google.maps.Marker({
                            position,
                            map,
                            title: property.title,
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Owner Info */}
              {property.owner && (
                <Card>
                  <CardHeader>
                    <CardTitle>Listed By</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{property.owner.name || "Property Owner"}</p>
                        <p className="text-sm text-muted-foreground">Property Owner</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Form */}
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Contact Owner</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Your Name *
                      </label>
                      <Input
                        placeholder="John Doe"
                        value={contactForm.senderName}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, senderName: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Your Email *
                      </label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={contactForm.senderEmail}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, senderEmail: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Phone (Optional)
                      </label>
                      <Input
                        type="tel"
                        placeholder="+677 12345"
                        value={contactForm.senderPhone}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, senderPhone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Message *
                      </label>
                      <Textarea
                        placeholder={`Hi, I'm interested in this property "${property.title}". Please contact me with more details.`}
                        value={contactForm.message}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, message: e.target.value }))
                        }
                        rows={4}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={sendInquiry.isPending}
                    >
                      {sendInquiry.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Inquiry
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
