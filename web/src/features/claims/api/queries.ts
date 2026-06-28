"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { claimsRepository } from "@/data/repositories/claims.repo";
import type { Claim, ClaimStatus } from "@/core/domain/types";

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

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      actorName,
      actorRole,
      reason,
    }: {
      id: string;
      status: ClaimStatus;
      actorName: string;
      actorRole: string;
      reason?: string;
    }) => claimsRepository.updateStatus(id, status, actorName, actorRole, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

export function useAddClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimData: any) => claimsRepository.addClaim(claimData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

export function useAddClaimComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      actorName,
      actorRole,
      commentText,
    }: {
      id: string;
      actorName: string;
      actorRole: string;
      commentText: string;
    }) => claimsRepository.addActivityComment(id, actorName, actorRole, commentText),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: claimKeys.activity(variables.id) });
    },
  });
}

export function useUpdateClaimFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<Claim>;
    }) => claimsRepository.updateClaimFields(id, fields),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

