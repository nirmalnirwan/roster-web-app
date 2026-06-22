import { Roster } from '../../lib/types';
import { apiClient } from './apiClient';

export async function getRosters(): Promise<Roster[]> {
  const res = await apiClient.get('/rosters');
  return (await res.json()) as Roster[];
}

export async function getRoster(id: number): Promise<Roster> {
  const res = await apiClient.get(`/rosters/${id}`);
  return (await res.json()) as Roster;
}

export async function getRosterByWeek(housekeeperId: number, weekStartDate: string): Promise<Roster | null> {
  const query = new URLSearchParams({ housekeeperId: housekeeperId.toString(), weekStartDate });
  const res = await apiClient.getOptional(`/rosters/by-week?${query.toString()}`);
  if (res.status === 404) return null;
  return (await res.json()) as Roster;
}

export async function createRoster(roster: Roster): Promise<Roster> {
  const res = await apiClient.post('/rosters', roster);
  return (await res.json()) as Roster;
}

export async function updateRoster(id: number, roster: Roster): Promise<void> {
  await apiClient.put(`/rosters/${id}`, roster);
}

export async function deleteRoster(id: number): Promise<void> {
  await apiClient.delete(`/rosters/${id}`);
}

export async function exportRosterPdf(id: number): Promise<Blob> {
  const res = await apiClient.get(`/rosters/${id}/export/pdf`);
  return res.blob();
}

export async function exportRosterExcel(id: number): Promise<Blob> {
  const res = await apiClient.get(`/rosters/${id}/export/excel`);
  return res.blob();
}

