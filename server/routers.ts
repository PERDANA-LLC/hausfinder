import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createProperty, updateProperty, getPropertyById, getPropertyWithOwner,
  getUserProperties, searchProperties, getFeaturedProperties, incrementPropertyViews,
  deactivateProperty, activateProperty,
  addPropertyImages, getPropertyImages, deletePropertyImage, setPrimaryImage,
  toggleFavorite, getUserFavorites, getUserFavoriteIds, isFavorite,
  createInquiry, getPropertyInquiries, getUserInquiries, markInquiryAsRead, getUnreadInquiryCount,
  getPropertiesForMap, getUserById
} from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  property: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        price: z.number().positive(),
        propertyType: z.enum(["house", "apartment", "land", "commercial"]),
        status: z.enum(["rent", "sale"]),
        bedrooms: z.number().int().min(0).optional(),
        bathrooms: z.number().int().min(0).optional(),
        area: z.number().positive().optional(),
        location: z.string().min(1).max(255),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        amenities: z.string().optional(),
        images: z.array(z.object({
          base64: z.string(),
          filename: z.string(),
          mimeType: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const propertyId = await createProperty({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          price: input.price.toString(),
          propertyType: input.propertyType,
          status: input.status,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          area: input.area?.toString(),
          location: input.location,
          address: input.address,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          amenities: input.amenities,
        });

        if (input.images && input.images.length > 0) {
          const imageRecords = await Promise.all(
            input.images.map(async (img, index) => {
              const buffer = Buffer.from(img.base64, 'base64');
              const fileKey = `properties/${propertyId}/${nanoid()}-${img.filename}`;
              const { url } = await storagePut(fileKey, buffer, img.mimeType);
              return {
                propertyId,
                url,
                fileKey,
                isPrimary: index === 0,
                sortOrder: index,
              };
            })
          );
          await addPropertyImages(imageRecords);
        }

        return { id: propertyId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        propertyType: z.enum(["house", "apartment", "land", "commercial"]).optional(),
        status: z.enum(["rent", "sale"]).optional(),
        bedrooms: z.number().int().min(0).optional(),
        bathrooms: z.number().int().min(0).optional(),
        area: z.number().positive().optional(),
        location: z.string().min(1).max(255).optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        amenities: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        
        if (data.title) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.price) updateData.price = data.price.toString();
        if (data.propertyType) updateData.propertyType = data.propertyType;
        if (data.status) updateData.status = data.status;
        if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
        if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
        if (data.area !== undefined) updateData.area = data.area?.toString();
        if (data.location) updateData.location = data.location;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.latitude !== undefined) updateData.latitude = data.latitude?.toString();
        if (data.longitude !== undefined) updateData.longitude = data.longitude?.toString();
        if (data.amenities !== undefined) updateData.amenities = data.amenities;

        await updateProperty(id, ctx.user.id, updateData as any);
        return { success: true };
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getPropertyWithOwner(input.id);
        if (!result) return null;
        
        await incrementPropertyViews(input.id);
        const images = await getPropertyImages(input.id);
        
        return {
          ...result.property,
          owner: result.owner,
          images,
        };
      }),

    getMyListings: protectedProcedure.query(async ({ ctx }) => {
      const props = await getUserProperties(ctx.user.id);
      const propsWithImages = await Promise.all(
        props.map(async (p) => {
          const images = await getPropertyImages(p.id);
          return { ...p, images };
        })
      );
      return propsWithImages;
    }),

    search: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        status: z.enum(["rent", "sale"]).optional(),
        propertyType: z.enum(["house", "apartment", "land", "commercial"]).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const result = await searchProperties(input);
        const propsWithImages = await Promise.all(
          result.properties.map(async (p) => {
            const images = await getPropertyImages(p.id);
            return { ...p, images };
          })
        );
        return {
          properties: propsWithImages,
          total: result.total,
        };
      }),

    featured: publicProcedure
      .input(z.object({ limit: z.number().default(6) }))
      .query(async ({ input }) => {
        const props = await getFeaturedProperties(input.limit);
        const propsWithImages = await Promise.all(
          props.map(async (p) => {
            const images = await getPropertyImages(p.id);
            return { ...p, images };
          })
        );
        return propsWithImages;
      }),

    deactivate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deactivateProperty(input.id, ctx.user.id);
        return { success: true };
      }),

    activate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await activateProperty(input.id, ctx.user.id);
        return { success: true };
      }),

    forMap: publicProcedure.query(async () => {
      return getPropertiesForMap();
    }),
  }),

  image: router({
    upload: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        images: z.array(z.object({
          base64: z.string(),
          filename: z.string(),
          mimeType: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await getPropertyById(input.propertyId);
        if (!property || property.userId !== ctx.user.id) {
          throw new Error("Property not found or unauthorized");
        }

        const existingImages = await getPropertyImages(input.propertyId);
        const startOrder = existingImages.length;

        const imageRecords = await Promise.all(
          input.images.map(async (img, index) => {
            const buffer = Buffer.from(img.base64, 'base64');
            const fileKey = `properties/${input.propertyId}/${nanoid()}-${img.filename}`;
            const { url } = await storagePut(fileKey, buffer, img.mimeType);
            return {
              propertyId: input.propertyId,
              url,
              fileKey,
              isPrimary: existingImages.length === 0 && index === 0,
              sortOrder: startOrder + index,
            };
          })
        );

        await addPropertyImages(imageRecords);
        return { success: true, count: imageRecords.length };
      }),

    delete: protectedProcedure
      .input(z.object({ imageId: z.number(), propertyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const property = await getPropertyById(input.propertyId);
        if (!property || property.userId !== ctx.user.id) {
          throw new Error("Property not found or unauthorized");
        }
        await deletePropertyImage(input.imageId, input.propertyId);
        return { success: true };
      }),

    setPrimary: protectedProcedure
      .input(z.object({ imageId: z.number(), propertyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const property = await getPropertyById(input.propertyId);
        if (!property || property.userId !== ctx.user.id) {
          throw new Error("Property not found or unauthorized");
        }
        await setPrimaryImage(input.imageId, input.propertyId);
        return { success: true };
      }),
  }),

  favorite: router({
    toggle: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isFav = await toggleFavorite(ctx.user.id, input.propertyId);
        return { isFavorite: isFav };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserFavorites(ctx.user.id);
    }),

    ids: protectedProcedure.query(async ({ ctx }) => {
      return getUserFavoriteIds(ctx.user.id);
    }),

    check: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ ctx, input }) => {
        return isFavorite(ctx.user.id, input.propertyId);
      }),
  }),

  inquiry: router({
    create: publicProcedure
      .input(z.object({
        propertyId: z.number(),
        senderName: z.string().min(1),
        senderEmail: z.string().email(),
        senderPhone: z.string().optional(),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const property = await getPropertyWithOwner(input.propertyId);
        if (!property) throw new Error("Property not found");

        const inquiryId = await createInquiry({
          propertyId: input.propertyId,
          senderId: ctx.user?.id,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          senderPhone: input.senderPhone,
          message: input.message,
        });

        // Send notification to property owner
        if (property.owner?.email) {
          await notifyOwner({
            title: `New Inquiry for: ${property.property.title}`,
            content: `You have received a new inquiry from ${input.senderName} (${input.senderEmail}).\n\nMessage: ${input.message}\n\nProperty: ${property.property.title}\nLocation: ${property.property.location}`,
          });
        }

        return { id: inquiryId };
      }),

    forProperty: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const property = await getPropertyById(input.propertyId);
        if (!property || property.userId !== ctx.user.id) {
          throw new Error("Property not found or unauthorized");
        }
        return getPropertyInquiries(input.propertyId);
      }),

    myInquiries: protectedProcedure.query(async ({ ctx }) => {
      return getUserInquiries(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markInquiryAsRead(input.id, ctx.user.id);
        return { success: true };
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadInquiryCount(ctx.user.id);
    }),
  }),

  ai: router({
    generateDescription: protectedProcedure
      .input(z.object({
        title: z.string(),
        propertyType: z.enum(["house", "apartment", "land", "commercial"]),
        status: z.enum(["rent", "sale"]),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        area: z.number().optional(),
        location: z.string(),
        amenities: z.string().optional(),
        additionalInfo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = `You are a professional real estate copywriter specializing in the Solomon Islands market. Write a compelling, engaging property description for a listing in Honiara.

Property Details:
- Title: ${input.title}
- Type: ${input.propertyType}
- Listing Type: For ${input.status}
- Location: ${input.location}, Honiara, Solomon Islands
${input.bedrooms ? `- Bedrooms: ${input.bedrooms}` : ''}
${input.bathrooms ? `- Bathrooms: ${input.bathrooms}` : ''}
${input.area ? `- Area: ${input.area} sqm` : ''}
${input.amenities ? `- Amenities: ${input.amenities}` : ''}
${input.additionalInfo ? `- Additional Info: ${input.additionalInfo}` : ''}

Write a 150-200 word description that:
1. Highlights the property's best features
2. Mentions the location benefits in Honiara
3. Appeals to potential ${input.status === 'rent' ? 'tenants' : 'buyers'}
4. Uses professional but warm language
5. Includes a call to action

Return ONLY the description text, no additional formatting or labels.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional real estate copywriter." },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices[0]?.message?.content;
        const description = typeof content === 'string' ? content.trim() : '';
        return { description };
      }),
  }),
});

export type AppRouter = typeof appRouter;
