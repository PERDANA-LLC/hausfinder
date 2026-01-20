import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { MapView } from "@/components/Map";
import {
  Upload,
  X,
  Sparkles,
  Loader2,
  MapPin,
  Home,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface ImageFile {
  file: File;
  preview: string;
  base64: string;
}

export default function CreateListing() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    propertyType: "" as "house" | "apartment" | "land" | "commercial" | "",
    status: "" as "rent" | "sale" | "",
    bedrooms: "",
    bathrooms: "",
    area: "",
    location: "",
    address: "",
    amenities: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const [images, setImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createProperty = trpc.property.create.useMutation({
    onSuccess: (data) => {
      toast.success("Property listed successfully!");
      setLocation(`/property/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create listing");
    },
  });

  const generateDescription = trpc.ai.generateDescription.useMutation({
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, description: data.description }));
      toast.success("Description generated!");
    },
    onError: () => {
      toast.error("Failed to generate description");
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);

    const newImages: ImageFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        base64,
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerateDescription = () => {
    if (!formData.title || !formData.propertyType || !formData.status || !formData.location) {
      toast.error("Please fill in title, property type, status, and location first");
      return;
    }

    generateDescription.mutate({
      title: formData.title,
      propertyType: formData.propertyType as "house" | "apartment" | "land" | "commercial",
      status: formData.status as "rent" | "sale",
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      area: formData.area ? parseFloat(formData.area) : undefined,
      location: formData.location,
      amenities: formData.amenities || undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.propertyType || !formData.status || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    createProperty.mutate({
      title: formData.title,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      propertyType: formData.propertyType as "house" | "apartment" | "land" | "commercial",
      status: formData.status as "rent" | "sale",
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      area: formData.area ? parseFloat(formData.area) : undefined,
      location: formData.location,
      address: formData.address || undefined,
      latitude: formData.latitude,
      longitude: formData.longitude,
      amenities: formData.amenities || undefined,
      images: images.map((img) => ({
        base64: img.base64,
        filename: img.file.name,
        mimeType: img.file.type,
      })),
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    toast.success("Location pinned on map");
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
          <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to list your property on HausFinder
          </p>
          <a href={getLoginUrl()}>
            <Button className="glow-orange">Sign In to Continue</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">List Your Property</h1>
            <p className="text-muted-foreground">
              Fill in the details below to list your property on HausFinder
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential details about your property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <Input
                    placeholder="e.g., Beautiful 3-Bedroom House in Point Cruz"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Property Type *</label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          propertyType: v as "house" | "apartment" | "land" | "commercial",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Listing Type *</label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, status: v as "rent" | "sale" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Price (SBD) * {formData.status === "rent" && "(per month)"}
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 15000"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>Additional specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                    <Input
                      type="number"
                      placeholder="e.g., 3"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bathrooms</label>
                    <Input
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Area (sqm)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 150"
                      value={formData.area}
                      onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Amenities</label>
                  <Input
                    placeholder="e.g., Air conditioning, Parking, Garden, Security"
                    value={formData.amenities}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amenities: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>Where is your property located?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Location/Area *</label>
                  <Input
                    placeholder="e.g., Point Cruz, Honiara"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Full Address</label>
                  <Input
                    placeholder="e.g., Lot 5, Mendana Avenue"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Pin Location on Map
                    {formData.latitude && formData.longitude && (
                      <span className="text-primary ml-2">✓ Location set</span>
                    )}
                  </label>
                  <div className="h-[300px] rounded-lg overflow-hidden border border-border">
                    <MapView
                      onMapReady={(map) => {
                        // Center on Honiara
                        map.setCenter({ lat: -9.4456, lng: 159.9729 });
                        map.setZoom(13);

                        let marker: google.maps.Marker | null = null;

                        map.addListener("click", (e: google.maps.MapMouseEvent) => {
                          const lat = e.latLng?.lat();
                          const lng = e.latLng?.lng();
                          if (lat && lng) {
                            handleMapClick(lat, lng);

                            if (marker) {
                              marker.setPosition({ lat, lng });
                            } else {
                              marker = new google.maps.Marker({
                                position: { lat, lng },
                                map,
                                draggable: true,
                              });

                              marker.addListener("dragend", () => {
                                const pos = marker?.getPosition();
                                if (pos) {
                                  handleMapClick(pos.lat(), pos.lng());
                                }
                              });
                            }
                          }
                        });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click on the map to set the property location
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Description</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={generateDescription.isPending}
                    className="gap-2"
                  >
                    {generateDescription.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate with AI
                  </Button>
                </CardTitle>
                <CardDescription>
                  Describe your property or use AI to generate a compelling description
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describe your property's features, condition, and what makes it special..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
                <CardDescription>
                  Upload photos of your property (first image will be the cover)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                    >
                      <img
                        src={img.preview}
                        alt={`Upload ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">Add Photos</span>
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProperty.isPending}
                className="flex-1 glow-orange"
              >
                {createProperty.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "List Property"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
