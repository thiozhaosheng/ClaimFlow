"use client";

import { useQuery } from "@tanstack/react-query";
import { claimsRepository } from "@/data/repositories/claims.repo";

/** Query keys — centralised for cache invalidation safety. */
export const claimKeys = {
  all: ["claims"] as const,
  list: () => [...claimKeys.all, "list"] as const,
  detail: (id: string) => [...claimKeys.all, "detail", id] as const,
  activity: (id: string) => [...claimKeys.all, "activity", id] as const,
};

export function useClaims() {
  return useQuery({
    queryKey: claimKeys.list(),
    queryFn: () => claimsRepository.list(),
  });
}

export function useClaim(id: string) {
  return useQuery({
    queryKey: claimKeys.detail(id),
    queryFn: () => claimsRepository.getById(id),
    enabled: Boolean(id),
  });
}

export function useClaimActivity(id: string) {
  return useQuery({
    queryKey: claimKeys.activity(id),
    queryFn: () => claimsRepository.activityFor(id),
    enabled: Boolean(id),
  });
}
