import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type BillInput, type BillUpdateInput } from "@shared/routes";
import { z } from "zod";

// Helper to validate and parse backend response
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    // In production we might want to throw, but for dev resilience we return raw data casted or throw
    throw result.error;
  }
  return result.data;
}

export function useBills(month?: string, year?: string) {
  return useQuery({
    queryKey: [api.bills.list.path, month, year],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (year) params.append("year", year);
      
      const url = `${api.bills.list.path}?${params.toString()}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data tagihan");
      
      const data = await res.json();
      return parseWithLogging(api.bills.list.responses[200], data, "bills.list");
    },
  });
}

export function useBill(id: number) {
  return useQuery({
    queryKey: [api.bills.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.bills.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Gagal mengambil detail tagihan");
      
      const data = await res.json();
      return parseWithLogging(api.bills.get.responses[200], data, "bills.get");
    },
    enabled: !!id,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BillInput) => {
      // Ensure numeric fields are strings if schema requires, though schema handles transform
      // We pass the raw input object which matches insertBillSchema
      
      const res = await fetch(api.bills.create.path, {
        method: api.bills.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validasi gagal");
        }
        throw new Error("Gagal membuat tagihan");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.bills.create.responses[201], responseData, "bills.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bills.list.path] });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & BillUpdateInput) => {
      const url = buildUrl(api.bills.update.path, { id });
      
      const res = await fetch(url, {
        method: api.bills.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Tagihan tidak ditemukan");
        throw new Error("Gagal mengupdate tagihan");
      }
      
      const responseData = await res.json();
      return parseWithLogging(api.bills.update.responses[200], responseData, "bills.update");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.bills.get.path, variables.id] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bills.delete.path, { id });
      const res = await fetch(url, { 
        method: api.bills.delete.method, 
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Tagihan tidak ditemukan");
        throw new Error("Gagal menghapus tagihan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bills.list.path] });
    },
  });
}
