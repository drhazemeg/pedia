// packages/shared/src/schemas/clinic/rooms-beds.ts
import { numericStringSchema, uuidSchema } from "@pedia/shared/schemas/_helper";
import { bedStatusSchema, roomTypeSchema } from "@pedia/shared/schemas/enums";
import { z } from "zod";

export const roomSchema = z.object({
  id: uuidSchema,
  wardId: uuidSchema,
  roomNumber: z.string().max(50),
  roomType: roomTypeSchema,
  dailyRate: numericStringSchema,
  isActive: z.boolean(),
});

export const newRoomSchema = roomSchema.omit({ id: true });
export const roomUpdateSchema = newRoomSchema.partial();

export const bedSchema = z.object({
  id: uuidSchema,
  roomId: uuidSchema,
  bedNumber: z.string().max(50),
  status: bedStatusSchema,
  isActive: z.boolean(),
});

export const newBedSchema = bedSchema.omit({ id: true });
export const bedUpdateSchema = newBedSchema.partial();

export const bedAllocationSchema = z.object({
  id: uuidSchema,
  admissionId: uuidSchema,
  bedId: uuidSchema,
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
  allocatedById: uuidSchema,
  endedById: uuidSchema.nullable(),
  transferReason: z.string().max(500).nullable(),
});

export const newBedAllocationSchema = bedAllocationSchema.omit({ id: true });

export type Room = z.infer<typeof roomSchema>;
export type NewRoom = z.infer<typeof newRoomSchema>;
export type Bed = z.infer<typeof bedSchema>;
export type NewBed = z.infer<typeof newBedSchema>;
export type BedAllocation = z.infer<typeof bedAllocationSchema>;
export type NewBedAllocation = z.infer<typeof newBedAllocationSchema>;
