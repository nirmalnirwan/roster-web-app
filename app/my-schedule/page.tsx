'use client';

import { useEffect, useState } from 'react';
import { RosterTask } from '../../lib/types';
import { getRosters } from '../services/rosterService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Clock, MapPin, User } from 'lucide-react';
import useRequireAuth from '../hooks/useRequireAuth';

export default function HousekeeperSchedulePage() {
  useRequireAuth();
  const [tasks, setTasks] = useState<RosterTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const rosters = await getRosters();
        const allTasks = rosters.flatMap(r => r.rosterTasks);
        setTasks(allTasks);
      } catch (error) {
        console.error('Failed to load schedule', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading schedule...</div>;
  }

  // Group tasks by day
  const tasksByDay: Record<string, RosterTask[]> = {};
  tasks.forEach(t => {
    const day = new Date(t.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(t);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Your assigned cleaning tasks
        </p>
      </div>

      <div className="space-y-6">
        {Object.keys(tasksByDay).length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">No tasks assigned</p>
          </div>
        ) : (
          Object.entries(tasksByDay).map(([day, dayTasks]) => (
            <div key={day}>
              <h2 className="text-xl font-semibold mb-4 text-blue-600">{day}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayTasks
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(t => (
                    <Card key={t.id} className="hover:shadow-md transition">
                      <CardHeader>
                        <CardTitle className="text-lg">{t.taskName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-mono">{t.startTime} - {t.endTime}</span>
                        </div>
                        {t.locationName && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{t.locationName}</span>
                          </div>
                        )}
                        {t.residentName && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="h-4 w-4" />
                            <span className="text-sm">Resident: {t.residentName}</span>
                          </div>
                        )}
                        {t.notes && (
                          <div className="text-sm text-gray-500 italic pt-2 border-t">
                            {t.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
