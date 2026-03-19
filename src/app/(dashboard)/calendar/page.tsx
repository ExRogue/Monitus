'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  addWeeks,
  subWeeks,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  Columns3,
  X,
  Clock,
  Globe,
  FileText,
  Send,
  Loader2,
  Edit3,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';

type ViewMode = 'month' | 'week' | 'list';

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: 'distribution' | 'content';
  status: 'published' | 'scheduled' | 'draft' | 'cancelled';
  channel?: string;
  contentType?: string;
}

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  published: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  scheduled: {
    dot: 'bg-blue-400',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  draft: {
    dot: 'bg-gray-400',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/20',
  },
  cancelled: {
    dot: 'bg-red-400',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  email: 'Email',
  trade_media: 'Trade Media',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn Post',
  podcast: 'Podcast',
  briefing: 'Briefing',
  trade_media: 'Trade Media',
  email: 'Email',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
        colors.bg,
        colors.text
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {status}
    </span>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const handleReschedule = useCallback(async (itemId: string, newDate: string) => {
    setReschedulingId(itemId);
    setRescheduleError(null);
    try {
      const res = await fetch('/api/distribution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, scheduled_at: newDate }),
      });
      if (!res.ok) {
        const data = await res.json();
        setRescheduleError(data.error || 'Failed to reschedule');
      } else {
        // Refresh items
        const [distRes] = await Promise.all([fetch('/api/distribution?limit=200')]);
        if (distRes.ok) {
          const distData = await distRes.json();
          setItems(prev => {
            const nonDist = prev.filter(i => i.type !== 'distribution');
            const newDist: CalendarItem[] = (distData.distributions || []).flatMap((d: any) => {
              const date = d.published_at || d.scheduled_at || d.created_at;
              if (!date) return [];
              return [{
                id: d.id,
                title: d.content_title || 'Untitled',
                date,
                type: 'distribution' as const,
                status: d.status || 'draft',
                channel: d.channel,
                contentType: d.content_type,
              }];
            });
            return [...nonDist, ...newDist];
          });
        }
      }
    } catch {
      setRescheduleError('Network error while rescheduling');
    } finally {
      setReschedulingId(null);
    }
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [distRes, genRes] = await Promise.all([
          fetch('/api/distribution?limit=200'),
          fetch('/api/generate?limit=100'),
        ]);

        const calItems: CalendarItem[] = [];

        if (distRes.ok) {
          const distData = await distRes.json();
          const distributions = distData.distributions || [];
          for (const d of distributions) {
            const date = d.published_at || d.scheduled_at || d.created_at;
            if (!date) continue;
            calItems.push({
              id: d.id,
              title: d.content_title || 'Untitled',
              date,
              type: 'distribution',
              status: d.status || 'draft',
              channel: d.channel,
              contentType: d.content_type,
            });
          }
        }

        if (genRes.ok) {
          const genData = await genRes.json();
          const content = genData.content || [];
          for (const c of content) {
            // Only add content items that don't already appear as distributions
            const alreadyTracked = calItems.some(
              (item) => item.title === c.title && item.type === 'distribution'
            );
            if (!alreadyTracked) {
              calItems.push({
                id: c.id,
                title: c.title || 'Untitled',
                date: c.created_at,
                type: 'content',
                status: 'draft',
                contentType: c.content_type,
              });
            }
          }
        }

        setItems(calItems);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () =>
    setCurrentDate((d) => (viewMode === 'week' ? subWeeks(d, 1) : subMonths(d, 1)));
  const goNext = () =>
    setCurrentDate((d) => (viewMode === 'week' ? addWeeks(d, 1) : addMonths(d, 1)));

  // Get items for a specific day
  const getItemsForDay = useCallback(
    (day: Date) =>
      items.filter((item) => {
        try {
          return isSameDay(parseISO(item.date), day);
        } catch {
          return false;
        }
      }),
    [items]
  );

  // Calendar grid days (month view)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  // Week view days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // List view items (sorted chronologically for the current month)
  const listItems = useMemo(() => {
    const monthStart_ = startOfMonth(currentDate);
    const monthEnd_ = endOfMonth(currentDate);
    return items
      .filter((item) => {
        try {
          const d = parseISO(item.date);
          return d >= monthStart_ && d <= monthEnd_;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items, currentDate]);

  // Handle day click
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setPanelOpen(true);
  };

  const selectedDayItems = selectedDay ? getItemsForDay(selectedDay) : [];

  const viewModes: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: 'month', icon: LayoutGrid, label: 'Month' },
    { mode: 'week', icon: Columns3, label: 'Week' },
    { mode: 'list', icon: List, label: 'List' },
  ];

  // Stats
  const totalPublished = items.filter((i) => i.status === 'published').length;
  const totalScheduled = items.filter((i) => i.status === 'scheduled').length;
  const totalDraft = items.filter((i) => i.status === 'draft').length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-[var(--accent)]" />
              Content Calendar
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Track your content pipeline across all channels
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{totalPublished} published</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs font-medium text-blue-400">{totalScheduled} scheduled</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs font-medium text-gray-400">{totalDraft} drafts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={goPrev}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors border-l border-[var(--border)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] ml-1">
            {viewMode === 'week'
              ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === mode
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]',
                mode !== 'month' && 'border-l border-[var(--border)]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading calendar...</span>
        </div>
      )}

      {/* Calendar Views */}
      {!loading && (
        <div className="flex gap-0">
          {/* Main calendar area */}
          <div className={clsx('flex-1 transition-all duration-300', panelOpen && 'mr-[380px]')}>
            {viewMode === 'month' && (
              <MonthView
                days={monthDays}
                currentDate={currentDate}
                getItemsForDay={getItemsForDay}
                onDayClick={handleDayClick}
                selectedDay={selectedDay}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                days={weekDays}
                getItemsForDay={getItemsForDay}
                onDayClick={handleDayClick}
                selectedDay={selectedDay}
              />
            )}
            {viewMode === 'list' && (
              <ListView items={listItems} onDayClick={handleDayClick} />
            )}
          </div>

          {/* Slide-out panel */}
          <SlideOutPanel
            open={panelOpen}
            day={selectedDay}
            items={selectedDayItems}
            onClose={() => {
              setPanelOpen(false);
              setSelectedDay(null);
            }}
            onReschedule={handleReschedule}
            reschedulingId={reschedulingId}
            rescheduleError={rescheduleError}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Month View ─────────────────────────────── */

function MonthView({
  days,
  currentDate,
  getItemsForDay,
  onDayClick,
  selectedDay,
}: {
  days: Date[];
  currentDate: Date;
  getItemsForDay: (day: Date) => CalendarItem[];
  onDayClick: (day: Date) => void;
  selectedDay: Date | null;
}) {
  const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {weekdayHeaders.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center text-[11px] font-semibold tracking-wider text-[var(--text-secondary)]/60 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayItems = getItemsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              className={clsx(
                'relative min-h-[100px] p-1.5 text-left border-b border-r border-[var(--border)] transition-colors group',
                inMonth
                  ? 'hover:bg-[var(--navy-lighter)]/50'
                  : 'bg-[var(--navy)]/30 opacity-50',
                isSelected && 'bg-[var(--accent)]/5 ring-1 ring-inset ring-[var(--accent)]/30'
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={clsx(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium',
                    today
                      ? 'bg-[var(--accent)] text-white'
                      : inMonth
                        ? 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                        : 'text-[var(--text-secondary)]/40'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Content pills */}
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => {
                  const colors = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate',
                        colors.bg,
                        colors.text
                      )}
                    >
                      <span className={clsx('w-1 h-1 rounded-full flex-shrink-0', colors.dot)} />
                      <span className="truncate">{item.title}</span>
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-[var(--text-secondary)] pl-1.5">
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Week View ─────────────────────────────── */

function WeekView({
  days,
  getItemsForDay,
  onDayClick,
  selectedDay,
}: {
  days: Date[];
  getItemsForDay: (day: Date) => CalendarItem[];
  onDayClick: (day: Date) => void;
  selectedDay: Date | null;
}) {
  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((day, idx) => {
        const dayItems = getItemsForDay(day);
        const today = isToday(day);
        const isSelected = selectedDay && isSameDay(day, selectedDay);

        return (
          <button
            key={idx}
            onClick={() => onDayClick(day)}
            className={clsx(
              'rounded-xl border bg-[var(--navy-light)] p-3 text-left transition-all hover:border-[var(--accent)]/30 min-h-[280px] flex flex-col',
              isSelected
                ? 'border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20'
                : 'border-[var(--border)]'
            )}
          >
            {/* Day header */}
            <div className="mb-3">
              <div className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)]/60 uppercase mb-1">
                {format(day, 'EEE')}
              </div>
              <div
                className={clsx(
                  'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold',
                  today
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)]'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>

            {/* Content cards */}
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {dayItems.map((item) => {
                const colors = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      'rounded-lg border p-2 transition-colors',
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className={clsx('text-xs font-medium truncate', colors.text)}>
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.channel && (
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {CHANNEL_LABELS[item.channel] || item.channel}
                        </span>
                      )}
                      {!item.channel && item.contentType && (
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {dayItems.length === 0 && (
                <div className="text-[11px] text-[var(--text-secondary)]/40 italic pt-2">
                  No content
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── List View ─────────────────────────────── */

function ListView({
  items,
  onDayClick,
}: {
  items: CalendarItem[];
  onDayClick: (day: Date) => void;
}) {
  // Group items by date
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = format(parseISO(item.date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No content this month</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">There are no scheduled or published content items for this period. Create content from the Pipeline page and it will appear on your calendar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, dayItems]) => {
        const day = parseISO(dateKey);
        const today = isToday(day);

        return (
          <div key={dateKey} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
            {/* Date header */}
            <button
              onClick={() => onDayClick(day)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--navy-lighter)]/50 transition-colors text-left"
            >
              <div
                className={clsx(
                  'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold',
                  today
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--navy-lighter)] text-[var(--text-primary)]'
                )}
              >
                {format(day, 'd')}
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {format(day, 'EEEE')}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {format(day, 'MMMM d, yyyy')}
                </div>
              </div>
              <div className="ml-auto">
                <span className="text-xs text-[var(--text-secondary)] bg-[var(--navy-lighter)] px-2 py-0.5 rounded-full">
                  {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </button>

            {/* Items */}
            <div className="divide-y divide-[var(--border)]">
              {dayItems.map((item) => {
                const colors = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--navy-lighter)]/30 transition-colors">
                    <div className={clsx('w-1 h-8 rounded-full flex-shrink-0', colors.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {format(parseISO(item.date), 'h:mm a')}
                        </span>
                        {item.channel && (
                          <>
                            <span className="text-[var(--text-secondary)]/30">·</span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {CHANNEL_LABELS[item.channel] || item.channel}
                            </span>
                          </>
                        )}
                        {item.contentType && (
                          <>
                            <span className="text-[var(--text-secondary)]/30">·</span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {CONTENT_TYPE_LABELS[item.contentType] || item.contentType}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Slide-Out Panel ─────────────────────────── */

function SlideOutPanel({
  open,
  day,
  items,
  onClose,
  onReschedule,
  reschedulingId,
  rescheduleError,
}: {
  open: boolean;
  day: Date | null;
  items: CalendarItem[];
  onClose: () => void;
  onReschedule: (itemId: string, newDate: string) => void;
  reschedulingId: string | null;
  rescheduleError: string | null;
}) {
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');

  return (
    <div
      className={clsx(
        'fixed top-0 right-0 h-full w-[380px] bg-[var(--navy-light)] border-l border-[var(--border)] shadow-2xl shadow-black/30 z-30 transition-transform duration-300 ease-in-out flex flex-col',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {day && (
        <>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {format(day, 'EEEE')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {format(day, 'MMMM d, yyyy')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {rescheduleError && (
            <div className="mx-5 mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {rescheduleError}
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No content on this day</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md">Content scheduled or published on this date will appear here automatically.</p>
              </div>
            ) : (
              items.map((item) => {
                const colors = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                const isEditingSchedule = editingScheduleId === item.id;
                const isRescheduling = reschedulingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={clsx(
                      'rounded-xl border p-4 transition-colors hover:bg-[var(--navy-lighter)]/30',
                      colors.border,
                      'bg-[var(--navy)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                        {item.title}
                      </h4>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="space-y-1.5 mt-3">
                      {item.channel && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <Send className="w-3 h-3 flex-shrink-0" />
                          <span>{CHANNEL_LABELS[item.channel] || item.channel}</span>
                        </div>
                      )}
                      {item.contentType && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <FileText className="w-3 h-3 flex-shrink-0" />
                          <span>{CONTENT_TYPE_LABELS[item.contentType] || item.contentType}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{format(parseISO(item.date), 'h:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="capitalize">
                          {item.type === 'distribution' ? 'Distribution' : 'Content Creation'}
                        </span>
                      </div>
                    </div>

                    {/* Reschedule button for scheduled/draft distributions */}
                    {item.type === 'distribution' && item.status !== 'published' && item.status !== 'cancelled' && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        {!isEditingSchedule ? (
                          <button
                            onClick={() => {
                              setEditingScheduleId(item.id);
                              setNewScheduleDate('');
                            }}
                            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            Reschedule
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-[var(--text-secondary)]">New date & time</p>
                            <input
                              type="datetime-local"
                              value={newScheduleDate}
                              onChange={(e) => setNewScheduleDate(e.target.value)}
                              className="w-full bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (newScheduleDate) {
                                    onReschedule(item.id, new Date(newScheduleDate).toISOString());
                                    setEditingScheduleId(null);
                                  }
                                }}
                                disabled={!newScheduleDate || isRescheduling}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white disabled:opacity-50 transition-colors"
                              >
                                {isRescheduling ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingScheduleId(null)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel footer */}
          {items.length > 0 && (
            <div className="px-5 py-3 border-t border-[var(--border)]">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>
                  {items.length} item{items.length !== 1 ? 's' : ''} on this day
                </span>
                <div className="flex items-center gap-2">
                  {items.filter((i) => i.status === 'published').length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {items.filter((i) => i.status === 'published').length}
                    </span>
                  )}
                  {items.filter((i) => i.status === 'scheduled').length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {items.filter((i) => i.status === 'scheduled').length}
                    </span>
                  )}
                  {items.filter((i) => i.status === 'draft').length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      {items.filter((i) => i.status === 'draft').length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
