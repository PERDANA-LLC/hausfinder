import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import {
  Home,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  Loader2,
  Mail,
  Phone,
  Clock,
  Check,
  MapPin,
  Bed,
  Bath,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: myListings, isLoading: listingsLoading } = trpc.property.getMyListings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: myInquiries, isLoading: inquiriesLoading } = trpc.inquiry.myInquiries.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: unreadCount } = trpc.inquiry.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deactivateProperty = trpc.property.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Property deactivated");
      utils.property.getMyListings.invalidate();
    },
    onError: () => {
      toast.error("Failed to deactivate property");
    },
  });

  const activateProperty = trpc.property.activate.useMutation({
    onSuccess: () => {
      toast.success("Property activated");
      utils.property.getMyListings.invalidate();
    },
    onError: () => {
      toast.error("Failed to activate property");
    },
  });

  const markInquiryRead = trpc.inquiry.markRead.useMutation({
    onSuccess: () => {
      utils.inquiry.myInquiries.invalidate();
      utils.inquiry.unreadCount.invalidate();
    },
  });

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
          <p className="text-muted-foreground mb-6">Please sign in to access your dashboard</p>
          <a href={getLoginUrl()}>
            <Button className="glow-orange">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const activeListings = myListings?.filter((p) => p.isActive) || [];
  const inactiveListings = myListings?.filter((p) => !p.isActive) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user?.name || "User"}</p>
            </div>
            <Link href="/list-property">
              <Button className="gap-2 glow-orange">
                <Plus className="w-4 h-4" />
                List New Property
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{myListings?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{activeListings.length}</div>
                <p className="text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{myInquiries?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Total Inquiries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{unreadCount || 0}</div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="listings" className="space-y-6">
            <TabsList>
              <TabsTrigger value="listings">My Listings</TabsTrigger>
              <TabsTrigger value="inquiries" className="relative">
                Inquiries
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings" className="space-y-4">
              {listingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : myListings && myListings.length > 0 ? (
                <div className="space-y-4">
                  {myListings.map((property) => {
                    const primaryImage = property.images?.find((img) => img.isPrimary) || property.images?.[0];
                    const formattedPrice = new Intl.NumberFormat("en-SB", {
                      style: "decimal",
                      maximumFractionDigits: 0,
                    }).format(parseFloat(property.price));

                    return (
                      <Card key={property.id} className={!property.isActive ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Image */}
                            <div className="w-full sm:w-40 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {primaryImage ? (
                                <img
                                  src={primaryImage.url}
                                  alt={property.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <h3 className="font-semibold text-foreground line-clamp-1">
                                    {property.title}
                                  </h3>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {property.location}
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Badge
                                    variant={property.isActive ? "default" : "secondary"}
                                    className={property.isActive ? "bg-green-500/20 text-green-500" : ""}
                                  >
                                    {property.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {property.status === "sale" ? "For Sale" : "For Rent"}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                {property.bedrooms && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="w-4 h-4" />
                                    {property.bedrooms}
                                  </span>
                                )}
                                {property.bathrooms && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="w-4 h-4" />
                                    {property.bathrooms}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {property.viewCount} views
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <p className="text-lg font-bold text-primary">
                                  SBD {formattedPrice}
                                  {property.status === "rent" && (
                                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                  )}
                                </p>

                                <div className="flex gap-2">
                                  <Link href={`/property/${property.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Link href={`/edit-property/${property.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  {property.isActive ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deactivateProperty.mutate({ id: property.id })}
                                      disabled={deactivateProperty.isPending}
                                    >
                                      <EyeOff className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => activateProperty.mutate({ id: property.id })}
                                      disabled={activateProperty.isPending}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Listings Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by listing your first property on HausFinder
                    </p>
                    <Link href="/list-property">
                      <Button className="glow-orange">List Your Property</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Inquiries Tab */}
            <TabsContent value="inquiries" className="space-y-4">
              {inquiriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : myInquiries && myInquiries.length > 0 ? (
                <div className="space-y-4">
                  {myInquiries.map(({ inquiry, property }) => (
                    <Card
                      key={inquiry.id}
                      className={`cursor-pointer transition-colors ${
                        !inquiry.isRead ? "border-primary/50 bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (!inquiry.isRead) {
                          markInquiryRead.mutate({ id: inquiry.id });
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{inquiry.senderName}</h3>
                              {!inquiry.isRead && (
                                <Badge className="bg-primary text-primary-foreground">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Regarding: {property.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                          </div>
                        </div>

                        <p className="text-foreground mb-4 whitespace-pre-wrap">{inquiry.message}</p>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <a
                            href={`mailto:${inquiry.senderEmail}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-4 h-4" />
                            {inquiry.senderEmail}
                          </a>
                          {inquiry.senderPhone && (
                            <a
                              href={`tel:${inquiry.senderPhone}`}
                              className="flex items-center gap-1 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-4 h-4" />
                              {inquiry.senderPhone}
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Inquiries Yet</h3>
                    <p className="text-muted-foreground">
                      When someone contacts you about your listings, you'll see their messages here
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
