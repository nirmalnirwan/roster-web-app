'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Bed, Building2, ChevronDown, DoorOpen, Edit, Home, Layers, MapPin, Plus, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import useRequireAuth from '@/app/hooks/useRequireAuth';
import {
  createResident,
  deleteResident,
  getAssignableAreas,
  getResidents,
  updateResident,
} from '@/app/services/residentService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AssignableArea, Resident, ResidentRequest } from '@/lib/types';

const frequencyOptions = ['Daily', 'Weekly', 'Fortnightly', 'Monthly'];

const defaultForm = {
  name: '',
  roomNumber: '',
  building: '',
  cleaningFrequency: '',
  notes: '',
  assignmentValue: '',
};

type ResidentForm = typeof defaultForm;
type ResidentErrors = Partial<Record<keyof ResidentForm, string>>;
type ResidentAreaNode = AssignableArea & { residents: Resident[] };
type ResidentFloorNode = { id: number; name: string; areas: ResidentAreaNode[] };
type ResidentBuildingNode = { id: number; name: string; floors: ResidentFloorNode[] };
type ResidentLocationNode = { id: number; name: string; buildings: ResidentBuildingNode[] };

export default function ResidentsPage() {
  useRequireAuth();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [assignableAreas, setAssignableAreas] = useState<AssignableArea[]>([]);
  const [form, setForm] = useState<ResidentForm>(defaultForm);
  const [errors, setErrors] = useState<ResidentErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  const groupedAreas = useMemo(() => {
    return assignableAreas.reduce<Record<string, AssignableArea[]>>((groups, area) => {
      groups[area.areaType] = [...(groups[area.areaType] ?? []), area];
      return groups;
    }, {});
  }, [assignableAreas]);

  const residentHierarchy = useMemo(
    () => buildResidentHierarchy(assignableAreas, residents),
    [assignableAreas, residents]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [residentData, areaData] = await Promise.all([getResidents(), getAssignableAreas()]);
        if (active) {
          setResidents(residentData);
          setAssignableAreas(areaData);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load residents');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    const [residentData, areaData] = await Promise.all([getResidents(), getAssignableAreas()]);
    setResidents(residentData);
    setAssignableAreas(areaData);
  };

  const openCreateForm = () => {
    setForm(defaultForm);
    setErrors({});
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (resident: Resident) => {
    setForm({
      name: resident.name,
      roomNumber: resident.roomNumber,
      building: resident.building,
      cleaningFrequency: resident.cleaningFrequency,
      notes: resident.notes,
      assignmentValue: resident.unitId ? `Unit:${resident.unitId}` : `Apartment:${resident.apartmentId}`,
    });
    setErrors({});
    setEditingId(resident.id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setForm(defaultForm);
    setErrors({});
    setEditingId(null);
    setFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = {
      ...form,
      name: form.name.trim(),
      roomNumber: form.roomNumber.trim(),
      building: form.building.trim(),
      cleaningFrequency: form.cleaningFrequency.trim(),
      notes: form.notes.trim(),
    };
    const validationErrors = validateResidentForm(normalized);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = toResidentRequest(normalized);
      if (editingId) {
        await updateResident(editingId, payload);
        toast.success('Resident updated');
      } else {
        await createResident(payload);
        toast.success('Resident created');
      }
      await refresh();
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save resident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (resident: Resident) => {
    if (!confirm(`Delete ${resident.name}?`)) return;
    setSubmitting(true);
    try {
      await deleteResident(resident.id);
      toast.success('Resident removed');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete resident');
    } finally {
      setSubmitting(false);
    }
  };

  function toggleSection(key: string) {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Residents</h1>
          <p className="text-muted-foreground">Assign residents to Units or Apartments only.</p>
        </div>
        <Button onClick={openCreateForm} disabled={submitting || assignableAreas.length === 0}>
          <Plus className="h-4 w-4" />
          Add Resident
        </Button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{editingId ? 'Edit Resident' : 'Add Resident'}</CardTitle>
                <CardDescription>Common Areas are not available for resident assignment.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close form">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3" noValidate>
                <Field label="Resident name" error={errors.name}>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={submitting} />
                </Field>
                <Field label="Assignment" error={errors.assignmentValue}>
                  <select
                    value={form.assignmentValue}
                    onChange={(event) => setForm((current) => ({ ...current, assignmentValue: event.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    disabled={submitting}
                  >
                    <option value="">Select unit or apartment</option>
                    {Object.entries(groupedAreas).map(([areaType, areas]) => (
                      <optgroup key={areaType} label={areaType}>
                        {areas.map((area) => (
                          <option key={`${area.areaType}:${area.id}`} value={`${area.areaType}:${area.id}`}>
                            {area.name} ({area.number}) / {area.locationTypeName} / {area.buildingBlockName} / {area.floorName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Cleaning frequency" error={errors.cleaningFrequency}>
                  <select
                    value={form.cleaningFrequency}
                    onChange={(event) => setForm((current) => ({ ...current, cleaningFrequency: event.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    disabled={submitting}
                  >
                    <option value="">Select frequency</option>
                    {frequencyOptions.map((frequency) => (
                      <option key={frequency} value={frequency}>{frequency}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Room number">
                  <Input value={form.roomNumber} onChange={(event) => setForm((current) => ({ ...current, roomNumber: event.target.value }))} disabled={submitting} />
                </Field>
                <Field label="Building">
                  <Input value={form.building} onChange={(event) => setForm((current) => ({ ...current, building: event.target.value }))} disabled={submitting} />
                </Field>
                <div className="md:col-span-3">
                  <Field label="Notes">
                    <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} disabled={submitting} />
                  </Field>
                </div>
                <div className="flex justify-end gap-2 md:col-span-3">
                  <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{editingId ? 'Save Changes' : 'Create Resident'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-violet-600" />
            Residents by Location
          </CardTitle>
          <CardDescription>
            {residents.length} record{residents.length === 1 ? '' : 's'} grouped by Unit and Apartment assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : residents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No residents have been created yet.</div>
          ) : (
            <ResidentHierarchyTree
              hierarchy={residentHierarchy}
              expandedSections={expandedSections}
              onToggle={toggleSection}
              onEdit={openEditForm}
              onDelete={handleDelete}
              submitting={submitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResidentHierarchyTree({
  hierarchy,
  expandedSections,
  onToggle,
  onEdit,
  onDelete,
  submitting,
}: {
  hierarchy: ResidentLocationNode[];
  expandedSections: Set<string>;
  onToggle: (key: string) => void;
  onEdit: (resident: Resident) => void;
  onDelete: (resident: Resident) => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-2">
      {hierarchy.map((location) => {
        const locationKey = `resident-location:${location.id}`;
        const locationExpanded = expandedSections.has(locationKey);

        return (
          <div key={location.id} className="rounded-lg border bg-background">
            <HierarchyButton
              expanded={locationExpanded}
              onClick={() => onToggle(locationKey)}
              icon={<MapPin className="h-4 w-4 text-violet-600" />}
              label={location.name}
              meta={`${countLocationResidents(location)} residents`}
              className="font-semibold"
            />

            {locationExpanded && (
              <div className="space-y-2 border-t p-2">
                {location.buildings.map((building) => {
                  const buildingKey = `resident-building:${building.id}`;
                  const buildingExpanded = expandedSections.has(buildingKey);

                  return (
                    <div key={building.id} className="rounded-lg border bg-muted/20">
                      <HierarchyButton
                        expanded={buildingExpanded}
                        onClick={() => onToggle(buildingKey)}
                        icon={<Building2 className="h-4 w-4 text-blue-600" />}
                        label={building.name}
                        meta={`${building.floors.length} floors`}
                      />

                      {buildingExpanded && (
                        <div className="space-y-2 border-t p-2">
                          {building.floors.map((floor) => {
                            const floorKey = `resident-floor:${floor.id}`;
                            const floorExpanded = expandedSections.has(floorKey);

                            return (
                              <div key={floor.id} className="rounded-lg border bg-background">
                                <HierarchyButton
                                  expanded={floorExpanded}
                                  onClick={() => onToggle(floorKey)}
                                  icon={<Layers className="h-4 w-4 text-slate-500" />}
                                  label={floor.name}
                                  meta={`${countFloorResidents(floor)} residents`}
                                />

                                {floorExpanded && (
                                  <div className="space-y-2 border-t p-2">
                                    {floor.areas.map((area) => {
                                      const areaKey = `resident-area:${area.areaType}:${area.id}`;
                                      const areaExpanded = expandedSections.has(areaKey);

                                      return (
                                        <div key={`${area.areaType}-${area.id}`} className="rounded-lg border bg-slate-50 dark:bg-neutral-900">
                                          <HierarchyButton
                                            expanded={areaExpanded}
                                            onClick={() => onToggle(areaKey)}
                                            icon={area.areaType === 'Unit' ? <DoorOpen className="h-4 w-4 text-emerald-600" /> : <Home className="h-4 w-4 text-amber-600" />}
                                            label={`${area.name} (${area.number})`}
                                            meta={`${area.areaType} / ${area.residents.length} residents`}
                                          />

                                          {areaExpanded && (
                                            <div className="space-y-2 border-t p-2">
                                              {area.residents.length === 0 ? (
                                                <div className="rounded-md bg-background px-3 py-3 text-sm text-muted-foreground">
                                                  No residents assigned.
                                                </div>
                                              ) : (
                                                area.residents.map((resident) => (
                                                  <ResidentRow
                                                    key={resident.id}
                                                    resident={resident}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    submitting={submitting}
                                                  />
                                                ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HierarchyButton({
  expanded,
  onClick,
  icon,
  label,
  meta,
  className = '',
}: {
  expanded: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  meta: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 ${className}`}
      aria-expanded={expanded}
    >
      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{meta}</span>
    </button>
  );
}

function ResidentRow({
  resident,
  onEdit,
  onDelete,
  submitting,
}: {
  resident: Resident;
  onEdit: (resident: Resident) => void;
  onDelete: (resident: Resident) => void;
  submitting: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground">{resident.name}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{resident.cleaningFrequency}</Badge>
            <Badge variant="outline">{resident.assignmentName}</Badge>
          </div>
          {resident.notes && <p className="mt-2 text-sm text-muted-foreground">{resident.notes}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="icon-sm" variant="ghost" onClick={() => onEdit(resident)} disabled={submitting} aria-label={`Edit ${resident.name}`}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onDelete(resident)} disabled={submitting} aria-label={`Delete ${resident.name}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function buildResidentHierarchy(assignableAreas: AssignableArea[], residents: Resident[]): ResidentLocationNode[] {
  const residentsByAssignment = new Map<string, Resident[]>();
  for (const resident of residents) {
    if (resident.unitId) {
      residentsByAssignment.set(`Unit:${resident.unitId}`, [...(residentsByAssignment.get(`Unit:${resident.unitId}`) ?? []), resident]);
    }
    if (resident.apartmentId) {
      residentsByAssignment.set(`Apartment:${resident.apartmentId}`, [...(residentsByAssignment.get(`Apartment:${resident.apartmentId}`) ?? []), resident]);
    }
  }

  const locations = new Map<number, ResidentLocationNode>();
  for (const area of assignableAreas) {
    let location = locations.get(area.locationTypeId);
    if (!location) {
      location = { id: area.locationTypeId, name: area.locationTypeName, buildings: [] };
      locations.set(area.locationTypeId, location);
    }

    let building = location.buildings.find((item) => item.id === area.buildingBlockId);
    if (!building) {
      building = { id: area.buildingBlockId, name: area.buildingBlockName, floors: [] };
      location.buildings.push(building);
    }

    let floor = building.floors.find((item) => item.id === area.floorId);
    if (!floor) {
      floor = { id: area.floorId, name: area.floorName, areas: [] };
      building.floors.push(floor);
    }

    floor.areas.push({
      ...area,
      residents: residentsByAssignment.get(`${area.areaType}:${area.id}`) ?? [],
    });
  }

  return [...locations.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((location) => ({
      ...location,
      buildings: location.buildings
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((building) => ({
          ...building,
          floors: building.floors
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((floor) => ({
              ...floor,
              areas: floor.areas.sort((a, b) => a.areaType.localeCompare(b.areaType) || a.name.localeCompare(b.name)),
            })),
        })),
    }));
}

function countLocationResidents(location: ResidentLocationNode) {
  return location.buildings.reduce((total, building) => total + building.floors.reduce((floorTotal, floor) => floorTotal + countFloorResidents(floor), 0), 0);
}

function countFloorResidents(floor: ResidentFloorNode) {
  return floor.areas.reduce((total, area) => total + area.residents.length, 0);
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </label>
  );
}

function validateResidentForm(form: ResidentForm) {
  const errors: ResidentErrors = {};
  if (!form.name) errors.name = 'Resident name is required.';
  if (!form.assignmentValue) errors.assignmentValue = 'Unit or Apartment assignment is required.';
  if (!form.cleaningFrequency) errors.cleaningFrequency = 'Cleaning frequency is required.';
  return errors;
}

function toResidentRequest(form: ResidentForm): ResidentRequest {
  const [assignmentType, idValue] = form.assignmentValue.split(':');
  const assignmentId = Number(idValue);
  return {
    name: form.name,
    roomNumber: form.roomNumber,
    building: form.building,
    cleaningFrequency: form.cleaningFrequency,
    notes: form.notes,
    unitId: assignmentType === 'Unit' ? assignmentId : undefined,
    apartmentId: assignmentType === 'Apartment' ? assignmentId : undefined,
  };
}
