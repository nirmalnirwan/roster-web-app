'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Briefcase, Edit3, Loader2, Mail, Phone, Plus, Trash2, UserPlus, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

import useRequireAuth from '../hooks/useRequireAuth';
import { registerUser } from '@/app/services/authService';
import {
  createHousekeeper,
  deleteHousekeeper,
  getHousekeepers,
} from '@/app/services/housekeeperService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CreateHousekeeperRequest, EmployeeType, Housekeeper } from '@/lib/types';

type HousekeeperFormState = CreateHousekeeperRequest & {
  password: string;
};

type FormErrors = Partial<Record<keyof HousekeeperFormState, string>>;

const initialFormState: HousekeeperFormState = {
  name: '',
  phone: '',
  email: '',
  status: 'Active',
  employmentType: 'Permanent',
  password: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9][0-9\s\-()]{6,19}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function HousekeepersPage() {
  useRequireAuth();

  const [housekeepers, setHousekeepers] = useState<Housekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<HousekeeperFormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchHousekeepers() {
      try {
        const data = await getHousekeepers();
        if (active) {
          setHousekeepers(data);
          setLoadError(null);
        }
      } catch (error) {
        console.error('Failed to fetch housekeepers', error);
        if (active) {
          setLoadError('Failed to load housekeepers. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchHousekeepers();

    return () => {
      active = false;
    };
  }, []);

  const trimmedForm = useMemo(
    () => ({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
    }),
    [form]
  );

  const updateField = <TField extends keyof HousekeeperFormState>(
    field: TField,
    value: HousekeeperFormState[TField]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm(trimmedForm);
    setErrors(validationErrors);
    setSubmitMessage(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    let createdHousekeeper: Housekeeper | null = null;

    try {
      const housekeeperPayload: CreateHousekeeperRequest = {
        name: trimmedForm.name,
        phone: trimmedForm.phone,
        email: trimmedForm.email,
        status: trimmedForm.status,
        employmentType: trimmedForm.employmentType,
      };

      createdHousekeeper = await createHousekeeper(housekeeperPayload);

      const { firstName, lastName } = splitName(trimmedForm.name);
      await registerUser({
        email: trimmedForm.email,
        password: trimmedForm.password,
        firstName,
        lastName,
        userRole: 'DefaultUser',
      });

      setHousekeepers((current) => [createdHousekeeper as Housekeeper, ...current]);
      setForm(initialFormState);
      setIsFormOpen(false);
      setSubmitMessage('Housekeeper and login account created successfully.');
      toast.success('Housekeeper created successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create housekeeper.';

      if (createdHousekeeper) {
        try {
          await deleteHousekeeper(createdHousekeeper.id);
        } catch (rollbackError) {
          console.error('Failed to roll back housekeeper after auth registration error', rollbackError);
          setSubmitMessage(
            `${message} The housekeeper was saved, but the login account was not created.`
          );
          toast.error('Login account creation failed');
          return;
        }
      }

      setSubmitMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading housekeepers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Housekeepers</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your cleaning staff and login accounts
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setIsFormOpen((open) => !open);
            setSubmitMessage(null);
          }}
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'Add Housekeeper'}
        </Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5" />
              Add Housekeeper
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
              <Field label="Full name" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Jane Smith"
                  aria-invalid={Boolean(errors.name)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="jane@example.com"
                  aria-invalid={Boolean(errors.email)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Phone" error={errors.phone}>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+64 21 123 4567"
                  aria-invalid={Boolean(errors.phone)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Temporary password" error={errors.password}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Employment type" error={errors.employmentType}>
                <select
                  value={form.employmentType}
                  onChange={(event) =>
                    updateField('employmentType', event.target.value as EmployeeType)
                  }
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={Boolean(errors.employmentType)}
                  disabled={submitting}
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Casual">Casual</option>
                </select>
              </Field>

              <Field label="Status" error={errors.status}>
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={Boolean(errors.status)}
                  disabled={submitting}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </Field>

              <div className="flex flex-col gap-3 md:col-span-2">
                {submitMessage && (
                  <p className="rounded-md border bg-muted px-3 py-2 text-sm">{submitMessage}</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? 'Creating...' : 'Create Housekeeper'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {housekeepers.length === 0 ? (
          <div className="rounded-lg bg-slate-50 py-12 text-center dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-400">No housekeepers found</p>
          </div>
        ) : (
          housekeepers.map((housekeeper) => (
            <Card key={housekeeper.id} className="transition hover:border-slate-300 hover:shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{housekeeper.name}</h2>
                    <Badge
                      variant="outline"
                      className={housekeeper.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}
                    >
                      {housekeeper.status}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                    <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{housekeeper.email}</span></span>
                    <span className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" />{housekeeper.phone}</span>
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 shrink-0" />{housekeeper.employmentType}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:self-center">
                  <Button size="icon-sm" variant="outline" aria-label={`Edit ${housekeeper.name}`} title="Edit housekeeper"><Edit3 className="h-4 w-4" /></Button>
                  <Button size="icon-sm" variant="destructive" aria-label={`Remove ${housekeeper.name}`} title="Remove housekeeper"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-destructive">{error}</span>}
    </label>
  );
}

function validateForm(form: HousekeeperFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name) errors.name = 'Full name is required.';
  if (!form.email) errors.email = 'Email is required.';
  else if (!emailPattern.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.phone) errors.phone = 'Phone is required.';
  else if (!phonePattern.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  if (!form.password) errors.password = 'Password is required.';
  else if (!passwordPattern.test(form.password)) {
    errors.password = 'Use at least 8 characters with uppercase, lowercase, and a number.';
  }
  if (!form.status) errors.status = 'Status is required.';
  if (!form.employmentType) errors.employmentType = 'Employment type is required.';

  return errors;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(' ') || firstName;

  return { firstName, lastName };
}
