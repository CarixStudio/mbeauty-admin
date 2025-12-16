
import { z } from 'zod';

export const OrderStatusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

export const CustomerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional().nullable(),
  role: z.enum(['customer', 'vip']),
});

export const OrderUpdateSchema = z.object({
  status: OrderStatusSchema,
  updated_at: z.string().optional() // For optimistic concurrency
});

export const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().int().min(0),
  sku: z.string().optional(),
});
