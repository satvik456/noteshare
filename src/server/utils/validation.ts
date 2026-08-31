import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  content: z.string().min(1, "Content is required"),
  expiresAt: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    }, "Expiry must be a valid future date/time"),
  shareType: z.enum(["one_time", "time_based"]),
  accessType: z.enum(["public", "password"]),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const unlockShareSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
});

export type UnlockShareInput = z.infer<typeof unlockShareSchema>;
