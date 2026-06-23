/**
 * Claims repository — the boundary between UI and data source.
 * The app depends on the `ClaimsRepository` interface (Dependency Inversion);
 * today it's backed by mock data, tomorrow by the REST/GraphQL API with the
 * same contract. Async by design so swapping to the network is transparent.
 */
import type { Claim, ClaimActivity } from "@/core/domain/types";
import { MOCK_CLAIMS, MOCK_ACTIVITY } from "@/data/mock/claims";

export interface ClaimsRepository {
  list(): Promise<Claim[]>;
  getById(id: string): Promise<Claim | null>;
  activityFor(id: string): Promise<ClaimActivity[]>;
}

const latency = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const mockClaimsRepository: ClaimsRepository = {
  async list() {
    await latency();
    return structuredClone(MOCK_CLAIMS);
  },
  async getById(id) {
    await latency(180);
    return structuredClone(MOCK_CLAIMS.find((c) => c.id === id) ?? null);
  },
  async activityFor(_id) {
    await latency(120);
    // Demo: surface a few activity rows; in prod this is filtered per-claim.
    return structuredClone(MOCK_ACTIVITY).slice(0, 3);
  },
};

/** Single inject point — swap for an ApiClaimsRepository later. */
export const claimsRepository: ClaimsRepository = mockClaimsRepository;
