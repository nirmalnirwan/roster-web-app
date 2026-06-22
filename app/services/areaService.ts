import { apiClient } from './apiClient';
import type {
  Apartment,
  ApartmentRequest,
  CommonArea,
  CommonAreaRequest,
  Unit,
  UnitRequest,
} from '@/lib/types';

export async function getCommonAreas(): Promise<CommonArea[]> {
  const res = await apiClient.get('/commonareas');
  return (await res.json()) as CommonArea[];
}

export async function getCommonAreasByFloor(floorId: number): Promise<CommonArea[]> {
  const res = await apiClient.get(`/commonareas/by-floor/${floorId}`);
  return (await res.json()) as CommonArea[];
}

export async function createCommonArea(area: CommonAreaRequest): Promise<CommonArea> {
  const res = await apiClient.post('/commonareas', area);
  return (await res.json()) as CommonArea;
}

export async function updateCommonArea(id: number, area: CommonAreaRequest): Promise<void> {
  await apiClient.put(`/commonareas/${id}`, area);
}

export async function deleteCommonArea(id: number): Promise<void> {
  await apiClient.delete(`/commonareas/${id}`);
}

export async function getUnits(): Promise<Unit[]> {
  const res = await apiClient.get('/units');
  return (await res.json()) as Unit[];
}

export async function getUnitsByFloor(floorId: number): Promise<Unit[]> {
  const res = await apiClient.get(`/units/by-floor/${floorId}`);
  return (await res.json()) as Unit[];
}

export async function createUnit(unit: UnitRequest): Promise<Unit> {
  const res = await apiClient.post('/units', unit);
  return (await res.json()) as Unit;
}

export async function updateUnit(id: number, unit: UnitRequest): Promise<void> {
  await apiClient.put(`/units/${id}`, unit);
}

export async function deleteUnit(id: number): Promise<void> {
  await apiClient.delete(`/units/${id}`);
}

export async function getApartments(): Promise<Apartment[]> {
  const res = await apiClient.get('/apartments');
  return (await res.json()) as Apartment[];
}

export async function getApartmentsByFloor(floorId: number): Promise<Apartment[]> {
  const res = await apiClient.get(`/apartments/by-floor/${floorId}`);
  return (await res.json()) as Apartment[];
}

export async function createApartment(apartment: ApartmentRequest): Promise<Apartment> {
  const res = await apiClient.post('/apartments', apartment);
  return (await res.json()) as Apartment;
}

export async function updateApartment(id: number, apartment: ApartmentRequest): Promise<void> {
  await apiClient.put(`/apartments/${id}`, apartment);
}

export async function deleteApartment(id: number): Promise<void> {
  await apiClient.delete(`/apartments/${id}`);
}
