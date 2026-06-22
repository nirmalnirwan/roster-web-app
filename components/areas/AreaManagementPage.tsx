'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import useRequireAuth from '@/app/hooks/useRequireAuth';
import { getLocationTypes } from '@/app/services/locationService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Apartment, ApartmentRequest, CommonArea, CommonAreaRequest, LocationType, Unit, UnitRequest } from '@/lib/types';

type AreaItem = CommonArea | Unit | Apartment;
type AreaRequest = CommonAreaRequest | UnitRequest | ApartmentRequest;
type AreaKind = 'commonArea' | 'unit' | 'apartment';

interface AreaManagementPageProps<TItem extends AreaItem, TRequest extends AreaRequest> {
  kind: AreaKind;
  title: string;
  description: string;
  numberLabel?: string;
  numberKey?: 'unitNumber' | 'apartmentNumber';
  listLabel: string;
  emptyLabel: string;
  loadItems: () => Promise<TItem[]>;
  createItem: (payload: TRequest) => Promise<TItem>;
  updateItem: (id: number, payload: TRequest) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

const defaultForm = {
  name: '',
  number: '',
  notes: '',
  floorId: 0,
};

type AreaForm = typeof defaultForm;
type AreaErrors = Partial<Record<keyof AreaForm, string>>;

export default function AreaManagementPage<TItem extends AreaItem, TRequest extends AreaRequest>({
  kind,
  title,
  description,
  numberLabel,
  numberKey,
  listLabel,
  emptyLabel,
  loadItems,
  createItem,
  updateItem,
  deleteItem,
}: AreaManagementPageProps<TItem, TRequest>) {
  useRequireAuth();

  const [items, setItems] = useState<TItem[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [form, setForm] = useState<AreaForm>(defaultForm);
  const [errors, setErrors] = useState<AreaErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const floors = useMemo(() => flattenFloors(locationTypes, kind === 'apartment'), [locationTypes, kind]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [areaData, locationData] = await Promise.all([loadItems(), getLocationTypes()]);
        if (active) {
          setItems(areaData);
          setLocationTypes(locationData);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Unable to load ${listLabel.toLowerCase()}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [listLabel, loadItems]);

  const refresh = async () => {
    const [areaData, locationData] = await Promise.all([loadItems(), getLocationTypes()]);
    setItems(areaData);
    setLocationTypes(locationData);
  };

  const openCreateForm = () => {
    setForm(defaultForm);
    setErrors({});
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (item: TItem) => {
    setForm({
      name: item.name,
      number: getItemNumber(item),
      notes: 'description' in item ? item.description : item.notes,
      floorId: item.floorId,
    });
    setErrors({});
    setEditingId(item.id);
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
      number: form.number.trim(),
      notes: form.notes.trim(),
    };
    const validationErrors = validateAreaForm(normalized, Boolean(numberKey));
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = toPayload(normalized, kind, numberKey) as TRequest;
      if (editingId) {
        await updateItem(editingId, payload);
        toast.success(`${title} updated`);
      } else {
        await createItem(payload);
        toast.success(`${title} created`);
      }
      await refresh();
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to save ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: TItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    setSubmitting(true);
    try {
      await deleteItem(item.id);
      toast.success(`${title} removed`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to delete ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{listLabel}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button onClick={openCreateForm} disabled={submitting || floors.length === 0}>
          <Plus className="h-4 w-4" />
          Add {title}
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>{editingId ? `Edit ${title}` : `Add ${title}`}</CardTitle>
              <CardDescription>{kind === 'apartment' ? 'Apartments can only be placed on Village Unit floors.' : 'Select the parent floor and enter the area details.'}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close form">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3" noValidate>
              <Field label="Floor" error={errors.floorId}>
                <select
                  value={form.floorId}
                  onChange={(event) => setForm((current) => ({ ...current, floorId: Number(event.target.value) }))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  disabled={submitting}
                >
                  <option value={0}>Select floor</option>
                  {floors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.locationTypeName} / {floor.buildingBlockName} / {floor.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${title} name`} error={errors.name}>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={submitting} />
              </Field>
              {numberLabel && (
                <Field label={numberLabel} error={errors.number}>
                  <Input value={form.number} onChange={(event) => setForm((current) => ({ ...current, number: event.target.value }))} disabled={submitting} />
                </Field>
              )}
              <div className="md:col-span-3">
                <Field label={kind === 'commonArea' ? 'Description' : 'Notes'}>
                  <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} disabled={submitting} />
                </Field>
              </div>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={submitting}>{editingId ? 'Save Changes' : `Create ${title}`}</Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{listLabel}</CardTitle>
          <CardDescription>{items.length} record{items.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-3 font-medium">Name</th>
                    {numberLabel && <th className="py-3 pr-3 font-medium">{numberLabel}</th>}
                    <th className="py-3 pr-3 font-medium">Location</th>
                    <th className="py-3 pr-3 font-medium">Details</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-3 font-medium">{item.name}</td>
                      {numberLabel && <td className="py-3 pr-3">{getItemNumber(item)}</td>}
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">{item.locationTypeName}</Badge>
                          <Badge variant="outline">{item.buildingBlockName}</Badge>
                          <Badge variant="outline">{item.floorName}</Badge>
                        </div>
                      </td>
                      <td className="max-w-[22rem] py-3 pr-3 text-muted-foreground">{'description' in item ? item.description : item.notes}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="icon-sm" variant="ghost" onClick={() => openEditForm(item)} disabled={submitting} aria-label={`Edit ${item.name}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(item)} disabled={submitting} aria-label={`Delete ${item.name}`}>
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

function flattenFloors(locationTypes: LocationType[], villageOnly: boolean) {
  return locationTypes
    .filter((locationType) => !villageOnly || locationType.name.toLowerCase() === 'village unit')
    .flatMap((locationType) =>
      locationType.buildingBlocks.flatMap((buildingBlock) =>
        buildingBlock.floors.map((floor) => ({
          ...floor,
          buildingBlockName: buildingBlock.name,
          locationTypeName: locationType.name,
        }))
      )
    );
}

function getItemNumber(item: AreaItem) {
  if ('unitNumber' in item) return item.unitNumber;
  if ('apartmentNumber' in item) return item.apartmentNumber;
  return '';
}

function toPayload(form: AreaForm, kind: AreaKind, numberKey?: string) {
  if (kind === 'commonArea') {
    return { name: form.name, description: form.notes, floorId: form.floorId };
  }

  return {
    name: form.name,
    [numberKey ?? 'number']: form.number,
    notes: form.notes,
    floorId: form.floorId,
  };
}

function validateAreaForm(form: AreaForm, hasNumber: boolean) {
  const errors: AreaErrors = {};
  if (!form.floorId) errors.floorId = 'Floor is required.';
  if (!form.name) errors.name = 'Name is required.';
  if (hasNumber && !form.number) errors.number = 'Number is required.';
  return errors;
}
