
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#2E3192] text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <div className="flex justify-center mb-8">
          <div className="h-24 flex items-center">
            <img
              src="https://godivinity.org/wp-content/uploads/2018/05/GOD-LOGO-1024x617.jpg"
              alt="Global Organization of Divinity Logo"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-3 serif">Global Organization for Divinity</h2>
        <p className="text-indigo-200 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
          <p>Hare Rama Hare Rama Rama Rama Hare Hare</p>
          <p>Hare Krishna Hare Krishna Krishna Krishna Hare Hare</p>
        </p>
        
        <div className="flex justify-center space-x-8 mb-12">
          <a 
            href="https://www.facebook.com/godsatsang/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FFCC00] hover:text-[#2E3192] transition-all duration-300"
            title="Facebook"
          >
            <i className="fab fa-facebook-f text-xl"></i>
          </a>
          <a 
            href="https://www.instagram.com/god_namadwaar_atlanta/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FFCC00] hover:text-[#2E3192] transition-all duration-300"
            title="Instagram"
          >
            <i className="fab fa-instagram text-xl"></i>
          </a>
          <a 
            href="https://www.youtube.com/@AtlantaNamadwaar/videos" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FFCC00] hover:text-[#2E3192] transition-all duration-300"
            title="YouTube"
          >
            <i className="fab fa-youtube text-xl"></i>
          </a>
        </div>

        <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-indigo-300">
          <div className="flex items-center space-x-2">
            <i className="fas fa-map-marker-alt"></i>
            <p>Atlanta Namadwaar • Serving the Devotee Community</p>
          </div>
          <p>© {new Date().getFullYear()} Atlanta Namadwaar. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
