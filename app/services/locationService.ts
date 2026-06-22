import { apiClient } from './apiClient';
import type {
  BuildingBlock,
  BuildingBlockRequest,
  Floor,
  FloorRequest,
  LocationType,
  LocationTypeRequest,
} from '@/lib/types';

export async function getLocationTypes(): Promise<LocationType[]> {
  const res = await apiClient.get('/locationtypes');
  return (await res.json()) as LocationType[];
}

export async function createLocationType(locationType: LocationTypeRequest): Promise<LocationType> {
  const res = await apiClient.post('/locationtypes', locationType);
  return (await res.json()) as LocationType;
}

export async function updateLocationType(id: number, locationType: LocationTypeRequest): Promise<void> {
  await apiClient.put(`/locationtypes/${id}`, locationType);
}

export async function deleteLocationType(id: number): Promise<void> {
  await apiClient.delete(`/locationtypes/${id}`);
}

export async function createBuildingBlock(buildingBlock: BuildingBlockRequest): Promise<BuildingBlock> {
  const res = await apiClient.post('/buildingblocks', buildingBlock);
  return (await res.json()) as BuildingBlock;
}

export async function updateBuildingBlock(id: number, buildingBlock: BuildingBlockRequest): Promise<void> {
  await apiClient.put(`/buildingblocks/${id}`, buildingBlock);
}

export async function deleteBuildingBlock(id: number): Promise<void> {
  await apiClient.delete(`/buildingblocks/${id}`);
}

export async function createFloor(floor: FloorRequest): Promise<Floor> {
  const res = await apiClient.post('/floors', floor);
  return (await res.json()) as Floor;
}

export async function updateFloor(id: number, floor: FloorRequest): Promise<void> {
  await apiClient.put(`/floors/${id}`, floor);
}

export async function deleteFloor(id: number): Promise<void> {
  await apiClient.delete(`/floors/${id}`);
}
