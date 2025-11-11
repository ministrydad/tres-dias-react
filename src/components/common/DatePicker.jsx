// src/components/common/DatePicker.jsx
import { useState, useEffect, useRef } from 'react';

export default function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState(new Date());
  const pickerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Parse value prop to Date object
  const selectedDate = value ? new Date(value) : null;

  // Format date for display
  function formatDate(date) {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // Format date for onChange (YYYY-MM-DD)
  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Handle date selection
  function handleDateClick(date) {
    onChange(formatDateForInput(date));
    setIsOpen(false);
  }

  // Navigate months
  function previousMonth() {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
  }

  // Get calendar days for display
  function getCalendarDays() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      });
    }
    
    // Next month's leading days (to fill out the grid)
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      });
    }
    
    return days;
  }

  // Check if two dates are the same day
  function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  // Check if date is today
  function isToday(date) {
    return isSameDay(date, new Date());
  }

  // Clear selection
  function handleClear() {
    onChange('');
    setIsOpen(false);
  }

  // Select today
  function handleToday() {
    const today = new Date();
    onChange(formatDateForInput(today));
    setDisplayDate(today);
    setIsOpen(false);
  }

  const calendarDays = getCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="custom-date-picker" ref={pickerRef}>
      <input
        type="text"
        className="custom-date-input"
        value={selectedDate ? formatDate(selectedDate) : ''}
        placeholder={placeholder}
        readOnly
        onClick={() => setIsOpen(!isOpen)}
      />
      <button
        type="button"
        className="date-picker-icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        📅
      </button>

      {isOpen && (
        <div className="date-picker-dropdown">
          {/* Header with month/year and navigation */}
          <div className="date-picker-header">
            <div className="date-picker-month-year">
              {monthNames[displayDate.getMonth()]} {displayDate.getFullYear()}
            </div>
            <div className="date-picker-nav">
              <button
                type="button"
                className="date-picker-nav-btn"
                onClick={previousMonth}
              >
                ‹
              </button>
              <button
                type="button"
                className="date-picker-nav-btn"
                onClick={nextMonth}
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="date-picker-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="date-picker-weekday">{day}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="date-picker-days">
            {calendarDays.map((dayObj, index) => {
              const isSelected = isSameDay(dayObj.date, selectedDate);
              const isTodayDate = isToday(dayObj.date);
              
              return (
                <button
                  key={index}
                  type="button"
                  className={`date-picker-day 
                    ${!dayObj.isCurrentMonth ? 'other-month' : ''} 
                    ${isSelected ? 'selected' : ''} 
                    ${isTodayDate ? 'today' : ''}
                  `}
                  onClick={() => handleDateClick(dayObj.date)}
                >
                  {dayObj.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="date-picker-actions">
            <button
              type="button"
              className="date-picker-clear-btn"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="date-picker-today-btn"
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}