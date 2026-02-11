
import { z } from 'zod';
import { insertBillSchema, bills } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  bills: {
    list: {
      method: 'GET' as const,
      path: '/api/bills' as const,
      input: z.object({
        month: z.string().optional(), // format: MM
        year: z.string().optional(),  // format: YYYY
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof bills.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bills' as const,
      input: insertBillSchema,
      responses: {
        201: z.custom<typeof bills.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/bills/:id' as const,
      responses: {
        200: z.custom<typeof bills.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bills/:id' as const,
      input: insertBillSchema.partial(),
      responses: {
        200: z.custom<typeof bills.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/bills/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Derived types
export type BillInput = z.infer<typeof api.bills.create.input>;
export type BillUpdateInput = z.infer<typeof api.bills.update.input>;
export type BillResponse = z.infer<typeof api.bills.create.responses[201]>;
