
import React, { useState } from 'react';
import { isDateSelectable } from '../utils/slotUtils';

interface CalendarViewProps {
  programId: string;
  onSelectDate: (date: Date) => void;
  selectedDate: Date | null;
  bookedDates: string[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ programId, onSelectDate, selectedDate, bookedDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // Start at today's month
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (month: number) => new Date(2026, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number) => new Date(2026, month, 1).getDay();

  const handlePrev = () => setCurrentMonth(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentMonth(prev => Math.min(11, prev + 1));

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(2026, currentMonth, d);
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
        <button onClick={handlePrev} disabled={currentMonth === 0} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="text-center">
          <h3 className="text-xl font-bold serif">{months[currentMonth]}</h3>
          <p className="text-sm opacity-80">2026</p>
        </div>
        <button onClick={handleNext} disabled={currentMonth === 11} className="p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
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
         <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-[#2E3192] mr-1"></span> Selected</div>
         <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-200 mr-1"></span> Available</div>
         <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-50 border border-gray-100 opacity-50 mr-1"></span> Passed/Booked</div>
      </div>
    </div>
  );
};

export default CalendarView;
