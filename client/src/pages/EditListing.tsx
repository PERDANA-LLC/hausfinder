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
  Home,
  ArrowLeft,
  Star,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

interface ImageFile {
  file: File;
  preview: string;
  base64: string;
}

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const propertyId = parseInt(id || "0");

  const { data: property, isLoading } = trpc.property.get.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

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

  const [newImages, setNewImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title,
        description: property.description || "",
        price: property.price,
        propertyType: property.propertyType,
        status: property.status,
        bedrooms: property.bedrooms?.toString() || "",
        bathrooms: property.bathrooms?.toString() || "",
        area: property.area || "",
        location: property.location,
        address: property.address || "",
        amenities: property.amenities || "",
        latitude: property.latitude ? parseFloat(property.latitude) : undefined,
        longitude: property.longitude ? parseFloat(property.longitude) : undefined,
      });
    }
  }, [property]);

  const utils = trpc.useUtils();

  const updateProperty = trpc.property.update.useMutation({
    onSuccess: () => {
      toast.success("Property updated successfully!");
      utils.property.get.invalidate({ id: propertyId });
      setLocation(`/property/${propertyId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update listing");
    },
  });

  const uploadImages = trpc.image.upload.useMutation({
    onSuccess: () => {
      toast.success("Images uploaded successfully!");
      utils.property.get.invalidate({ id: propertyId });
      setNewImages([]);
    },
    onError: () => {
      toast.error("Failed to upload images");
    },
  });

  const deleteImage = trpc.image.delete.useMutation({
    onSuccess: () => {
      toast.success("Image deleted");
      utils.property.get.invalidate({ id: propertyId });
    },
    onError: () => {
      toast.error("Failed to delete image");
    },
  });

  const setPrimaryImage = trpc.image.setPrimary.useMutation({
    onSuccess: () => {
      toast.success("Cover image updated");
      utils.property.get.invalidate({ id: propertyId });
    },
    onError: () => {
      toast.error("Failed to update cover image");
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

    const images: ImageFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
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

      images.push({
        file,
        preview: URL.createObjectURL(file),
        base64,
      });
    }

    setNewImages((prev) => [...prev, ...images]);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadNewImages = () => {
    if (newImages.length === 0) return;

    uploadImages.mutate({
      propertyId,
      images: newImages.map((img) => ({
        base64: img.base64,
        filename: img.file.name,
        mimeType: img.file.type,
      })),
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

    updateProperty.mutate({
      id: propertyId,
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
    });
  };

  if (authLoading || isLoading) {
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
          <p className="text-muted-foreground mb-6">Please sign in to edit your property</p>
          <a href={getLoginUrl()}>
            <Button className="glow-orange">Sign In</Button>
          </a>
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
          <p className="text-muted-foreground mb-6">This property doesn't exist or you don't have permission to edit it.</p>
          <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Property</h1>
            <p className="text-muted-foreground">Update your property listing details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <Input
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
                        <SelectValue />
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Price (SBD) *</label>
                  <Input
                    type="number"
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bathrooms</label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Area (sqm)</label>
                    <Input
                      type="number"
                      value={formData.area}
                      onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Amenities</label>
                  <Input
                    value={formData.amenities}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amenities: e.target.value }))}
                    placeholder="Separate with commas"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Location/Area *</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Full Address</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  />
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
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* Existing Images */}
            <Card>
              <CardHeader>
                <CardTitle>Current Photos</CardTitle>
                <CardDescription>Click star to set as cover image</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {property.images?.map((img) => (
                    <div
                      key={img.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage.mutate({ imageId: img.id, propertyId })}
                          className="p-1 bg-background/80 rounded-full hover:bg-background"
                          disabled={img.isPrimary}
                        >
                          <Star className={`w-4 h-4 ${img.isPrimary ? "fill-primary text-primary" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteImage.mutate({ imageId: img.id, propertyId })}
                          className="p-1 bg-destructive text-destructive-foreground rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add New Images */}
            <Card>
              <CardHeader>
                <CardTitle>Add More Photos</CardTitle>
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
                  {newImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                    >
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewImages((prev) => {
                            const arr = [...prev];
                            URL.revokeObjectURL(arr[idx].preview);
                            arr.splice(idx, 1);
                            return arr;
                          });
                        }}
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

                {newImages.length > 0 && (
                  <Button
                    type="button"
                    onClick={handleUploadNewImages}
                    disabled={uploadImages.isPending}
                    className="mt-4"
                  >
                    {uploadImages.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      `Upload ${newImages.length} New Photo${newImages.length > 1 ? "s" : ""}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => window.history.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={updateProperty.isPending} className="flex-1 glow-orange">
                {updateProperty.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
