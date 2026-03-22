
import React, { useEffect, useState } from 'react';
import { isDateSelectable } from '../utils/slotUtils';

interface CalendarViewProps {
  programId: string;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  bookedDates: string[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ programId, onSelectDate, selectedDate, bookedDates }) => {
  const calendarStart = new Date(2026, 0, 1);
  const calendarEnd = new Date(2027, 11, 1);
  const clampToRange = (value: Date) => {
    const monthValue = new Date(value.getFullYear(), value.getMonth(), 1);
    if (monthValue < calendarStart) return calendarStart;
    if (monthValue > calendarEnd) return calendarEnd;
    return monthValue;
  };

  const [currentMonthDate, setCurrentMonthDate] = useState(() =>
    clampToRange(selectedDate ? selectedDate : new Date())
  );
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentMonth = currentMonthDate.getMonth();
  const currentYear = currentMonthDate.getFullYear();
  const daysInMonth = () => new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = () => new Date(currentYear, currentMonth, 1).getDay();

  const handlePrev = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return clampToRange(next);
    });
  };
  const handleNext = () => {
    setCurrentMonthDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return clampToRange(next);
    });
  };

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonthDate(clampToRange(selectedDate));
    }
  }, [selectedDate]);

  const isAtStartMonth =
    currentYear === calendarStart.getFullYear() && currentMonth === calendarStart.getMonth();
  const isAtEndMonth =
    currentYear === calendarEnd.getFullYear() && currentMonth === calendarEnd.getMonth();

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth();
    const firstDay = firstDayOfMonth();

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const selectable = isDateSelectable(programId, date, bookedDates);
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <button
          key={d}
          disabled={!selectable}
          onClick={() => onSelectDate(date)}
          className={`
            p-4 rounded-xl text-center font-semibold transition-all
            ${selectable ? 'hover:bg-[#FFCC00] hover:text-[#2E3192] cursor-pointer' : 'opacity-20 cursor-not-allowed bg-gray-50 text-gray-400'}
            ${isSelected ? 'bg-[#2E3192] text-white shadow-lg scale-110 z-10' : 'text-gray-700'}
          `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-md mx-auto">
      <div className="bg-[#2E3192] p-6 text-white flex justify-between items-center">
        <button onClick={handlePrev} disabled={isAtStartMonth} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="text-center">
          <h3 className="text-xl font-bold serif">{months[currentMonth]}</h3>
          <p className="text-sm opacity-80">{currentYear}</p>
        </div>
        <button onClick={handleNext} disabled={isAtEndMonth} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderDays()}
        </div>
      </div>

      <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-center space-x-4 text-[10px] md:text-xs">
         <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-[#2E3192] mr-1"></span> Available</div>
         <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-200 mr-1"></span> Booked</div>
      </div>
    </div>
  );
};

export default CalendarView;
