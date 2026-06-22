import { apiClient } from './apiClient';
import type { CleaningTask, CleaningTaskRequest } from '@/lib/types';

export async function getCleaningTasks(): Promise<CleaningTask[]> {
  const res = await apiClient.get('/cleaningtasks');
  return (await res.json()) as CleaningTask[];
}

export async function createCleaningTask(task: CleaningTaskRequest): Promise<CleaningTask> {
  const res = await apiClient.post('/cleaningtasks', task);
  return (await res.json()) as CleaningTask;
}

export async function updateCleaningTask(id: number, task: CleaningTaskRequest): Promise<void> {
  await apiClient.put(`/cleaningtasks/${id}`, task);
}

export async function deleteCleaningTask(id: number): Promise<void> {
  await apiClient.delete(`/cleaningtasks/${id}`);
}
