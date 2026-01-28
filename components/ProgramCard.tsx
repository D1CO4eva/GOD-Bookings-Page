import React from 'react';
import { DevotionalProgram } from '../types';

interface ProgramCardProps {
  program: DevotionalProgram;
  onBook: (program: DevotionalProgram) => void;
  onDonate?: (program: DevotionalProgram) => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, onBook, onDonate }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full transform hover:-translate-y-1">
      {program.imageUrl && (
        <div className="h-48 w-full overflow-hidden">
          <img 
            src={program.imageUrl} 
            alt={program.name} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      )}
      <div className="h-2 bg-[#FFCC00]"></div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-[#2E3192] bg-opacity-10 rounded-lg flex items-center justify-center text-[#2E3192]">
            <i className={`fas ${program.icon} text-lg`}></i>
          </div>
          <span className="ml-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Duration: {program.duration}</span>
        </div>
        
        <h3 className="text-2xl font-bold text-[#2E3192] mb-3 serif">{program.name}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed italic">"{program.description}"</p>
        
        {program.donationAmount && (
          <div className="mb-5">
            {onDonate ? (
              <button
                type="button"
                onClick={() => onDonate(program)}
                className="w-full flex items-center bg-[#2E3192]/5 px-4 py-3 rounded-xl border border-[#2E3192]/10 hover:bg-[#2E3192] hover:text-white transition-all shadow-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 shrink-0 group-hover:bg-white group-hover:text-[#2E3192] transition-colors">
                  <i className="fas fa-hand-holding-heart text-xs"></i>
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-gray-400 leading-none mb-1 group-hover:text-white/80">Donation Amount</p>
                  <p className="text-xl font-bold text-[#2E3192] group-hover:text-white">{program.donationAmount}</p>
                </div>
              </button>
            ) : (
              <div className="flex items-center bg-[#2E3192]/5 px-4 py-3 rounded-xl border border-[#2E3192]/10">
                <div className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 shrink-0">
                  <i className="fas fa-hand-holding-heart text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 leading-none mb-1">Donation Amount</p>
                  <p className="text-xl font-bold text-[#2E3192]">{program.donationAmount}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {program.videoUrl && (
          <div className="mb-6">
            <a 
              href={program.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-3 bg-red-50 text-red-700 py-3 px-4 rounded-xl border border-red-100 hover:bg-red-100 transition-all font-bold text-sm shadow-sm group"
            >
              <i className="fab fa-youtube text-xl text-red-600 group-hover:scale-110 transition-transform"></i>
              <span>Watch Program Preview</span>
            </a>
          </div>
        )}
        
        <div className="flex-grow"></div>
        
        <button 
          onClick={() => onBook(program)}
          className="w-full bg-[#2E3192] text-white py-3 rounded-lg font-semibold hover:bg-indigo-900 transition-all shadow-md active:scale-95 duration-150 mt-2 group"
        >
          Book this program
          <i className="fas fa-chevron-right ml-2 text-xs opacity-0 group-hover:opacity-100 transition-all"></i>
        </button>
      </div>
    </div>
  );
};

export default ProgramCard;
