import { eq, and, or, like, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  properties, InsertProperty, Property,
  propertyImages, InsertPropertyImage,
  favorites, InsertFavorite,
  inquiries, InsertInquiry
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ PROPERTY QUERIES ============

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(properties).values(data);
  return result[0].insertId;
}

export async function updateProperty(id: number, userId: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(properties)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(properties.id, id), eq(properties.userId, userId)));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPropertyWithOwner(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select({
      property: properties,
      owner: {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
      }
    })
    .from(properties)
    .leftJoin(users, eq(properties.userId, users.id))
    .where(eq(properties.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProperties(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(properties)
    .where(eq(properties.userId, userId))
    .orderBy(desc(properties.createdAt));
}

export async function searchProperties(params: {
  query?: string;
  status?: 'rent' | 'sale';
  propertyType?: 'house' | 'apartment' | 'land' | 'commercial';
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { properties: [], total: 0 };
  
  const conditions = [eq(properties.isActive, true)];
  
  if (params.query) {
    conditions.push(
      or(
        like(properties.title, `%${params.query}%`),
        like(properties.location, `%${params.query}%`),
        like(properties.description, `%${params.query}%`)
      )!
    );
  }
  
  if (params.status) {
    conditions.push(eq(properties.status, params.status));
  }
  
  if (params.propertyType) {
    conditions.push(eq(properties.propertyType, params.propertyType));
  }
  
  if (params.minPrice) {
    conditions.push(sql`${properties.price} >= ${params.minPrice}`);
  }
  
  if (params.maxPrice) {
    conditions.push(sql`${properties.price} <= ${params.maxPrice}`);
  }
  
  if (params.bedrooms) {
    conditions.push(eq(properties.bedrooms, params.bedrooms));
  }
  
  const whereClause = and(...conditions);
  
  const [results, countResult] = await Promise.all([
    db.select().from(properties)
      .where(whereClause)
      .orderBy(desc(properties.createdAt))
      .limit(params.limit || 20)
      .offset(params.offset || 0),
    db.select({ count: sql<number>`count(*)` }).from(properties).where(whereClause)
  ]);
  
  return {
    properties: results,
    total: countResult[0]?.count || 0
  };
}

export async function getFeaturedProperties(limit: number = 6) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(properties)
    .where(eq(properties.isActive, true))
    .orderBy(desc(properties.viewCount), desc(properties.createdAt))
    .limit(limit);
}

export async function incrementPropertyViews(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(properties)
    .set({ viewCount: sql`${properties.viewCount} + 1` })
    .where(eq(properties.id, id));
}

export async function deactivateProperty(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(properties)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(properties.id, id), eq(properties.userId, userId)));
}

export async function activateProperty(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(properties)
    .set({ isActive: true, updatedAt: new Date() })
    .where(and(eq(properties.id, id), eq(properties.userId, userId)));
}

// ============ PROPERTY IMAGES QUERIES ============

export async function addPropertyImage(data: InsertPropertyImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(propertyImages).values(data);
  return result[0].insertId;
}

export async function addPropertyImages(images: InsertPropertyImage[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (images.length === 0) return;
  await db.insert(propertyImages).values(images);
}

export async function getPropertyImages(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId))
    .orderBy(asc(propertyImages.sortOrder));
}

export async function deletePropertyImage(id: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(propertyImages)
    .where(and(eq(propertyImages.id, id), eq(propertyImages.propertyId, propertyId)));
}

export async function setPrimaryImage(imageId: number, propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(propertyImages)
    .set({ isPrimary: false })
    .where(eq(propertyImages.propertyId, propertyId));
  
  await db.update(propertyImages)
    .set({ isPrimary: true })
    .where(and(eq(propertyImages.id, imageId), eq(propertyImages.propertyId, propertyId)));
}

// ============ FAVORITES QUERIES ============

export async function toggleFavorite(userId: number, propertyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)));
    return false;
  } else {
    await db.insert(favorites).values({ userId, propertyId });
    return true;
  }
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      favorite: favorites,
      property: properties
    })
    .from(favorites)
    .innerJoin(properties, eq(favorites.propertyId, properties.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
  
  return result.map(r => ({ ...r.property, favoriteId: r.favorite.id }));
}

export async function getUserFavoriteIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({ propertyId: favorites.propertyId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  
  return result.map(r => r.propertyId);
}

export async function isFavorite(userId: number, propertyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
    .limit(1);
  
  return result.length > 0;
}

// ============ INQUIRIES QUERIES ============

export async function createInquiry(data: InsertInquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(inquiries).values(data);
  return result[0].insertId;
}

export async function getPropertyInquiries(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(inquiries)
    .where(eq(inquiries.propertyId, propertyId))
    .orderBy(desc(inquiries.createdAt));
}

export async function getUserInquiries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const userProps = await db.select({ id: properties.id })
    .from(properties)
    .where(eq(properties.userId, userId));
  
  if (userProps.length === 0) return [];
  
  const propertyIds = userProps.map(p => p.id);
  
  return db
    .select({
      inquiry: inquiries,
      property: {
        id: properties.id,
        title: properties.title,
      }
    })
    .from(inquiries)
    .innerJoin(properties, eq(inquiries.propertyId, properties.id))
    .where(inArray(inquiries.propertyId, propertyIds))
    .orderBy(desc(inquiries.createdAt));
}

export async function markInquiryAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const inquiry = await db.select({
    inquiry: inquiries,
    property: properties
  })
    .from(inquiries)
    .innerJoin(properties, eq(inquiries.propertyId, properties.id))
    .where(and(eq(inquiries.id, id), eq(properties.userId, userId)))
    .limit(1);
  
  if (inquiry.length === 0) throw new Error("Inquiry not found or unauthorized");
  
  await db.update(inquiries).set({ isRead: true }).where(eq(inquiries.id, id));
}

export async function getUnreadInquiryCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(inquiries)
    .innerJoin(properties, eq(inquiries.propertyId, properties.id))
    .where(and(eq(properties.userId, userId), eq(inquiries.isRead, false)));
  
  return result[0]?.count || 0;
}

// ============ MAP QUERIES ============

export async function getPropertiesForMap() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: properties.id,
    title: properties.title,
    price: properties.price,
    propertyType: properties.propertyType,
    status: properties.status,
    bedrooms: properties.bedrooms,
    bathrooms: properties.bathrooms,
    location: properties.location,
    latitude: properties.latitude,
    longitude: properties.longitude,
  })
    .from(properties)
    .where(and(
      eq(properties.isActive, true),
      sql`${properties.latitude} IS NOT NULL`,
      sql`${properties.longitude} IS NOT NULL`
    ));
}
