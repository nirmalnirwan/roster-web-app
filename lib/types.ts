export interface Housekeeper {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  employmentType: EmployeeType;
}

export type EmployeeType = 'Permanent' | 'Casual';

export interface CreateHousekeeperRequest {
  name: string;
  phone: string;
  email: string;
  status: string;
  employmentType: EmployeeType;
}

export interface Resident {
  id: number;
  name: string;
  roomNumber: string;
  building: string;
  cleaningFrequency: string;
  notes: string;
  unitId?: number;
  unitName?: string;
  apartmentId?: number;
  apartmentName?: string;
  assignmentType: 'Unit' | 'Apartment' | 'Unassigned';
  assignmentName: string;
}

export interface ResidentRequest {
  name: string;
  roomNumber: string;
  building: string;
  cleaningFrequency: string;
  notes: string;
  unitId?: number;
  apartmentId?: number;
}

export interface Location {
  id: number;
  name: string;
  locationType: string;
  building: string;
  floor: string;
  notes: string;
}

export interface LocationType {
  id: number;
  name: string;
  buildingBlocks: BuildingBlock[];
}

export interface LocationTypeRequest {
  name: string;
}

export interface BuildingBlock {
  id: number;
  name: string;
  locationTypeId: number;
  locationTypeName: string;
  floors: Floor[];
}

export interface BuildingBlockRequest {
  name: string;
  locationTypeId: number;
}

export interface Floor {
  id: number;
  name: string;
  floorNumber: number;
  buildingBlockId: number;
  buildingBlockName: string;
}

export interface FloorRequest {
  name: string;
  floorNumber: number;
  buildingBlockId: number;
}

export interface CommonArea {
  id: number;
  name: string;
  description: string;
  floorId: number;
  floorName: string;
  buildingBlockId: number;
  buildingBlockName: string;
  locationTypeId: number;
  locationTypeName: string;
  cleaningTaskId?: number;
  cleaningTaskName?: string;
}

export interface CommonAreaRequest {
  name: string;
  description: string;
  floorId: number;
  cleaningTaskId: number;
}

export interface Unit {
  id: number;
  name: string;
  unitNumber: string;
  notes: string;
  floorId: number;
  floorName: string;
  buildingBlockId: number;
  buildingBlockName: string;
  locationTypeId: number;
  locationTypeName: string;
  cleaningTaskId?: number;
  cleaningTaskName?: string;
  residentId?: number;
  residentName?: string;
}

export interface UnitRequest {
  name: string;
  unitNumber: string;
  notes: string;
  floorId: number;
  cleaningTaskId: number;
}

export interface Apartment {
  id: number;
  name: string;
  apartmentNumber: string;
  notes: string;
  floorId: number;
  floorName: string;
  buildingBlockId: number;
  buildingBlockName: string;
  locationTypeId: number;
  locationTypeName: string;
  cleaningTaskId?: number;
  cleaningTaskName?: string;
  residentId?: number;
  residentName?: string;
}

export interface ApartmentRequest {
  name: string;
  apartmentNumber: string;
  notes: string;
  floorId: number;
  cleaningTaskId: number;
}

export interface AssignableArea {
  id: number;
  name: string;
  number: string;
  areaType: 'Unit' | 'Apartment';
  floorId: number;
  floorName: string;
  buildingBlockId: number;
  buildingBlockName: string;
  locationTypeId: number;
  locationTypeName: string;
}

export interface CleaningTask {
  id: number;
  name: string;
  description: string;
  taskCategory: CleaningTaskCategory;
  estimatedDuration: number;
  frequency: string;
}

export type CleaningTaskCategory =
  | 'CommunityArea'
  | 'Apartment'
  | 'Unit'
  | 'SpecialTask';

export interface CleaningTaskRequest {
  name: string;
  description: string;
  taskCategory: CleaningTaskCategory;
  estimatedDuration: number;
  frequency: string;
}

export type RosterAreaType = 'CommonArea' | 'Unit' | 'Apartment';

export interface RosterTask {
  id: number;
  rosterId: number;
  housekeeperId: number;
  housekeeperName: string;
  taskId: number;
  taskName: string;
  locationId?: number;
  locationName?: string;
  commonAreaId?: number;
  commonAreaName?: string;
  unitId?: number;
  unitName?: string;
  apartmentId?: number;
  apartmentName?: string;
  areaType: RosterAreaType | '';
  areaName: string;
  residentId?: number;
  residentName?: string;
  scheduledDate: string;
  startTime: string; // HH:mm:ss format
  endTime: string;
  frequencyType: string;
  notes: string;
}

export interface Roster {
  id: number;
  housekeeperId: number;
  housekeeperName: string;
  weekStartDate: string;
  createdBy: string;
  createdDate: string;
  rosterTasks: RosterTask[];
}


