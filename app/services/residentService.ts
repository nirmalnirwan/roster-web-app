import { apiClient } from './apiClient';
import type { AssignableArea, Resident, ResidentRequest } from '@/lib/types';

export async function getResidents(): Promise<Resident[]> {
  const res = await apiClient.get('/residents');
  return (await res.json()) as Resident[];
}

export async function getAssignableAreas(): Promise<AssignableArea[]> {
  const res = await apiClient.get('/residents/assignable-areas');
  return (await res.json()) as AssignableArea[];
}

export async function createResident(resident: ResidentRequest): Promise<Resident> {
  const res = await apiClient.post('/residents', resident);
  return (await res.json()) as Resident;
}

export async function updateResident(id: number, resident: ResidentRequest): Promise<void> {
  await apiClient.put(`/residents/${id}`, resident);
}

export async function deleteResident(id: number): Promise<void> {
  await apiClient.delete(`/residents/${id}`);
}
