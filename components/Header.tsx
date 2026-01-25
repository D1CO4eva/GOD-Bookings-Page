import React from 'react';
import { Page } from '../types';
import { COLORS } from '../constants';

interface HeaderProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
  onOpenDonate: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, onOpenDonate }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
        <div 
          className="flex items-center space-x-3 cursor-pointer" 
          onClick={() => onNavigate(Page.HOME)}
        >
          <div className="w-14 h-14 flex items-center justify-center">
            <img
              src="https://godivinity.org/wp-content/uploads/2018/05/GOD-LOGO-1024x617.jpg"
              alt="Global Organization of Divinity Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-[#2E3192] leading-tight serif">Atlanta Namadwaar</h1>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Devotional Home Programs</span>
          </div>
        </div>
        
        <nav className="flex items-center space-x-1 sm:space-x-4 text-sm md:text-base">
          <button 
            onClick={() => onNavigate(Page.HOME)}
            className={`px-3 py-1 rounded-full transition ${currentPage === Page.HOME ? 'bg-[#2E3192] text-white' : 'text-[#2E3192] hover:bg-gray-100'}`}
          >
            Home
          </button>
          <button 
             onClick={() => {
                const element = document.getElementById('programs');
                if (element) {
                   element.scrollIntoView({ behavior: 'smooth' });
                } else {
                   onNavigate(Page.HOME);
                }
             }}
             className="px-3 py-1 rounded-full text-[#2E3192] hover:bg-gray-100 transition hidden sm:block"
          >
            Programs
          </button>
          <button 
            onClick={onOpenDonate}
            className="ml-2 px-4 py-2 bg-[#6d1ed1] text-white rounded-full font-bold shadow-md hover:bg-[#5a18b1] transition-all flex items-center space-x-2"
          >
            <i className="fas fa-heart text-xs"></i>
            <span>Donate</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;