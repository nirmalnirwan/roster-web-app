'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, Clock3, DoorOpen, Edit, Filter, Home, Loader2, Plus, Repeat2, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import useRequireAuth from '../hooks/useRequireAuth';
import {
  createCleaningTask,
  deleteCleaningTask,
  getCleaningTasks,
  updateCleaningTask,
} from '@/app/services/cleaningTaskService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CleaningTask, CleaningTaskCategory, CleaningTaskRequest } from '@/lib/types';

type FormState = CleaningTaskRequest;
type FormErrors = Partial<Record<keyof FormState, string>>;

const taskCategories: Array<{ value: CleaningTaskCategory; label: string }> = [
  { value: 'CommunityArea', label: 'Community Areas' },
  { value: 'Apartment', label: 'Apartments' },
  { value: 'Unit', label: 'Units' },
  { value: 'SpecialTask', label: 'Special Tasks' },
];

const frequencies = ['Daily', 'Weekly', 'Fortnightly', 'Monthly'];

const initialFormState: FormState = {
  name: '',
  description: '',
  taskCategory: 'CommunityArea',
  estimatedDuration: 30,
  frequency: 'Weekly',
};

export default function TaskPage() {
  useRequireAuth();

  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CleaningTaskCategory | 'All'>('All');

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      try {
        const data = await getCleaningTasks();
        if (active) {
          setTasks(data);
          setLoadError(null);
        }
      } catch (error) {
        console.error('Failed to load cleaning tasks', error);
        if (active) {
          setLoadError('Failed to load cleaning tasks. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      active = false;
    };
  }, []);

  const visibleTasks = useMemo(() => {
    if (filterCategory === 'All') return tasks;
    return tasks.filter((task) => task.taskCategory === filterCategory);
  }, [filterCategory, tasks]);

  const formTitle = editingTaskId ? 'Edit Cleaning Task' : 'Create Cleaning Task';

  const updateField = <TField extends keyof FormState>(
    field: TField,
    value: FormState[TField]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const openCreateForm = () => {
    setForm(initialFormState);
    setErrors({});
    setEditingTaskId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: CleaningTask) => {
    setForm({
      name: task.name,
      description: task.description,
      taskCategory: task.taskCategory,
      estimatedDuration: task.estimatedDuration,
      frequency: task.frequency,
    });
    setErrors({});
    setEditingTaskId(task.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setForm(initialFormState);
    setErrors({});
    setEditingTaskId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedForm = normalizeForm(form);
    const validationErrors = validateForm(normalizedForm);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      if (editingTaskId) {
        await updateCleaningTask(editingTaskId, normalizedForm);
        setTasks((current) =>
          current.map((task) =>
            task.id === editingTaskId ? { ...task, ...normalizedForm } : task
          )
        );
        toast.success('Cleaning task updated');
      } else {
        const created = await createCleaningTask(normalizedForm);
        setTasks((current) => [created, ...current]);
        toast.success('Cleaning task created');
      }

      closeForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save cleaning task.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task: CleaningTask) => {
    setSubmitting(true);

    try {
      await deleteCleaningTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (editingTaskId === task.id) closeForm();
      toast.success('Cleaning task removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove cleaning task.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center">Loading cleaning tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cleaning Tasks</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Define task types and group them by category
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filter by category
        </label>
        <select
          value={filterCategory}
          onChange={(event) =>
            setFilterCategory(event.target.value as CleaningTaskCategory | 'All')
          }
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        >
          <option value="All">All categories</option>
          {taskCategories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <span>{formTitle}</span>
              <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close task form">
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
              <Field label="Task name" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Vacuum hallway"
                  aria-invalid={Boolean(errors.name)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Task category" error={errors.taskCategory}>
                <select
                  value={form.taskCategory}
                  onChange={(event) =>
                    updateField('taskCategory', event.target.value as CleaningTaskCategory)
                  }
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={Boolean(errors.taskCategory)}
                  disabled={submitting}
                >
                  {taskCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estimated duration (minutes)" error={errors.estimatedDuration}>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={form.estimatedDuration}
                  onChange={(event) =>
                    updateField('estimatedDuration', Number(event.target.value))
                  }
                  aria-invalid={Boolean(errors.estimatedDuration)}
                  disabled={submitting}
                />
              </Field>

              <Field label="Frequency" error={errors.frequency}>
                <select
                  value={form.frequency}
                  onChange={(event) => updateField('frequency', event.target.value)}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={Boolean(errors.frequency)}
                  disabled={submitting}
                >
                  {frequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Description" error={errors.description}>
                  <Textarea
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Optional notes about the task"
                    aria-invalid={Boolean(errors.description)}
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingTaskId ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visibleTasks.length === 0 ? (
          <div className="rounded-lg bg-slate-50 py-12 text-center dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-400">No cleaning tasks found</p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <Card key={task.id} className="transition hover:border-slate-300 hover:shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <TaskCategoryIcon category={task.taskCategory} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{task.name}</h2>
                    <Badge variant="secondary">{getCategoryLabel(task.taskCategory)}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{task.description || 'No description'}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm sm:justify-end">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Clock3 className="h-4 w-4" /><strong className="font-medium text-foreground">{task.estimatedDuration} min</strong></span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Repeat2 className="h-4 w-4" /><strong className="font-medium text-foreground">{task.frequency}</strong></span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => openEditForm(task)}
                    disabled={submitting}
                    aria-label={`Edit ${task.name}`}
                    title="Edit cleaning task"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    onClick={() => handleDelete(task)}
                    disabled={submitting}
                    aria-label={`Remove ${task.name}`}
                    title="Remove cleaning task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

function normalizeForm(form: FormState): FormState {
  return {
    ...form,
    name: form.name.trim(),
    description: form.description.trim(),
    frequency: form.frequency.trim(),
    estimatedDuration: Number(form.estimatedDuration),
  };
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name) errors.name = 'Task name is required.';
  else if (form.name.length < 2) errors.name = 'Task name must be at least 2 characters.';
  if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer.';
  if (!form.taskCategory) errors.taskCategory = 'Task category is required.';
  if (!Number.isFinite(form.estimatedDuration) || form.estimatedDuration < 1) {
    errors.estimatedDuration = 'Duration must be at least 1 minute.';
  } else if (form.estimatedDuration > 1440) {
    errors.estimatedDuration = 'Duration cannot exceed 1440 minutes.';
  }
  if (!form.frequency) errors.frequency = 'Frequency is required.';

  return errors;
}

function getCategoryLabel(category: CleaningTaskCategory): string {
  return taskCategories.find((item) => item.value === category)?.label ?? category;
}

function TaskCategoryIcon({ category }: { category: CleaningTaskCategory }) {
  const Icon = category === 'CommunityArea'
    ? Building2
    : category === 'Unit'
      ? DoorOpen
      : category === 'Apartment'
        ? Home
        : Sparkles;

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
      <Icon className="h-5 w-5" />
    </div>
  );
}
