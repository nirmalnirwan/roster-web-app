'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  DoorOpen,
  Edit,
  Home,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  createApartment,
  createCommonArea,
  createUnit,
  deleteApartment,
  deleteCommonArea,
  deleteUnit,
  getApartments,
  getCommonAreas,
  getUnits,
  updateApartment,
  updateCommonArea,
  updateUnit,
} from '@/app/services/areaService';
import { getCleaningTasks } from '@/app/services/cleaningTaskService';
import useRequireAuth from '../hooks/useRequireAuth';
import {
  createBuildingBlock,
  createFloor,
  deleteBuildingBlock,
  deleteFloor,
  getLocationTypes,
  updateBuildingBlock,
  updateFloor,
} from '@/app/services/locationService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  Apartment,
  ApartmentRequest,
  BuildingBlock,
  BuildingBlockRequest,
  CommonArea,
  CommonAreaRequest,
  CleaningTask,
  Floor,
  FloorRequest,
  LocationType,
  Unit,
  UnitRequest,
} from '@/lib/types';

type BuildingFormState = BuildingBlockRequest;
type FloorFormState = FloorRequest;
type AreaKind = 'commonArea' | 'unit' | 'apartment';
type AreaItem = CommonArea | Unit | Apartment;

type BuildingFormErrors = Partial<Record<keyof BuildingFormState, string>>;
type FloorFormErrors = Partial<Record<keyof FloorFormState, string>>;
type AreaFormErrors = Partial<Record<'name' | 'number' | 'floorId' | 'cleaningTaskId', string>>;

interface AreaFormState {
  name: string;
  number: string;
  notes: string;
  floorId: number;
  cleaningTaskId: number;
}

interface FloorOption extends Floor {
  locationTypeName: string;
}

const initialBuildingForm: BuildingFormState = {
  name: '',
  locationTypeId: 0,
};

const initialFloorForm: FloorFormState = {
  name: '',
  floorNumber: 1,
  buildingBlockId: 0,
};

const initialAreaForm: AreaFormState = {
  name: '',
  number: '',
  notes: '',
  floorId: 0,
  cleaningTaskId: 0,
};

const areaMeta: Record<AreaKind, { label: string; plural: string; numberLabel?: string }> = {
  commonArea: { label: 'Common Area', plural: 'Common Areas' },
  unit: { label: 'Unit', plural: 'Units', numberLabel: 'Unit number' },
  apartment: { label: 'Apartment', plural: 'Apartments', numberLabel: 'Apartment number' },
};

export default function LocationsPage() {
  useRequireAuth();

  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [buildingFormOpen, setBuildingFormOpen] = useState(false);
  const [floorFormOpen, setFloorFormOpen] = useState(false);
  const [areaFormOpen, setAreaFormOpen] = useState(false);

  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [areaKind, setAreaKind] = useState<AreaKind>('commonArea');

  const [buildingForm, setBuildingForm] = useState<BuildingFormState>(initialBuildingForm);
  const [floorForm, setFloorForm] = useState<FloorFormState>(initialFloorForm);
  const [areaForm, setAreaForm] = useState<AreaFormState>(initialAreaForm);
  const [buildingErrors, setBuildingErrors] = useState<BuildingFormErrors>({});
  const [floorErrors, setFloorErrors] = useState<FloorFormErrors>({});
  const [areaErrors, setAreaErrors] = useState<AreaFormErrors>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      try {
        const data = await loadLocationWorkspace();
        if (active) {
          setLocationTypes(data.locationTypes);
          setCommonAreas(data.commonAreas);
          setUnits(data.units);
          setApartments(data.apartments);
          setCleaningTasks(data.cleaningTasks);
          setLoadError(null);
        }
      } catch (error) {
        console.error('Failed to load locations', error);
        if (active) setLoadError('Failed to load locations. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    return () => {
      active = false;
    };
  }, []);

  const buildingBlocks = useMemo(
    () => locationTypes.flatMap((locationType) => locationType.buildingBlocks),
    [locationTypes]
  );

  const allFloors = useMemo(
    () =>
      locationTypes.flatMap((locationType) =>
        locationType.buildingBlocks.flatMap((buildingBlock) =>
          buildingBlock.floors.map((floor) => ({
            ...floor,
            buildingBlockName: buildingBlock.name,
            locationTypeName: locationType.name,
          }))
        )
      ),
    [locationTypes]
  );

  const commonAreasByFloor = useMemo(() => groupByFloor(commonAreas), [commonAreas]);
  const unitsByFloor = useMemo(() => groupByFloor(units), [units]);
  const apartmentsByFloor = useMemo(() => groupByFloor(apartments), [apartments]);
  const compatibleCleaningTasks = useMemo(
    () => getCompatibleCleaningTasks(cleaningTasks, areaKind),
    [areaKind, cleaningTasks]
  );

  const refreshWorkspace = async () => {
    const data = await loadLocationWorkspace();
    setLocationTypes(data.locationTypes);
    setCommonAreas(data.commonAreas);
    setUnits(data.units);
    setApartments(data.apartments);
    setCleaningTasks(data.cleaningTasks);
  };

  const isCollapsed = (key: string) => !expandedSections.has(key);

  const toggleCollapse = (key: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openCreateBuildingForm = () => {
    setBuildingForm({
      ...initialBuildingForm,
      locationTypeId: locationTypes[0]?.id ?? 0,
    });
    setBuildingErrors({});
    setEditingBuildingId(null);
    setBuildingFormOpen(true);
  };

  const openEditBuildingForm = (buildingBlock: BuildingBlock) => {
    setBuildingForm({
      name: buildingBlock.name,
      locationTypeId: buildingBlock.locationTypeId,
    });
    setBuildingErrors({});
    setEditingBuildingId(buildingBlock.id);
    setBuildingFormOpen(true);
  };

  const closeBuildingForm = () => {
    setBuildingForm(initialBuildingForm);
    setBuildingErrors({});
    setEditingBuildingId(null);
    setBuildingFormOpen(false);
  };

  const openCreateFloorForm = (buildingBlockId?: number) => {
    setFloorForm({
      ...initialFloorForm,
      buildingBlockId: buildingBlockId ?? buildingBlocks[0]?.id ?? 0,
    });
    setFloorErrors({});
    setEditingFloorId(null);
    setFloorFormOpen(true);
  };

  const openEditFloorForm = (floor: Floor) => {
    setFloorForm({
      name: floor.name,
      floorNumber: floor.floorNumber,
      buildingBlockId: floor.buildingBlockId,
    });
    setFloorErrors({});
    setEditingFloorId(floor.id);
    setFloorFormOpen(true);
  };

  const closeFloorForm = () => {
    setFloorForm(initialFloorForm);
    setFloorErrors({});
    setEditingFloorId(null);
    setFloorFormOpen(false);
  };

  const openCreateAreaForm = (kind: AreaKind, floorId: number) => {
    const availableTasks = getCompatibleCleaningTasks(cleaningTasks, kind);
    setAreaKind(kind);
    setAreaForm({
      ...initialAreaForm,
      floorId,
      cleaningTaskId: availableTasks[0]?.id ?? 0,
    });
    setAreaErrors({});
    setEditingAreaId(null);
    setAreaFormOpen(true);
  };

  const openEditAreaForm = (kind: AreaKind, item: AreaItem) => {
    setAreaKind(kind);
    setAreaForm({
      name: item.name,
      number: getAreaNumber(kind, item),
      notes: 'description' in item ? item.description : item.notes,
      floorId: item.floorId,
      cleaningTaskId: item.cleaningTaskId ?? 0,
    });
    setAreaErrors({});
    setEditingAreaId(item.id);
    setAreaFormOpen(true);
  };

  const closeAreaForm = () => {
    setAreaForm(initialAreaForm);
    setAreaErrors({});
    setEditingAreaId(null);
    setAreaFormOpen(false);
  };

  const handleBuildingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = {
      ...buildingForm,
      name: buildingForm.name.trim(),
    };
    const validationErrors = validateBuildingForm(normalized);
    setBuildingErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      if (editingBuildingId) {
        await updateBuildingBlock(editingBuildingId, normalized);
        toast.success('Building block updated');
      } else {
        await createBuildingBlock(normalized);
        toast.success('Building block created');
      }

      await refreshWorkspace();
      closeBuildingForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save building block.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFloorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = {
      ...floorForm,
      name: floorForm.name.trim(),
      floorNumber: Number(floorForm.floorNumber),
    };
    const validationErrors = validateFloorForm(normalized);
    setFloorErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      if (editingFloorId) {
        await updateFloor(editingFloorId, normalized);
        toast.success('Floor updated');
      } else {
        await createFloor(normalized);
        toast.success('Floor created');
      }

      await refreshWorkspace();
      closeFloorForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAreaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = {
      ...areaForm,
      name: areaForm.name.trim(),
      number: areaForm.number.trim(),
      notes: areaForm.notes.trim(),
    };
    const validationErrors = validateAreaForm(normalized, areaKind);
    setAreaErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      if (editingAreaId) {
        await updateArea(areaKind, editingAreaId, normalized);
        updateAreaInState(areaKind, editingAreaId, normalized);
        toast.success(`${areaMeta[areaKind].label} updated`);
      } else {
        const created = await createArea(areaKind, normalized);
        addAreaToState(areaKind, created);
        toast.success(`${areaMeta[areaKind].label} created`);
      }
      closeAreaForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${areaMeta[areaKind].label.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const addAreaToState = (kind: AreaKind, item: AreaItem) => {
    if (kind === 'commonArea') {
      setCommonAreas((current) => [...current, item as CommonArea]);
      return;
    }

    if (kind === 'unit') {
      setUnits((current) => [...current, item as Unit]);
      return;
    }

    setApartments((current) => [...current, item as Apartment]);
  };

  const updateAreaInState = (kind: AreaKind, id: number, form: AreaFormState) => {
    if (kind === 'commonArea') {
      setCommonAreas((current) =>
        current.map((area) =>
          area.id === id
            ? {
                ...area,
                name: form.name,
                description: form.notes,
                cleaningTaskId: form.cleaningTaskId,
                cleaningTaskName: cleaningTasks.find((task) => task.id === form.cleaningTaskId)?.name,
              }
            : area
        )
      );
      return;
    }

    if (kind === 'unit') {
      setUnits((current) =>
        current.map((unit) =>
          unit.id === id
            ? {
                ...unit,
                name: form.name,
                unitNumber: form.number,
                notes: form.notes,
                cleaningTaskId: form.cleaningTaskId,
                cleaningTaskName: cleaningTasks.find((task) => task.id === form.cleaningTaskId)?.name,
              }
            : unit
        )
      );
      return;
    }

    setApartments((current) =>
      current.map((apartment) =>
        apartment.id === id
          ? {
              ...apartment,
              name: form.name,
              apartmentNumber: form.number,
              notes: form.notes,
              cleaningTaskId: form.cleaningTaskId,
              cleaningTaskName: cleaningTasks.find((task) => task.id === form.cleaningTaskId)?.name,
            }
          : apartment
      )
    );
  };

  const handleDeleteBuilding = async (buildingBlock: BuildingBlock) => {
    if (!confirm(`Delete ${buildingBlock.name}? This will also remove its floors and nested areas.`)) return;
    setSubmitting(true);
    try {
      await deleteBuildingBlock(buildingBlock.id);
      await refreshWorkspace();
      toast.success('Building block removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove building block.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async (floor: Floor) => {
    if (!confirm(`Delete ${floor.name}? This will also remove nested areas.`)) return;
    setSubmitting(true);
    try {
      await deleteFloor(floor.id);
      await refreshWorkspace();
      toast.success('Floor removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove floor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArea = async (kind: AreaKind, item: AreaItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    setSubmitting(true);
    try {
      await deleteArea(kind, item.id);
      await refreshWorkspace();
      toast.success(`${areaMeta[kind].label} removed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to remove ${areaMeta[kind].label.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading locations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage location types, buildings, floors, and nested cleaning areas in one place
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openCreateFloorForm()} disabled={buildingBlocks.length === 0}>
            <Layers className="h-4 w-4" />
            Add Floor
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateBuildingForm}>
            <Plus className="h-4 w-4" />
            Add Building Block
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Location Types" value={locationTypes.length} />
        <SummaryTile label="Building Blocks" value={buildingBlocks.length} />
        <SummaryTile label="Floors" value={allFloors.length} />
        <SummaryTile label="Managed Areas" value={commonAreas.length + units.length + apartments.length} />
      </div>

      {buildingFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingBuildingId ? 'Edit Building Block' : 'Add Building Block'}</span>
                <Button variant="ghost" size="icon" onClick={closeBuildingForm} aria-label="Close building form">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>Building blocks are managed under a location type.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBuildingSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
                <Field label="Location type" error={buildingErrors.locationTypeId}>
                  <select
                    value={buildingForm.locationTypeId}
                    onChange={(event) =>
                      setBuildingForm((current) => ({
                        ...current,
                        locationTypeId: Number(event.target.value),
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    aria-invalid={Boolean(buildingErrors.locationTypeId)}
                    disabled={submitting}
                  >
                    <option value={0}>Select location type</option>
                    {locationTypes.map((locationType) => (
                      <option key={locationType.id} value={locationType.id}>
                        {locationType.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Building block name" error={buildingErrors.name}>
                  <Input
                    value={buildingForm.name}
                    onChange={(event) =>
                      setBuildingForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Building Block A"
                    aria-invalid={Boolean(buildingErrors.name)}
                    disabled={submitting}
                  />
                </Field>

                <div className="flex justify-end gap-2 md:col-span-2">
                  <Button type="button" variant="outline" onClick={closeBuildingForm} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingBuildingId ? 'Save Changes' : 'Create Building Block'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {floorFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingFloorId ? 'Edit Floor' : 'Add Floor'}</span>
                <Button variant="ghost" size="icon" onClick={closeFloorForm} aria-label="Close floor form">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>Floors are managed under a building block.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFloorSubmit} className="grid gap-4 md:grid-cols-3" noValidate>
                <Field label="Building block" error={floorErrors.buildingBlockId}>
                  <select
                    value={floorForm.buildingBlockId}
                    onChange={(event) =>
                      setFloorForm((current) => ({
                        ...current,
                        buildingBlockId: Number(event.target.value),
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    aria-invalid={Boolean(floorErrors.buildingBlockId)}
                    disabled={submitting}
                  >
                    <option value={0}>Select building block</option>
                    {buildingBlocks.map((buildingBlock) => (
                      <option key={buildingBlock.id} value={buildingBlock.id}>
                        {buildingBlock.locationTypeName} - {buildingBlock.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Floor name" error={floorErrors.name}>
                  <Input
                    value={floorForm.name}
                    onChange={(event) =>
                      setFloorForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Floor 1"
                    aria-invalid={Boolean(floorErrors.name)}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Floor number" error={floorErrors.floorNumber}>
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={floorForm.floorNumber}
                    onChange={(event) =>
                      setFloorForm((current) => ({
                        ...current,
                        floorNumber: Number(event.target.value),
                      }))
                    }
                    aria-invalid={Boolean(floorErrors.floorNumber)}
                    disabled={submitting}
                  />
                </Field>

                <div className="flex justify-end gap-2 md:col-span-3">
                  <Button type="button" variant="outline" onClick={closeFloorForm} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingFloorId ? 'Save Changes' : 'Create Floor'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {areaFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingAreaId ? `Edit ${areaMeta[areaKind].label}` : `Add ${areaMeta[areaKind].label}`}</span>
                <Button variant="ghost" size="icon" onClick={closeAreaForm} aria-label="Close area form">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                {areaKind === 'apartment'
                  ? 'Apartments can only be assigned to floors under Village Unit.'
                  : 'Areas are managed directly under a floor in the location hierarchy.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAreaSubmit} className="grid gap-4 md:grid-cols-3" noValidate>
                <Field label="Floor" error={areaErrors.floorId}>
                  <select
                    value={areaForm.floorId}
                    onChange={(event) =>
                      setAreaForm((current) => ({
                        ...current,
                        floorId: Number(event.target.value),
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    aria-invalid={Boolean(areaErrors.floorId)}
                    disabled={submitting}
                  >
                    <option value={0}>Select floor</option>
                    {getAllowedFloors(allFloors, areaKind).map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.locationTypeName} - {floor.buildingBlockName} - {floor.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`${areaMeta[areaKind].label} name`} error={areaErrors.name}>
                  <Input
                    value={areaForm.name}
                    onChange={(event) => setAreaForm((current) => ({ ...current, name: event.target.value }))}
                    aria-invalid={Boolean(areaErrors.name)}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Cleaning task" error={areaErrors.cleaningTaskId}>
                  <select
                    value={areaForm.cleaningTaskId}
                    onChange={(event) =>
                      setAreaForm((current) => ({
                        ...current,
                        cleaningTaskId: Number(event.target.value),
                      }))
                    }
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    aria-invalid={Boolean(areaErrors.cleaningTaskId)}
                    disabled={submitting}
                  >
                    <option value={0}>Select cleaning task</option>
                    {compatibleCleaningTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}{task.taskCategory === 'SpecialTask' ? ' (Special)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {areaMeta[areaKind].numberLabel && (
                  <Field label={areaMeta[areaKind].numberLabel} error={areaErrors.number}>
                    <Input
                      value={areaForm.number}
                      onChange={(event) => setAreaForm((current) => ({ ...current, number: event.target.value }))}
                      aria-invalid={Boolean(areaErrors.number)}
                      disabled={submitting}
                    />
                  </Field>
                )}

                <div className="md:col-span-3">
                  <Field label={areaKind === 'commonArea' ? 'Description' : 'Notes'}>
                    <Textarea
                      value={areaForm.notes}
                      onChange={(event) => setAreaForm((current) => ({ ...current, notes: event.target.value }))}
                      disabled={submitting}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-2 md:col-span-3">
                  <Button type="button" variant="outline" onClick={closeAreaForm} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingAreaId ? 'Save Changes' : `Create ${areaMeta[areaKind].label}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        {locationTypes.map((locationType) => {
          const locationKey = `location:${locationType.id}`;
          const locationCollapsed = isCollapsed(locationKey);

          return (
            <section key={locationType.id} className="space-y-3">
              <button
                type="button"
                onClick={() => toggleCollapse(locationKey)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-900"
                aria-expanded={!locationCollapsed}
              >
                <CollapseIcon collapsed={locationCollapsed} />
                <MapPin className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">{locationType.name}</h2>
                <Badge variant="outline">{locationType.buildingBlocks.length} blocks</Badge>
              </button>

              <CollapseContent collapsed={locationCollapsed}>
                {locationType.buildingBlocks.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                    No building blocks have been added for {locationType.name}.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {locationType.buildingBlocks.map((buildingBlock) => {
                      const buildingKey = `building:${buildingBlock.id}`;
                      const buildingCollapsed = isCollapsed(buildingKey);

                      return (
                        <Card key={buildingBlock.id} className="transition hover:shadow-md">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => toggleCollapse(buildingKey)}
                                className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-expanded={!buildingCollapsed}
                              >
                                <CollapseIcon collapsed={buildingCollapsed} />
                                <Building2 className="h-5 w-5 shrink-0" />
                                <span className="truncate">{buildingBlock.name}</span>
                              </button>
                              <span className="flex shrink-0 gap-1">
                                <Button size="icon-sm" variant="ghost" onClick={() => openEditBuildingForm(buildingBlock)} disabled={submitting} aria-label="Edit building block">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="icon-sm" variant="ghost" onClick={() => handleDeleteBuilding(buildingBlock)} disabled={submitting} aria-label="Delete building block">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CollapseContent collapsed={buildingCollapsed}>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">Floors and managed areas</div>
                                <Button size="sm" variant="outline" onClick={() => openCreateFloorForm(buildingBlock.id)} disabled={submitting}>
                                  <Plus className="h-4 w-4" />
                                  Add Floor
                                </Button>
                              </div>

                              {buildingBlock.floors.length === 0 ? (
                                <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                                  No floors added.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {buildingBlock.floors.map((floor) => (
                                    <FloorSection
                                      key={floor.id}
                                      locationTypeName={locationType.name}
                                      floor={floor}
                                      commonAreas={commonAreasByFloor[floor.id] ?? []}
                                      units={unitsByFloor[floor.id] ?? []}
                                      apartments={apartmentsByFloor[floor.id] ?? []}
                                      submitting={submitting}
                                      isCollapsed={isCollapsed}
                                      onToggleCollapse={toggleCollapse}
                                      onEditFloor={openEditFloorForm}
                                      onDeleteFloor={handleDeleteFloor}
                                      onCreateArea={openCreateAreaForm}
                                      onEditArea={openEditAreaForm}
                                      onDeleteArea={handleDeleteArea}
                                    />
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </CollapseContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CollapseContent>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FloorSection({
  locationTypeName,
  floor,
  commonAreas,
  units,
  apartments,
  submitting,
  isCollapsed,
  onToggleCollapse,
  onEditFloor,
  onDeleteFloor,
  onCreateArea,
  onEditArea,
  onDeleteArea,
}: {
  locationTypeName: string;
  floor: Floor;
  commonAreas: CommonArea[];
  units: Unit[];
  apartments: Apartment[];
  submitting: boolean;
  isCollapsed: (key: string) => boolean;
  onToggleCollapse: (key: string) => void;
  onEditFloor: (floor: Floor) => void;
  onDeleteFloor: (floor: Floor) => void;
  onCreateArea: (kind: AreaKind, floorId: number) => void;
  onEditArea: (kind: AreaKind, item: AreaItem) => void;
  onDeleteArea: (kind: AreaKind, item: AreaItem) => void;
}) {
  const panels = getPanelsForLocationType(locationTypeName);
  const floorKey = `floor:${floor.id}`;
  const floorCollapsed = isCollapsed(floorKey);

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleCollapse(floorKey)}
          className="flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={!floorCollapsed}
        >
          <CollapseIcon collapsed={floorCollapsed} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{floor.name}</span>
            <span className="block text-sm text-muted-foreground">Floor number {floor.floorNumber}</span>
          </span>
        </button>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" onClick={() => onEditFloor(floor)} disabled={submitting} aria-label="Edit floor">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => onDeleteFloor(floor)} disabled={submitting} aria-label="Delete floor">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CollapseContent collapsed={floorCollapsed}>
        <div className="grid gap-3 p-4 xl:grid-cols-2">
          {panels.map((kind) => {
            const panelKey = `area-panel:${floor.id}:${kind}`;

            return (
              <AreaPanel
                key={kind}
                kind={kind}
                floorId={floor.id}
                items={kind === 'commonArea' ? commonAreas : kind === 'unit' ? units : apartments}
                submitting={submitting}
                collapsed={isCollapsed(panelKey)}
                onToggleCollapse={() => onToggleCollapse(panelKey)}
                onCreateArea={onCreateArea}
                onEditArea={onEditArea}
                onDeleteArea={onDeleteArea}
              />
            );
          })}
        </div>
      </CollapseContent>
    </div>
  );
}

function AreaPanel({
  kind,
  floorId,
  items,
  submitting,
  collapsed,
  onToggleCollapse,
  onCreateArea,
  onEditArea,
  onDeleteArea,
}: {
  kind: AreaKind;
  floorId: number;
  items: AreaItem[];
  submitting: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateArea: (kind: AreaKind, floorId: number) => void;
  onEditArea: (kind: AreaKind, item: AreaItem) => void;
  onDeleteArea: (kind: AreaKind, item: AreaItem) => void;
}) {
  const Icon = kind === 'commonArea' ? Sparkles : kind === 'unit' ? DoorOpen : Home;

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex min-w-0 items-center gap-2 rounded-md text-left text-sm font-medium transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={!collapsed}
        >
          <CollapseIcon collapsed={collapsed} />
          <Icon className="h-4 w-4 text-blue-600" />
          {areaMeta[kind].plural}
          <Badge variant="outline">{items.length}</Badge>
        </button>
        <Button size="xs" variant="outline" onClick={() => onCreateArea(kind, floorId)} disabled={submitting}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      <CollapseContent collapsed={collapsed}>
        {items.length === 0 ? (
          <div className="rounded-md bg-slate-50 px-3 py-4 text-sm text-muted-foreground dark:bg-slate-800">
            No {areaMeta[kind].plural.toLowerCase()} added.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{getAreaSubtext(kind, item)}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon-xs" variant="ghost" onClick={() => onEditArea(kind, item)} disabled={submitting} aria-label={`Edit ${item.name}`}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" onClick={() => onDeleteArea(kind, item)} disabled={submitting} aria-label={`Delete ${item.name}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapseContent>
    </div>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <ChevronDown
      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
        collapsed ? '-rotate-90' : 'rotate-0'
      }`}
    />
  );
}

function CollapseContent({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-destructive">{error}</span>}
    </label>
  );
}

async function loadLocationWorkspace() {
  const [locationTypes, commonAreas, units, apartments, cleaningTasks] = await Promise.all([
    getLocationTypes(),
    getCommonAreas(),
    getUnits(),
    getApartments(),
    getCleaningTasks(),
  ]);

  return { locationTypes, commonAreas, units, apartments, cleaningTasks };
}

function groupByFloor<TItem extends { floorId: number }>(items: TItem[]) {
  return items.reduce<Record<number, TItem[]>>((groups, item) => {
    groups[item.floorId] = [...(groups[item.floorId] ?? []), item];
    return groups;
  }, {});
}

function getPanelsForLocationType(locationTypeName: string): AreaKind[] {
  if (locationTypeName.toLowerCase() === 'village unit') {
    return ['apartment', 'commonArea'];
  }

  return ['commonArea', 'unit'];
}

function getAllowedFloors(floors: FloorOption[], kind: AreaKind) {
  if (kind === 'apartment') {
    return floors.filter((floor) => floor.locationTypeName.toLowerCase() === 'village unit');
  }

  return floors;
}

function getAreaNumber(kind: AreaKind, item: AreaItem) {
  if (kind === 'unit' && 'unitNumber' in item) return item.unitNumber;
  if (kind === 'apartment' && 'apartmentNumber' in item) return item.apartmentNumber;
  return '';
}

function getAreaSubtext(kind: AreaKind, item: AreaItem) {
  let detail = '';
  if (kind === 'commonArea' && 'description' in item) detail = item.description || 'No description';
  if (kind === 'unit' && 'unitNumber' in item) detail = `Unit ${item.unitNumber}`;
  if (kind === 'apartment' && 'apartmentNumber' in item) detail = `Apartment ${item.apartmentNumber}`;
  return `${detail} / ${item.cleaningTaskName || 'No cleaning task assigned'}`;
}

function getCompatibleCleaningTasks(tasks: CleaningTask[], kind: AreaKind) {
  const category = kind === 'commonArea' ? 'CommunityArea' : kind === 'unit' ? 'Unit' : 'Apartment';
  return tasks.filter((task) => task.taskCategory === category || task.taskCategory === 'SpecialTask');
}

async function createArea(kind: AreaKind, form: AreaFormState): Promise<AreaItem> {
  if (kind === 'commonArea') {
    const payload: CommonAreaRequest = {
      name: form.name,
      description: form.notes,
      floorId: form.floorId,
      cleaningTaskId: form.cleaningTaskId,
    };
    return createCommonArea(payload);
  }

  if (kind === 'unit') {
    const payload: UnitRequest = {
      name: form.name,
      unitNumber: form.number,
      notes: form.notes,
      floorId: form.floorId,
      cleaningTaskId: form.cleaningTaskId,
    };
    return createUnit(payload);
  }

  const payload: ApartmentRequest = {
    name: form.name,
    apartmentNumber: form.number,
    notes: form.notes,
    floorId: form.floorId,
    cleaningTaskId: form.cleaningTaskId,
  };
  return createApartment(payload);
}

async function updateArea(kind: AreaKind, id: number, form: AreaFormState) {
  if (kind === 'commonArea') {
    const payload: CommonAreaRequest = {
      name: form.name,
      description: form.notes,
      floorId: form.floorId,
      cleaningTaskId: form.cleaningTaskId,
    };
    await updateCommonArea(id, payload);
    return;
  }

  if (kind === 'unit') {
    const payload: UnitRequest = {
      name: form.name,
      unitNumber: form.number,
      notes: form.notes,
      floorId: form.floorId,
      cleaningTaskId: form.cleaningTaskId,
    };
    await updateUnit(id, payload);
    return;
  }

  const payload: ApartmentRequest = {
    name: form.name,
    apartmentNumber: form.number,
    notes: form.notes,
    floorId: form.floorId,
    cleaningTaskId: form.cleaningTaskId,
  };
  await updateApartment(id, payload);
}

async function deleteArea(kind: AreaKind, id: number) {
  if (kind === 'commonArea') {
    await deleteCommonArea(id);
    return;
  }

  if (kind === 'unit') {
    await deleteUnit(id);
    return;
  }

  await deleteApartment(id);
}

function validateBuildingForm(form: BuildingFormState): BuildingFormErrors {
  const errors: BuildingFormErrors = {};

  if (!form.locationTypeId) errors.locationTypeId = 'Location type is required.';
  if (!form.name) errors.name = 'Building block name is required.';

  return errors;
}

function validateFloorForm(form: FloorFormState): FloorFormErrors {
  const errors: FloorFormErrors = {};

  if (!form.buildingBlockId) errors.buildingBlockId = 'Building block is required.';
  if (!form.name) errors.name = 'Floor name is required.';
  if (!Number.isFinite(form.floorNumber) || form.floorNumber < 0) {
    errors.floorNumber = 'Floor number is required.';
  }

  return errors;
}

function validateAreaForm(form: AreaFormState, kind: AreaKind): AreaFormErrors {
  const errors: AreaFormErrors = {};

  if (!form.floorId) errors.floorId = 'Floor is required.';
  if (!form.cleaningTaskId) errors.cleaningTaskId = 'Cleaning task is required.';
  if (!form.name) errors.name = `${areaMeta[kind].label} name is required.`;
  if (kind !== 'commonArea' && !form.number) {
    errors.number = `${areaMeta[kind].numberLabel} is required.`;
  }

  return errors;
}
