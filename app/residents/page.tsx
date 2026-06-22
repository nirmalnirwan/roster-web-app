'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
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

  const groupedAreas = useMemo(() => {
    return assignableAreas.reduce<Record<string, AssignableArea[]>>((groups, area) => {
      groups[area.areaType] = [...(groups[area.areaType] ?? []), area];
      return groups;
    }, {});
  }, [assignableAreas]);

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
        <Card>
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
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={submitting}>{editingId ? 'Save Changes' : 'Create Resident'}</Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Residents</CardTitle>
          <CardDescription>{residents.length} record{residents.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : residents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No residents have been created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-3 font-medium">Name</th>
                    <th className="py-3 pr-3 font-medium">Assignment</th>
                    <th className="py-3 pr-3 font-medium">Frequency</th>
                    <th className="py-3 pr-3 font-medium">Notes</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((resident) => (
                    <tr key={resident.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-medium">{resident.name}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">{resident.assignmentType}</Badge>
                          <Badge variant="outline">{resident.assignmentName}</Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-3">{resident.cleaningFrequency}</td>
                      <td className="max-w-[22rem] py-3 pr-3 text-muted-foreground">{resident.notes}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => openEditForm(resident)} disabled={submitting} aria-label={`Edit ${resident.name}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(resident)} disabled={submitting} aria-label={`Delete ${resident.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
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
