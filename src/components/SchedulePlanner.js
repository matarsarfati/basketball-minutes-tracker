import { useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService';
// ...existing code...

const SchedulePlanner = () => {
  const [events, setEvents] = useState([]);
  // ...existing code...

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const fetchedEvents = await scheduleService.getScheduleEvents();
        setEvents(fetchedEvents);
      } catch (error) {
        console.error('Failed to load schedule events:', error);
      }
    };

    loadEvents();
  }, []);

  const handleAddEvent = async (eventData) => {
    try {
      const newEventId = await scheduleService.addScheduleEvent(eventData);
      setEvents([...events, { id: newEventId, ...eventData }]);
    } catch (error) {
      console.error('Failed to add schedule event:', error);
    }
  };

  const handleUpdateEvent = async (eventId, updatedData) => {
    try {
      await scheduleService.updateScheduleEvent(eventId, updatedData);
      setEvents(events.map(event => (event.id === eventId ? { ...event, ...updatedData } : event)));
    } catch (error) {
      console.error('Failed to update schedule event:', error);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await scheduleService.deleteScheduleEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Failed to delete schedule event:', error);
    }
  };

  // ...existing code...
};

export default SchedulePlanner;
