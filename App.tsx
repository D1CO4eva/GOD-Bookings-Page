
import React, { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import ProgramCard from './components/ProgramCard';
import CalendarView from './components/CalendarView';
import BookingForm from './components/BookingForm';
import Footer from './components/Footer';
import DonateModal from './components/DonateModal';
import { Page, DevotionalProgram, BookingData, TimeSlot } from './types';
import { PROGRAMS } from './constants';
import { fetchBookedDates, submitToGoogleSheets } from './services/googleSheetsService';
import { generateSlots } from './utils/slotUtils';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [selectedProgram, setSelectedProgram] = useState<DevotionalProgram | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  
  // Track booked dates to prevent double-booking on same day
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [localBookedDates, setLocalBookedDates] = useState<string[]>([]);
  const [isLoadingBookedDates, setIsLoadingBookedDates] = useState(true);

  const blockedDates = useMemo(
    () => Array.from(new Set([...bookedDates, ...localBookedDates])),
    [bookedDates, localBookedDates]
  );

  useEffect(() => {
    let isMounted = true;

    const loadBookedDates = async () => {
      try {
        const dates = await fetchBookedDates();
        if (isMounted) {
          setBookedDates(dates);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBookedDates(false);
        }
      }
    };

    loadBookedDates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProgramSelect = (program: DevotionalProgram) => {
    setSelectedProgram(program);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCurrentPage(Page.BOOKING_CALENDAR);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setCurrentPage(Page.BOOKING_FORM);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetBookedDates = () => {
    if (window.confirm("This will clear all blocked dates in your current browser session. Do you want to continue?")) {
      setLocalBookedDates([]);
      alert("Calendar reset successful.");
    }
  };

  const handleSubmit = async (data: BookingData) => {
    setIsSubmitting(true);
    try {
      const latestBookedDates = await fetchBookedDates();
      setBookedDates(latestBookedDates);

      if (selectedDate) {
        const dateStr = selectedDate.toLocaleDateString('en-CA');
        if (latestBookedDates.includes(dateStr)) {
          alert("Sorry, that date was just booked. Please choose another date.");
          return;
        }
      }

      const success = await submitToGoogleSheets(data);
      if (success) {
        // Add the date to the booked list so it can't be booked again this session
        if (selectedDate) {
          const dateStr = selectedDate.toLocaleDateString('en-CA');
          setLocalBookedDates(prev => (prev.includes(dateStr) ? prev : [...prev, dateStr]));
        }
        setCurrentPage(Page.SUCCESS);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert("Submission failed. Please check your internet connection or verify the Google Script URL.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case Page.HOME:
        return (
          <>
            <section className="relative bg-[#2E3192] text-white py-20 px-4 overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFCC00] rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6d1ed1] rounded-full blur-[100px] opacity-10 -ml-32 -mb-32"></div>
               <div className="container mx-auto text-center relative z-10">
                  <div className="mb-10 max-w-lg mx-auto transform hover:scale-[1.02] transition-transform duration-500">
                    <img 
                      src="https://godivinity.org/wp-content/uploads/2025/02/a0f13a6f-167f-428b-88af-ba164a8bac0e-1024x768.jpeg" 
                      alt="Sri Madhurisakhi Sametha Premikavardan" 
                      className="rounded-2xl shadow-2xl border-4 border-white/20 w-full h-auto object-cover"
                    />
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold mb-6 serif tracking-tight">Atlanta Namadwaar</h1>
                  <p className="text-xl md:text-3xl text-indigo-100 max-w-3xl mx-auto mb-12 italic font-light leading-relaxed">
                    Bring the divine atmosphere of Atlanta Namadwaar into your own home.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto bg-[#FFCC00] text-[#2E3192] px-12 py-5 rounded-full font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all shadow-md active:scale-95"
                    >
                      Browse Programs
                    </button>
                    <button 
                      onClick={() => setIsDonateOpen(true)}
                      className="w-full sm:w-auto bg-[#6d1ed1] text-white border-2 border-white/20 px-12 py-5 rounded-full font-bold text-xl hover:bg-[#5a18b1] hover:shadow-2xl hover:scale-105 transition-all shadow-md active:scale-95 flex items-center justify-center space-x-3"
                    >
                      <i className="fas fa-heart"></i>
                      <span>Donate Here</span>
                    </button>
                  </div>
               </div>
            </section>

            <section id="programs" className="py-24 bg-gray-50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold text-[#2E3192] serif">Available Home Programs</h2>
                  <div className="w-24 h-1.5 bg-[#FFCC00] mx-auto mt-6 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {PROGRAMS.map(program => (
                    <ProgramCard 
                      key={program.id} 
                      program={program} 
                      onBook={handleProgramSelect} 
                    />
                  ))}
                </div>
              </div>
            </section>
          </>
        );

      case Page.BOOKING_CALENDAR:
        const availableSlots = selectedDate ? generateSlots(selectedProgram!.id, selectedDate) : [];
        const periods: Array<'Morning' | 'Evening'> = ['Morning', 'Evening'];
        const durationOrder = ['30 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours'];

        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-bold text-[#2E3192] serif mb-2">Schedule Your Session</h2>
                <p className="text-gray-500 text-lg">Booking: <span className="font-bold text-[#2E3192]">{selectedProgram?.name}</span> for 2026</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h4 className="font-bold text-[#2E3192] mb-6 flex items-center text-lg">
                      <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">1</span>
                      Select a Date
                    </h4>
                    <CalendarView 
                      programId={selectedProgram!.id} 
                      onSelectDate={handleDateSelect}
                      selectedDate={selectedDate}
                      bookedDates={blockedDates}
                    />
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h4 className="font-bold text-[#2E3192] mb-6 flex items-center text-lg">
                      <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">2</span>
                      Available Time Slots
                    </h4>
                    
                    {!selectedDate ? (
                      <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                        <i className="far fa-calendar-check text-5xl mb-4 opacity-20"></i>
                        <p className="text-lg">Please select a date on the calendar</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="bg-red-50 rounded-2xl border-2 border-dashed border-red-100 p-16 text-center text-red-400">
                        <i className="fas fa-exclamation-circle text-5xl mb-4"></i>
                        <p className="text-lg">No slots available for this program on this date.</p>
                      </div>
                    ) : (
                      <div className="space-y-10 pr-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {periods.map((period) => {
                          const periodSlots = availableSlots.filter(s => s.period === period);
                          if (periodSlots.length === 0) return null;

                          return (
                            <div key={period} className="animate-fade-in">
                              <h5 className="text-lg font-black uppercase tracking-widest text-[#2E3192] border-b-2 border-[#FFCC00] inline-block mb-6 pr-4">
                                {period} Slots
                              </h5>
                              <div className="space-y-8">
                                {durationOrder.map(duration => {
                                  const group = periodSlots.filter(s => s.durationLabel === duration);
                                  if (group.length === 0) return null;
                                  return (
                                    <div key={duration} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                      <p className="text-xs font-bold text-[#2E3192]/60 uppercase tracking-tighter mb-3 flex items-center">
                                        <i className="fas fa-hourglass-half mr-2"></i>
                                        {duration} Sessions
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {group.map((slot, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => handleSlotSelect(slot)}
                                            className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-[#FFCC00] hover:ring-2 hover:ring-[#FFCC00]/20 transition-all flex justify-between items-center group shadow-sm active:scale-95"
                                          >
                                            <span className="font-bold text-gray-800 text-lg">{slot.start} - {slot.end}</span>
                                            <i className="fas fa-arrow-right text-gray-200 group-hover:text-[#2E3192] group-hover:translate-x-1 transition-all"></i>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setCurrentPage(Page.HOME)}
                  className="px-10 py-3 rounded-xl border-2 border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192] hover:text-white transition-all shadow-sm"
                >
                  Back to Homepage
                </button>
              </div>
            </div>
          </section>
        );

      case Page.BOOKING_FORM:
        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#2E3192] serif">Finalize Your Request</h2>
                <p className="text-gray-500">Provide your contact details to host the program.</p>
              </div>
              <BookingForm 
                program={selectedProgram!} 
                selectedDate={selectedDate!}
                selectedSlot={selectedSlot!}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => setCurrentPage(Page.BOOKING_CALENDAR)}
              />
            </div>
          </section>
        );

      case Page.SUCCESS:
        return (
          <section className="py-32 px-4 text-center animate-fade-in">
            <div className="max-w-xl mx-auto">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                 <i className="fas fa-check text-4xl"></i>
              </div>
              <h2 className="text-4xl font-bold text-[#2E3192] mb-4 serif">Booking Confirmed!</h2>
              <div className="space-y-6 text-xl text-gray-600 mb-10 leading-relaxed">
                <p>
                  Thank you! We've received your request for <strong>{selectedProgram?.name}</strong> on {selectedDate?.toLocaleDateString()}. Our Satsang Members will reach out to you shortly to finalize the details.
                </p>
                <p>
                  If you have any questions or would like to request any changes, please contact us via email or phone:
                </p>
                <p className="font-bold text-[#2E3192]">
                  Email: atlantanamadwaar@gmail.com<br />
                  Phone: 6784278530
                </p>
                <p className="italic">
                  We look forward to bringing Sri Madhurisakhi Sametha Premikavardan's blessings to your Home!
                </p>
                <p className="font-bold text-[#2E3192] serif text-2xl">
                  Radhe Radhe!
                </p>
              </div>
              <button 
                onClick={() => setCurrentPage(Page.HOME)}
                className="bg-[#2E3192] text-white px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all shadow-lg active:scale-95"
              >
                Back to Homepage
              </button>
            </div>
          </section>
        );

      case Page.INSTRUCTIONS:
        return (
          <section className="py-20 px-4 bg-white min-h-screen">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold text-[#2E3192] mb-8 serif">Backend Setup & Deployment</h2>
              <div className="prose prose-indigo max-w-none text-gray-700">
                <p className="text-lg mb-6 font-semibold">Your Google Sheet must have these columns in order (A-I):</p>
                <div className="bg-[#2E3192]/5 p-6 rounded-xl font-mono text-sm mb-8 grid grid-cols-1 gap-2 border border-[#2E3192]/10">
                  <div className="flex justify-between"><span className="font-bold">Column A:</span> <code>typeOfProgram</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column B:</span> <code>date</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column C:</span> <code>name</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column D:</span> <code>email</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column E:</span> <code>phoneNumber</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column F:</span> <code>fullAddress</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column G:</span> <code>occasion</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column H:</span> <code>additionalNotes</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column I:</span> <code>timestamp</code></div>
                </div>
                
                <h3 className="text-xl font-bold mb-4">Resetting Bookings</h3>
                <div className="bg-gray-50 p-6 rounded-xl border mb-10">
                   <p className="mb-4 text-sm text-gray-600">
                     <strong>Option 1: Permanent Reset (Global)</strong><br />
                     Delete the rows directly in your Google Sheet. New visitors will then see those dates as available once the page is refreshed.
                   </p>
                   <p className="mb-4 text-sm text-gray-600">
                     <strong>Option 2: Session Reset (Local)</strong><br />
                     Click the button below to clear the dates you have blocked in this current browser session.
                   </p>
                   <button 
                     onClick={handleResetBookedDates}
                     className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors text-sm"
                   >
                     Reset Local Calendar State
                   </button>
                </div>

                <h3 className="text-xl font-bold mb-4">Apps Script Setup</h3>
                <ol className="list-decimal pl-6 space-y-4">
                  <li>In Google Sheets, go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste your <code>doPost</code> function.</li>
                  <li>Click <strong>Deploy &gt; New Deployment</strong>, select <strong>Web App</strong>.</li>
                  <li>Set Access to <strong>Anyone</strong>.</li>
                  <li>Copy the Web App URL and paste it into <code>constants.tsx</code>.</li>
                </ol>
              </div>
              <div className="mt-12 pt-8 border-t">
                <button onClick={() => setCurrentPage(Page.HOME)} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-bold">Back to App</button>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  if (isLoadingBookedDates) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        <div className="text-center space-y-3">
          <div className="text-sm uppercase tracking-widest text-gray-400 font-bold">Loading</div>
          <div className="text-2xl font-bold text-[#2E3192] serif">Checking booked dates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#FFCC00] selection:text-[#2E3192]">
      <Header 
        onNavigate={setCurrentPage} 
        currentPage={currentPage} 
        onOpenDonate={() => setIsDonateOpen(true)}
      />
      <main className="flex-grow">{renderContent()}</main>
      <DonateModal 
        isOpen={isDonateOpen} 
        onClose={() => setIsDonateOpen(false)} 
      />
      <Footer />
    </div>
  );
};

export default App;
