import React, { useState } from 'react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);

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

        <h2 className="text-3xl font-bold mb-3 serif">Global Organization of Divinity</h2>
        <div className="text-indigo-200 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
          <p>Hare Rama Hare Rama Rama Rama Hare Hare</p>
          <p>Hare Krishna Hare Krishna Krishna Krishna Hare Hare</p>
        </div>

        <div className="flex justify-center space-x-8 mb-10">
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

        <div className="mb-10 flex justify-center">
          <button
            type="button"
            onClick={() => setIsWhatsappModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-[#0f3b1f] font-bold shadow-md hover:brightness-95 transition-all"
            title="Join WhatsApp Community"
          >
            <i className="fab fa-whatsapp text-lg"></i>
            <span>Join WhatsApp Community</span>
          </button>
        </div>

        <div className="mb-10 text-left">
          <p className="text-xs uppercase tracking-widest text-indigo-200 mb-2 font-semibold">Contact Us</p>
          <p className="font-semibold text-indigo-100">239 Atlanta Rd, Cumming, GA</p>
          <p>
            <a href="mailto:atlantanamadwaar@gmail.com" className="text-indigo-100 hover:text-[#FFCC00] transition-colors font-semibold">
              atlantanamadwaar@gmail.com
            </a>
          </p>
          <p>
            <a href="tel:+14047887391" className="text-indigo-100 hover:text-[#FFCC00] transition-colors font-semibold">
              404-788-7391
            </a>
          </p>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-indigo-300">
          <p>Global Organization of Divinity</p>
          <p>(c) {year} Atlanta Namadwaar. All rights reserved.</p>
        </div>

        {isWhatsappModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setIsWhatsappModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsapp-modal-title"
            >
              <h3 id="whatsapp-modal-title" className="text-2xl font-bold text-[#2E3192] serif mb-3">
                WhatsApp Community
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Contact our Admin for more details! Radhe Radhe!
              </p>
              <div className="mb-6 space-y-1 text-sm">
                <p>
                  <a
                    href="mailto:atlantanamadwaar@gmail.com"
                    className="font-semibold text-[#2E3192] hover:underline"
                  >
                    atlantanamadwaar@gmail.com
                  </a>
                </p>
                <p>
                  <a
                    href="tel:+14047887391"
                    className="font-semibold text-[#2E3192] hover:underline"
                  >
                    404-788-7391
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsappModalOpen(false)}
                className="px-6 py-3 rounded-lg bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
