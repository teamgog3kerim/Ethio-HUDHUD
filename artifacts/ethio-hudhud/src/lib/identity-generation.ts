import type { QueryClient } from '@tanstack/react-query';

// A generation, rather than an owner ID, also rejects work from A → B → A.
// Scope it to the query client so separate app roots cannot affect each other.
const generations = new WeakMap<QueryClient, number>();

export const getIdentityGeneration = (client: QueryClient) => generations.get(client) ?? 0;
export const advanceIdentityGeneration = (client: QueryClient) => {
  generations.set(client, getIdentityGeneration(client) + 1);
};
