// src/components/AdvancedCalendar.jsx
import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

/**
 * Advanced Calendar Component for SimuPed
 * Displays scheduled sessions and events with interactive features
 */

export default function AdvancedCalendar({
  sessions = [],
  onDateClick = () => {},
  onEventClick = () => {},
  compact = false,
  className = ""
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay()));

  // Generate calendar days
  const calendarDays = [];
  let day = new Date(startDate);

  while (day <= endDate) {
    calendarDays.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  // Group sessions by date
  const sessionsByDate = React.useMemo(() => {
    const grouped = {};
    sessions.forEach(session => {
      const dateKey = new Date(session.scheduled_at).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [sessions]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    onDateClick(date);
  };

  const handleEventClick = (event, session) => {
    event.stopPropagation();
    onEventClick(session);
  };

  // Compact calendar for dashboard
  if (compact) {
    return (
      <div className={`rounded-2xl border border-white/70 bg-white/75 backdrop-blur-sm p-4 shadow-[0_15px_30px_-25px_rgba(15,23,42,0.5)] ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Sesiones del mes</h3>
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
            className="text-sm text-[#0A3D91] hover:underline"
          >
            {viewMode === 'month' ? 'Vista semana' : 'Vista mes'}
          </button>
        </div>

        {/* Month header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-slate-100 rounded-md transition"
          >
            <ChevronLeftIcon className="w-4 h-4 text-slate-600" />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-900">
              {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-slate-100 rounded-md transition"
          >
            <ChevronRightIcon className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, index) => (
            <div key={index} className="text-xs text-slate-500 font-bold text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.slice(0, 35).map((date, index) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();
            const dateKey = date.toDateString();
            const daySessions = sessionsByDate[dateKey] || [];
            const hasEvents = daySessions.length > 0;

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`h-8 w-8 text-xs rounded-full grid place-items-center cursor-pointer transition relative ${
                  isToday
                    ? 'bg-[#0A3D91] text-white font-bold'
                    : !isCurrentMonth
                    ? 'text-slate-400'
                    : hasEvents
                    ? 'text-slate-700 bg-blue-50 hover:bg-blue-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {date.getDate()}
                {hasEvents && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#1E6ACB] rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming events list */}
        <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
          {sessions.slice(0, 3).map((session) => (
            <div
              key={session.id}
              onClick={(e) => handleEventClick(e, session)}
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition text-xs"
            >
              <div className="w-2 h-2 bg-[#1E6ACB] rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{session.title}</div>
                <div className="text-slate-500">
                  {new Date(session.scheduled_at).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          {sessions.length > 3 && (
            <div className="text-center text-xs text-slate-500 pt-2">
              +{sessions.length - 3} más...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full calendar view
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-md ${className}`}>
      {/* Calendar header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Hoy
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonth}
                className="p-1 hover:bg-slate-100 rounded-md transition"
              >
                <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1 hover:bg-slate-100 rounded-md transition"
              >
                <ChevronRightIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Sesiones programadas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Día actual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => (
          <div key={day} className="bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month;
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const dateKey = date.toDateString();
          const daySessions = sessionsByDate[dateKey] || [];

          return (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              className={`min-h-32 bg-white p-2 cursor-pointer hover:bg-slate-50 transition ${
                isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
              } ${isToday ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm font-semibold mb-1 ${
                isToday ? 'text-blue-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {date.getDate()}
              </div>

              {/* Events for this day */}
              <div className="space-y-1">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    onClick={(e) => handleEventClick(e, session)}
                    className="text-xs p-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 cursor-pointer transition truncate"
                    title={`${session.title} - ${new Date(session.scheduled_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  >
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="text-blue-600">
                      {new Date(session.scheduled_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}

                {daySessions.length > 3 && (
                  <div className="text-xs text-slate-500 px-2">
                    +{daySessions.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event details sidebar */}
      {selectedDate && (
        <EventDetailsSidebar
          date={selectedDate}
          sessions={sessionsByDate[selectedDate.toDateString()] || []}
          onClose={() => setSelectedDate(null)}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

/**
 * Event Details Sidebar Component
 */
function EventDetailsSidebar({ date, sessions, onClose, onEventClick }) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-xl transform transition-transform z-50">
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">
          {date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-md transition"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-4 max-h-full overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">No hay sesiones programadas para este día</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onEventClick(session)}
              className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 cursor-pointer transition"
            >
              <header className="mb-3">
                <h4 className="text-lg font-semibold text-slate-900 mb-1">{session.title}</h4>
                {session.description && (
                  <p className="text-slate-600 text-sm">{session.description}</p>
                )}
              </header>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    {new Date(session.scheduled_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {session.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{session.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  <span>{session.registered_count || 0} / {session.max_participants} inscritos</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.mode === 'dual'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {session.mode === 'dual' ? 'Modo Dual' : 'Clásico'}
                  </span>
                </div>
              </div>

              {session.scenarios && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-700">
                    <strong>Escenario:</strong> {session.scenarios.title}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export { AdvancedCalendar as Calendar };
