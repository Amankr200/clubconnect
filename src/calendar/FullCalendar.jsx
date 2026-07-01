import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAllBookings } from '../data/bookings.js';
import { venues } from '../data/venues.js';

const CALENDAR_EVENTS_STATIC = [
  {
    title: 'Club Orientation',
    start: '2026-06-03T10:00:00',
    end: '2026-06-03T12:00:00',
    description: 'Meet the society leads and explore campus clubs.',
    location: 'Main Auditorium',
    color: '#2563eb'
  },
  {
    title: 'Hackathon Sprint',
    start: '2026-06-07',
    allDay: true,
    description: 'A full-day innovation challenge open to all students.',
    location: 'Innovation Lab',
    color: '#7c3aed'
  },
  {
    title: 'Cultural Fest Rehearsal',
    start: '2026-06-14T18:00:00',
    end: '2026-06-14T21:00:00',
    description: 'Final rehearsal for the evening showcase.',
    location: 'Open Air Theatre',
    color: '#0f766e'
  },
  {
    title: 'Dean Approval Review',
    start: '2026-06-21T15:00:00',
    description: 'Review upcoming student society proposals.',
    location: 'Conference Room',
    color: '#dc2626'
  },
  {
    title: 'Campus Career Fair',
    start: '2026-06-28T09:30:00',
    end: '2026-06-28T16:00:00',
    description: 'Industry partners and placement opportunities.',
    location: 'Sports Complex',
    color: '#ea580c'
  },
  {
    title: 'Summer Meetup',
    start: '2026-07-05',
    allDay: true,
    description: 'Informal get-together for all club members.',
    location: 'Cafeteria Terrace',
    color: '#16a34a'
  }
];

function formatDateLabel(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function convertBookingsToEvents(bookings) {
  return bookings.map((booking, idx) => {
    if (booking.status === 'cancelled') return null;

    const venue = venues.find(v => v.id === booking.venueId);
    const venueName = venue?.name || 'Unknown Venue';
    
    // Get first and last time slot
    const firstSlot = booking.timeSlots[0];
    const lastSlot = booking.timeSlots[booking.timeSlots.length - 1];
    
    // Convert time to datetime
    const [startH, startM] = firstSlot.startTime.split(':');
    const [endH, endM] = lastSlot.endTime.split(':');
    
    const startDateTime = `${booking.date}T${startH}:${startM}:00`;
    const endDateTime = `${booking.date}T${endH}:${endM}:00`;

    return {
      id: `booking-${booking.id}`,
      title: `${booking.eventName} (${booking.hostClub})`,
      start: startDateTime,
      end: endDateTime,
      description: `Venue: ${venueName}\nHost: ${booking.hostClub}`,
      location: venueName,
      color: '#f59e0b', // Amber color for bookings
      extendedProps: {
        bookingId: booking.id,
        venue: venueName,
        hostClub: booking.hostClub,
        isBooked: true
      }
    };
  }).filter(Boolean);
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewDate, setViewDate] = useState(new Date());

  // Combine static events with booked venue events
  const events = useMemo(() => {
    const allBookings = getAllBookings();
    const bookedEvents = convertBookingsToEvents(allBookings);
    return [...CALENDAR_EVENTS_STATIC, ...bookedEvents];
  }, []);

  const selectedEvents = useMemo(() => {
    return events.filter(event => {
      const eventStart = event.start?.slice(0, 10) || '';
      return eventStart === selectedDate;
    });
  }, [events, selectedDate]);

  return (
    <div className="calendar-page-shell">
      <div className="section-container">
        <div className="calendar-intro">
          <div>
            <h2>Campus calendar</h2>
            <span>Double-click any day to view every event scheduled for that date.</span>
          </div>
        </div>

        <div className="calendar-shell">
          <div className="calendar-card">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={viewDate}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              buttonText={{ today: 'Today', month: 'Month' }}
              height="auto"
              dayMaxEvents={3}
              events={events}
              eventDisplay="block"
              eventClick={(info) => setSelectedDate(info.event.startStr.slice(0, 10))}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              datesSet={(arg) => setViewDate(arg.view.currentStart)}
              dayCellDidMount={(arg) => {
                arg.el.addEventListener('dblclick', () => setSelectedDate(arg.date.toISOString().slice(0, 10)));
              }}
            />
          </div>

          <aside className="day-details-card">
            <h3>Events for {formatDateLabel(selectedDate)}</h3>
            <p>Choose a day from the calendar to inspect the events planned for that date.</p>
            {selectedEvents.length > 0 ? (
              <div className="event-list">
                {selectedEvents.map((event, index) => (
                  <div key={`${event.id || event.title}-${index}`} className="event-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong>{event.title}</strong>
                      {event.extendedProps?.isBooked && (
                        <span style={{
                          background: '#f59e0b',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          BOOKED
                        </span>
                      )}
                    </div>
                    <small>{event.description}</small>
                    <small>Location: {event.location}</small>
                    {event.start && event.end && !event.allDay && (
                      <small>
                        Time: {new Date(`${event.start}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(`${event.end}Z`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </small>
                    )}
                    {event.allDay && <small>All day</small>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-day">No events scheduled for this day.</div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}