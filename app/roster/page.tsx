'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import type { EventReceiveArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { Building2, CalendarDays, ChevronDown, Clock, DoorOpen, Home, Layers, Loader2, MapPin, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import useRequireAuth from '../hooks/useRequireAuth';
import { getApartments, getCommonAreas, getUnits } from '../services/areaService';
import { getCleaningTasks } from '../services/cleaningTaskService';
import { getHousekeepers } from '../services/housekeeperService';
import { createRoster, getRoster, getRosterByWeek, updateRoster } from '../services/rosterService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ROSTER_AREA_STYLES } from '@/lib/rosterAreaStyles';
import type {
  Apartment,
  CleaningTask,
  CommonArea,
  Housekeeper,
  Roster,
  RosterAreaType,
  RosterTask,
  Unit,
} from '../../lib/types';

type CleaningArea = {
  id: number;
  name: string;
  areaType: RosterAreaType;
  subtitle: string;
  cleaningTaskId?: number;
  cleaningTaskName?: string;
  cleaningTaskDuration?: number;
  residentId?: number;
  residentName?: string;
  locationTypeId: number;
  locationTypeName: string;
  buildingBlockId: number;
  buildingBlockName: string;
  floorId: number;
  floorName: string;
};

type AreaFloorNode = { id: number; name: string; areas: CleaningArea[] };
type AreaBuildingNode = { id: number; name: string; floors: AreaFloorNode[] };
type AreaLocationNode = { id: number; name: string; buildings: AreaBuildingNode[] };

type EditForm = {
  taskId: number;
  housekeeperId: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const CALENDAR_FIRST_DAY = 1;

const initialEditForm: EditForm = {
  taskId: 0,
  housekeeperId: 0,
  scheduledDate: '',
  startTime: '09:00',
  endTime: '10:00',
  notes: '',
};

export default function RosterPage() {
  useRequireAuth();

  const externalAreasRef = useRef<HTMLDivElement | null>(null);
  const [currentRoster, setCurrentRoster] = useState<Roster | null>(null);
  const [housekeepers, setHousekeepers] = useState<Housekeeper[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [selectedHousekeeperId, setSelectedHousekeeperId] = useState(0);
  const [weekStartDate, setWeekStartDate] = useState(() => toDateInput(getStartOfWeek(new Date())));
  const [areaFilter, setAreaFilter] = useState<RosterAreaType | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<RosterTask | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(initialEditForm);
  const [expandedAreaSections, setExpandedAreaSections] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;

    async function loadBuilderData() {
      try {
        const [housekeeperData, cleaningTaskData, commonAreaData, unitData, apartmentData] = await Promise.all([
          getHousekeepers(),
          getCleaningTasks(),
          getCommonAreas(),
          getUnits(),
          getApartments(),
        ]);

        if (!active) return;

        setHousekeepers(housekeeperData);
        setCleaningTasks(cleaningTaskData);
        setAreas(buildCleaningAreas(commonAreaData, unitData, apartmentData, cleaningTaskData));
        setSelectedHousekeeperId(housekeeperData[0]?.id ?? 0);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load roster builder data.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBuilderData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRosterForWeek() {
      if (!selectedHousekeeperId) {
        setCurrentRoster(null);
        setLoadingRoster(false);
        return;
      }

      setCurrentRoster(null);
      setLoadingRoster(true);
      try {
        const roster = await getRosterByWeek(selectedHousekeeperId, toApiDate(parseDateInput(weekStartDate)));
        if (active) setCurrentRoster(roster);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load roster for selected week.');
      } finally {
        if (active) setLoadingRoster(false);
      }
    }

    loadRosterForWeek();

    return () => {
      active = false;
    };
  }, [selectedHousekeeperId, weekStartDate]);

  useEffect(() => {
    const container = externalAreasRef.current;
    if (!container) return;

    const draggable = new Draggable(container, {
      itemSelector: '.fc-external-area',
      eventData: (eventEl: HTMLElement) => {
        const duration = positiveDuration(Number(eventEl.dataset.taskDuration));
        const areaType = eventEl.dataset.areaType as RosterAreaType;
        const style = ROSTER_AREA_STYLES[areaType];
        return {
          title: eventEl.dataset.title ?? 'Cleaning area',
          duration: minutesToDuration(duration),
          backgroundColor: style.eventBackgroundColor,
          borderColor: style.eventBorderColor,
          textColor: style.eventTextColor,
          extendedProps: {
            areaId: Number(eventEl.dataset.areaId),
            areaType,
            areaName: eventEl.dataset.areaName ?? '',
          },
        };
      },
    });

    return () => draggable.destroy();
  }, [areas]);

  const activeHousekeeper = housekeepers.find((housekeeper) => housekeeper.id === selectedHousekeeperId);

  const visibleAreas = useMemo(
    () => areas.filter((area) => areaFilter === 'All' || area.areaType === areaFilter),
    [areas, areaFilter]
  );

  const visibleTasks = useMemo(() => currentRoster?.rosterTasks ?? [], [currentRoster]);
  const areaHierarchy = useMemo(() => buildAreaHierarchy(visibleAreas), [visibleAreas]);

  const calendarEvents = useMemo(() => mapTasksToEvents(visibleTasks), [visibleTasks]);

  function toggleAreaSection(key: string) {
    setExpandedAreaSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveRosterTasks(
    tasks: RosterTask[],
    targetWeekStartDate = weekStartDate,
    targetRoster = currentRoster
  ) {
    if (!activeHousekeeper) {
      throw new Error('Select a housekeeper before saving the roster.');
    }

    const payload: Roster = {
      id: targetRoster?.id ?? 0,
      housekeeperId: activeHousekeeper.id,
      housekeeperName: activeHousekeeper.name,
      weekStartDate: toApiDate(parseDateInput(targetWeekStartDate)),
      createdBy: targetRoster?.createdBy || 'Admin',
      createdDate: targetRoster?.createdDate || new Date().toISOString(),
      rosterTasks: tasks.map((task) => ({
        ...task,
        id: task.id > 0 ? task.id : 0,
        rosterId: targetRoster?.id ?? 0,
      })),
    };

    setSaving(true);
    try {
      if (targetRoster?.id) {
        await updateRoster(targetRoster.id, payload);
        setCurrentRoster(await getRoster(targetRoster.id));
      } else {
        const created = await createRoster(payload);
        setCurrentRoster(created);
      }
      toast.success('Roster saved');
    } finally {
      setSaving(false);
    }
  }

  async function handleExternalReceive(info: EventReceiveArg) {
    info.event.remove();

    if (!activeHousekeeper) {
      toast.error('Select a housekeeper before scheduling a task.');
      return;
    }

    if (!info.event.start) {
      toast.error('Drop the area onto a valid timetable slot.');
      return;
    }

    const areaId = Number(info.event.extendedProps.areaId);
    const areaType = info.event.extendedProps.areaType as RosterAreaType;
    const areaName = String(info.event.extendedProps.areaName ?? '');
    const droppedArea = areas.find((area) => area.id === areaId && area.areaType === areaType);

    if (!droppedArea) {
      toast.error('Selected cleaning area is no longer available.');
      return;
    }

    const assignedCleaningTask = cleaningTasks.find((task) => task.id === droppedArea.cleaningTaskId);
    if (!assignedCleaningTask) {
      toast.error('Assign a cleaning task to this area in Locations before scheduling it.');
      return;
    }

    const start = info.event.start;
    const end = addMinutes(start, positiveDuration(assignedCleaningTask.estimatedDuration));
    const task = buildRosterTask({
      area: droppedArea,
      cleaningTask: assignedCleaningTask,
      housekeeper: activeHousekeeper,
      scheduledDate: start,
      start,
      end,
      areaName,
    });

    try {
      const droppedWeekStartDate = toDateInput(getStartOfWeek(start));
      const rosterForDroppedWeek = isRosterForWeek(currentRoster, activeHousekeeper.id, droppedWeekStartDate)
        ? currentRoster
        : await getRosterByWeek(activeHousekeeper.id, toApiDate(parseDateInput(droppedWeekStartDate)));

      await saveRosterTasks(
        [...(rosterForDroppedWeek?.rosterTasks ?? []), task],
        droppedWeekStartDate,
        rosterForDroppedWeek
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule task.');
    }
  }

  function handleCalendarDatesSet(info: DatesSetArg) {
    const visibleWeekStartDate = toDateInput(getStartOfWeek(info.start));
    if (visibleWeekStartDate === weekStartDate) return;

    setCurrentRoster(null);
    setWeekStartDate(visibleWeekStartDate);
  }

  async function handleEventDrop(change: EventDropArg) {
    if (!change.event.start || !change.event.end) return;

    const taskId = Number(change.event.id);
    const updatedTasks = updateTaskTime(currentRoster?.rosterTasks ?? [], taskId, change.event.start, change.event.end);

    try {
      await saveRosterTasks(updatedTasks);
    } catch (error) {
      change.revert();
      toast.error(error instanceof Error ? error.message : 'Failed to move task.');
    }
  }

  async function handleEventResize(change: EventResizeDoneArg) {
    if (!change.event.start || !change.event.end) return;

    const taskId = Number(change.event.id);
    const updatedTasks = updateTaskTime(currentRoster?.rosterTasks ?? [], taskId, change.event.start, change.event.end);

    try {
      await saveRosterTasks(updatedTasks);
    } catch (error) {
      change.revert();
      toast.error(error instanceof Error ? error.message : 'Failed to update task duration.');
    }
  }

  function handleEventClick(click: EventClickArg) {
    const taskId = Number(click.event.id);
    const task = currentRoster?.rosterTasks.find((item) => item.id === taskId);
    if (!task) return;

    setEditingTask(task);
    setEditForm({
      taskId: task.taskId,
      housekeeperId: task.housekeeperId,
      scheduledDate: toDateInput(new Date(task.scheduledDate)),
      startTime: toShortTime(task.startTime),
      endTime: toShortTime(task.endTime),
      notes: task.notes,
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;

    const start = combineDateTime(editForm.scheduledDate, editForm.startTime);
    const end = combineDateTime(editForm.scheduledDate, editForm.endTime);
    if (start >= end) {
      toast.error('Start time must be before end time.');
      return;
    }

    const selectedTask = cleaningTasks.find((task) => task.id === editForm.taskId);
    if (!selectedTask || !activeHousekeeper) {
      toast.error('Select a valid housekeeper and cleaning task.');
      return;
    }

    const updatedTasks = (currentRoster?.rosterTasks ?? []).map((task) =>
      task.id === editingTask.id
        ? {
            ...task,
            taskId: selectedTask.id,
            taskName: selectedTask.name,
            housekeeperId: activeHousekeeper.id,
            housekeeperName: activeHousekeeper.name,
            scheduledDate: toApiDate(start),
            startTime: toTime(start),
            endTime: toTime(end),
            notes: editForm.notes.trim(),
          }
        : task
    );

    try {
      await saveRosterTasks(updatedTasks);
      closeEditDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update roster task.');
    }
  }

  async function handleDeleteTask() {
    if (!editingTask) return;
    const updatedTasks = (currentRoster?.rosterTasks ?? []).filter((task) => task.id !== editingTask.id);

    try {
      await saveRosterTasks(updatedTasks);
      closeEditDialog();
      toast.success('Roster task removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete roster task.');
    }
  }

  function closeEditDialog() {
    setEditingTask(null);
    setEditForm(initialEditForm);
  }

  if (loading) {
    return <div className="py-12 text-center">Loading roster builder...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster Builder</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Build weekly housekeeper timetables by dragging cleaning areas into time slots.
          </p>
        </div>
        <div className="grid gap-3">
          <label className="space-y-2 text-sm font-medium">
            Housekeeper
            <select
              value={selectedHousekeeperId}
              onChange={(event) => {
                setCurrentRoster(null);
                setSelectedHousekeeperId(Number(event.target.value));
              }}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              <option value={0}>Select a housekeeper</option>
              {housekeepers.map((housekeeper) => (
                <option key={housekeeper.id} value={housekeeper.id}>
                  {housekeeper.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Cleaning Areas
            </CardTitle>
            <CardDescription>Drag an area into the timetable to schedule it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['All', 'CommonArea', 'Unit', 'Apartment'] as const).map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={areaFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAreaFilter(filter)}
                >
                  {filter === 'CommonArea' ? 'Common' : filter}
                </Button>
              ))}
            </div>

            <div ref={externalAreasRef} className="max-h-[760px] overflow-y-auto pr-1">
              {visibleAreas.length === 0 ? (
                <div className="rounded-md bg-slate-50 px-3 py-4 text-sm text-muted-foreground dark:bg-slate-800">
                  No cleaning areas available.
                </div>
              ) : (
                <CleaningAreaTree
                  hierarchy={areaHierarchy}
                  expandedSections={expandedAreaSections}
                  onToggle={toggleAreaSection}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                Weekly Timetable
              </CardTitle>
              <CardDescription>
                {activeHousekeeper ? `Showing ${activeHousekeeper.name}` : 'Select a housekeeper'}
              </CardDescription>
            </div>
            {(saving || loadingRoster) && (
              <Badge variant="outline" className="gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {saving ? 'Saving' : 'Loading'}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="roster-calendar">
              <FullCalendar
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                initialDate={weekStartDate}
                firstDay={CALENDAR_FIRST_DAY}
                editable={!loadingRoster && !saving}
                droppable={!loadingRoster && !saving}
                selectable
                eventResizableFromStart
                allDaySlot={false}
                events={calendarEvents}
                eventReceive={handleExternalReceive}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventClick={handleEventClick}
                datesSet={handleCalendarDatesSet}
                slotMinTime="06:00:00"
                slotMaxTime="16:00:00"
                slotDuration="00:15:00"
                height="auto"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Edit Roster Task</span>
                <Button variant="ghost" size="icon" onClick={closeEditDialog} aria-label="Close edit roster task">
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>{editingTask.areaName || editingTask.taskName}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
                <label className="space-y-2 text-sm font-medium">
                  Housekeeper
                  <Input value={activeHousekeeper?.name ?? ''} disabled />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  Cleaning task
                  <Input value={editingTask.taskName} disabled />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  Date
                  <Input
                    type="date"
                    value={editForm.scheduledDate}
                    onChange={(event) => setEditForm((current) => ({ ...current, scheduledDate: event.target.value }))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2 text-sm font-medium">
                    Start
                    <Input
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, startTime: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    End
                    <Input
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) => setEditForm((current) => ({ ...current, endTime: event.target.value }))}
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium md:col-span-2">
                  Notes
                  <Textarea
                    value={editForm.notes}
                    onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </label>

                <div className="flex flex-col-reverse gap-2 md:col-span-2 md:flex-row md:justify-between">
                  <Button type="button" variant="destructive" onClick={handleDeleteTask} disabled={saving}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeEditDialog} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CleaningAreaTree({
  hierarchy,
  expandedSections,
  onToggle,
}: {
  hierarchy: AreaLocationNode[];
  expandedSections: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {hierarchy.map((location) => {
        const locationKey = `roster-location:${location.id}`;
        const locationExpanded = expandedSections.has(locationKey);

        return (
          <div key={location.id} className="rounded-md border bg-background">
            <button
              type="button"
              onClick={() => onToggle(locationKey)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-muted/60"
              aria-expanded={locationExpanded}
            >
              <HierarchyChevron expanded={locationExpanded} />
              <MapPin className="h-4 w-4 text-violet-600" />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <Badge variant="outline">{location.buildings.length}</Badge>
            </button>

            {locationExpanded && (
              <div className="space-y-2 border-t p-2">
                {location.buildings.map((building) => {
                  const buildingKey = `roster-building:${building.id}`;
                  const buildingExpanded = expandedSections.has(buildingKey);

                  return (
                    <div key={building.id} className="rounded-md border bg-muted/20">
                      <button
                        type="button"
                        onClick={() => onToggle(buildingKey)}
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm font-medium hover:bg-muted/60"
                        aria-expanded={buildingExpanded}
                      >
                        <HierarchyChevron expanded={buildingExpanded} />
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">{building.name}</span>
                        <span className="text-xs text-muted-foreground">{building.floors.length} floors</span>
                      </button>

                      {buildingExpanded && (
                        <div className="space-y-2 border-t p-2">
                          {building.floors.map((floor) => {
                            const floorKey = `roster-floor:${floor.id}`;
                            const floorExpanded = expandedSections.has(floorKey);

                            return (
                              <div key={floor.id} className="rounded-md border bg-background">
                                <button
                                  type="button"
                                  onClick={() => onToggle(floorKey)}
                                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-muted/60"
                                  aria-expanded={floorExpanded}
                                >
                                  <HierarchyChevron expanded={floorExpanded} />
                                  <Layers className="h-4 w-4 text-slate-500" />
                                  <span className="min-w-0 flex-1 truncate font-medium">{floor.name}</span>
                                  <span className="text-xs text-muted-foreground">{floor.areas.length}</span>
                                </button>

                                {floorExpanded && (
                                  <div className="space-y-3 border-t p-2">
                                    {(['CommonArea', 'Unit', 'Apartment'] as const).map((areaType) => {
                                      const typeAreas = floor.areas.filter((area) => area.areaType === areaType);
                                      if (typeAreas.length === 0) return null;

                                      return (
                                        <div key={areaType} className="space-y-1.5">
                                          <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
                                            <AreaTypeIcon areaType={areaType} />
                                            {getAreaTypeLabel(areaType)}
                                          </div>
                                          {typeAreas.map((area) => <DraggableAreaItem key={`${area.areaType}-${area.id}`} area={area} />)}
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

function DraggableAreaItem({ area }: { area: CleaningArea }) {
  return (
    <div
      className={`fc-external-area cursor-grab rounded-md border px-2.5 py-2 shadow-sm transition active:cursor-grabbing ${ROSTER_AREA_STYLES[area.areaType].listClassName}`}
      data-area-id={area.id}
      data-area-type={area.areaType}
      data-area-name={area.name}
      data-task-duration={area.cleaningTaskDuration ?? 60}
      data-title={`${area.name} - ${area.cleaningTaskName || 'Cleaning task'}`}
    >
      <div className="truncate text-sm font-medium">{area.name}</div>
      <div className="truncate text-xs text-muted-foreground">
        {area.cleaningTaskName || 'No task'}{area.residentName ? ` / ${area.residentName}` : ''}
      </div>
    </div>
  );
}

function HierarchyChevron({ expanded }: { expanded: boolean }) {
  return <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />;
}

function AreaTypeIcon({ areaType }: { areaType: RosterAreaType }) {
  const Icon = areaType === 'CommonArea' ? Sparkles : areaType === 'Unit' ? DoorOpen : Home;
  return <Icon className="h-3.5 w-3.5" />;
}

function getAreaTypeLabel(areaType: RosterAreaType) {
  return areaType === 'CommonArea' ? 'Common Areas' : areaType === 'Unit' ? 'Units' : 'Apartments';
}

function buildAreaHierarchy(areas: CleaningArea[]): AreaLocationNode[] {
  const locations = new Map<number, AreaLocationNode>();

  for (const area of areas) {
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

    floor.areas.push(area);
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
            .map((floor) => ({ ...floor, areas: floor.areas.sort((a, b) => a.name.localeCompare(b.name)) })),
        })),
    }));
}

function buildCleaningAreas(
  commonAreas: CommonArea[],
  units: Unit[],
  apartments: Apartment[],
  cleaningTasks: CleaningTask[]
): CleaningArea[] {
  const taskById = new Map(cleaningTasks.map((task) => [task.id, task]));
  return [
    ...commonAreas.map((area) => ({
      id: area.id,
      name: area.name,
      areaType: 'CommonArea' as const,
      subtitle: `${area.locationTypeName} / ${area.buildingBlockName} / ${area.floorName} / ${area.cleaningTaskName || 'No task'}`,
      cleaningTaskId: area.cleaningTaskId,
      cleaningTaskName: area.cleaningTaskName,
      cleaningTaskDuration: area.cleaningTaskId ? taskById.get(area.cleaningTaskId)?.estimatedDuration : undefined,
      locationTypeId: area.locationTypeId,
      locationTypeName: area.locationTypeName,
      buildingBlockId: area.buildingBlockId,
      buildingBlockName: area.buildingBlockName,
      floorId: area.floorId,
      floorName: area.floorName,
    })),
    ...units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      areaType: 'Unit' as const,
      subtitle: `${unit.locationTypeName} / ${unit.buildingBlockName} / ${unit.floorName} / ${unit.unitNumber} / ${unit.cleaningTaskName || 'No task'}`,
      cleaningTaskId: unit.cleaningTaskId,
      cleaningTaskName: unit.cleaningTaskName,
      cleaningTaskDuration: unit.cleaningTaskId ? taskById.get(unit.cleaningTaskId)?.estimatedDuration : undefined,
      residentId: unit.residentId,
      residentName: unit.residentName,
      locationTypeId: unit.locationTypeId,
      locationTypeName: unit.locationTypeName,
      buildingBlockId: unit.buildingBlockId,
      buildingBlockName: unit.buildingBlockName,
      floorId: unit.floorId,
      floorName: unit.floorName,
    })),
    ...apartments.map((apartment) => ({
      id: apartment.id,
      name: apartment.name,
      areaType: 'Apartment' as const,
      subtitle: `${apartment.locationTypeName} / ${apartment.buildingBlockName} / ${apartment.floorName} / ${apartment.apartmentNumber} / ${apartment.cleaningTaskName || 'No task'}`,
      cleaningTaskId: apartment.cleaningTaskId,
      cleaningTaskName: apartment.cleaningTaskName,
      cleaningTaskDuration: apartment.cleaningTaskId ? taskById.get(apartment.cleaningTaskId)?.estimatedDuration : undefined,
      residentId: apartment.residentId,
      residentName: apartment.residentName,
      locationTypeId: apartment.locationTypeId,
      locationTypeName: apartment.locationTypeName,
      buildingBlockId: apartment.buildingBlockId,
      buildingBlockName: apartment.buildingBlockName,
      floorId: apartment.floorId,
      floorName: apartment.floorName,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

function buildRosterTask({
  area,
  cleaningTask,
  housekeeper,
  scheduledDate,
  start,
  end,
}: {
  area: CleaningArea;
  cleaningTask: CleaningTask;
  housekeeper: Housekeeper;
  scheduledDate: Date;
  start: Date;
  end: Date;
  areaName: string;
}): RosterTask {
  return {
    id: 0,
    rosterId: 0,
    housekeeperId: housekeeper.id,
    housekeeperName: housekeeper.name,
    taskId: cleaningTask.id,
    taskName: cleaningTask.name,
    commonAreaId: area.areaType === 'CommonArea' ? area.id : undefined,
    unitId: area.areaType === 'Unit' ? area.id : undefined,
    apartmentId: area.areaType === 'Apartment' ? area.id : undefined,
    residentId: area.residentId,
    residentName: area.residentName,
    areaType: area.areaType,
    areaName: area.name,
    scheduledDate: toApiDate(scheduledDate),
    startTime: toTime(start),
    endTime: toTime(end),
    frequencyType: cleaningTask.frequency || 'Weekly',
    notes: '',
  };
}

function mapTasksToEvents(tasks: RosterTask[]): EventInput[] {
  return tasks.map((task) => {
    const start = combineDateTime(toDateInput(new Date(task.scheduledDate)), task.startTime);
    const end = combineDateTime(toDateInput(new Date(task.scheduledDate)), task.endTime);
    const style = task.areaType
      ? ROSTER_AREA_STYLES[task.areaType]
      : ROSTER_AREA_STYLES.CommonArea;

    return {
      id: task.id.toString(),
      title: [
        task.areaName,
        task.taskName,
        task.residentName,
        formatDuration(task.startTime, task.endTime),
      ].filter(Boolean).join(' / '),
      start,
      end,
      backgroundColor: style.eventBackgroundColor,
      borderColor: style.eventBorderColor,
      textColor: style.eventTextColor,
      extendedProps: task,
    };
  });
}

function updateTaskTime(tasks: RosterTask[], taskId: number, start: Date, end: Date): RosterTask[] {
  return tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          scheduledDate: toApiDate(start),
          startTime: toTime(start),
          endTime: toTime(end),
        }
      : task
  );
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const daysFromWeekStart = (copy.getDay() - CALENDAR_FIRST_DAY + 7) % 7;
  copy.setDate(copy.getDate() - daysFromWeekStart);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isRosterForWeek(roster: Roster | null, housekeeperId: number, weekStartDate: string) {
  return Boolean(
    roster &&
      roster.housekeeperId === housekeeperId &&
      toDateInput(new Date(roster.weekStartDate)) === weekStartDate
  );
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toApiDate(date: Date) {
  return `${toDateInput(date)}T00:00:00.000Z`;
}

function toTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function toShortTime(time: string) {
  return time.slice(0, 5);
}

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${toShortTime(time)}:00`);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function minutesToDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:00`;
}

function positiveDuration(minutes: number) {
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
}

function formatDuration(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  const duration = positiveDuration(minutes);
  return duration >= 60 && duration % 60 === 0
    ? `${duration / 60} hr`
    : `${duration} min`;
}
