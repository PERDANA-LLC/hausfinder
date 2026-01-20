import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import { Search as SearchIcon, SlidersHorizontal, X, Loader2, Home } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSearch } from "wouter";

export default function Search() {
  const searchParams = useSearch();
  const params = useMemo(() => new URLSearchParams(searchParams), [searchParams]);
  const { isAuthenticated } = useAuth();

  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState<"rent" | "sale" | undefined>(
    (params.get("status") as "rent" | "sale") || undefined
  );
  const [propertyType, setPropertyType] = useState<"house" | "apartment" | "land" | "commercial" | undefined>(
    (params.get("type") as "house" | "apartment" | "land" | "commercial") || undefined
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(
    params.get("minPrice") ? parseInt(params.get("minPrice")!) : undefined
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    params.get("maxPrice") ? parseInt(params.get("maxPrice")!) : undefined
  );
  const [bedrooms, setBedrooms] = useState<number | undefined>(
    params.get("bedrooms") ? parseInt(params.get("bedrooms")!) : undefined
  );
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = trpc.property.search.useQuery({
    query: query || undefined,
    status,
    propertyType,
    minPrice,
    maxPrice,
    bedrooms,
    limit: 20,
    offset: 0,
  });

  const { data: favoriteIds } = trpc.favorite.ids.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const clearFilters = () => {
    setQuery("");
    setStatus(undefined);
    setPropertyType(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setBedrooms(undefined);
  };

  const hasActiveFilters = query || status || propertyType || minPrice || maxPrice || bedrooms;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Search Properties</h1>
            <p className="text-muted-foreground">
              Find your perfect property in Honiara
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by location, title..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 h-12"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
              <Button type="submit" size="lg" className="h-12">
                Search
              </Button>
            </div>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 rounded-xl bg-card border border-border animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <Select
                    value={status || "all"}
                    onValueChange={(v) => setStatus(v === "all" ? undefined : (v as "rent" | "sale"))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="rent">For Rent</SelectItem>
                      <SelectItem value="sale">For Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type Filter */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Property Type</label>
                  <Select
                    value={propertyType || "all"}
                    onValueChange={(v) =>
                      setPropertyType(v === "all" ? undefined : (v as "house" | "apartment" | "land" | "commercial"))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Price */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Min Price (SBD)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minPrice || ""}
                    onChange={(e) => setMinPrice(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Max Price (SBD)</label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={maxPrice || ""}
                    onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Bedrooms</label>
                  <Select
                    value={bedrooms?.toString() || "any"}
                    onValueChange={(v) => setBedrooms(v === "any" ? undefined : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {status && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  For {status === "sale" ? "Sale" : "Rent"}
                  <button onClick={() => setStatus(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {propertyType && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm">
                  {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
                  <button onClick={() => setPropertyType(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {minPrice && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm">
                  Min: SBD {minPrice.toLocaleString()}
                  <button onClick={() => setMinPrice(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {maxPrice && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm">
                  Max: SBD {maxPrice.toLocaleString()}
                  <button onClick={() => setMaxPrice(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {isLoading ? (
                "Searching..."
              ) : (
                <>
                  Found <span className="text-foreground font-semibold">{data?.total || 0}</span> properties
                </>
              )}
            </p>
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data?.properties && data.properties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isFavorite={favoriteIds?.includes(property.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search filters or browse all properties
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
