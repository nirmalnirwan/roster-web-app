import { apiClient } from './apiClient';
import type { CreateHousekeeperRequest, Housekeeper } from '@/lib/types';

export async function getHousekeepers(): Promise<Housekeeper[]> {
  const res = await apiClient.get('/housekeepers');
  return (await res.json()) as Housekeeper[];
}

export async function createHousekeeper(
  housekeeper: CreateHousekeeperRequest
): Promise<Housekeeper> {
  const res = await apiClient.post('/housekeepers', housekeeper);
  return (await res.json()) as Housekeeper;
}

export async function deleteHousekeeper(id: number): Promise<void> {
  await apiClient.delete(`/housekeepers/${id}`);
}
