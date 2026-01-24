
import React, { useState } from 'react';
import { ZELLE_EMAIL, COLORS } from '../constants';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ZELLE_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenZelle = () => {
    // Attempting a common deep link pattern, falling back to website
    window.open('https://www.zellepay.com/get-started', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="bg-[#6d1ed1] p-8 text-white text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
            <i className="fas fa-hand-holding-heart text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold serif">Support Our Mission</h2>
          <p className="text-purple-100 text-sm mt-2">Your contribution helps us share divine bliss with everyone.</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Donate via Zelle</p>
            <div className="bg-gray-50 rounded-2xl p-4 border-2 border-dashed border-gray-200 group relative">
              <p className="text-[#6d1ed1] font-bold text-xl mb-1">{ZELLE_EMAIL}</p>
              <p className="text-gray-400 text-[10px]">Tap email to copy</p>
              <button 
                onClick={handleCopy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Copy Email"
              ></button>
              
              {copied && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-2xl animate-fade-in">
                  <span className="text-green-600 font-bold flex items-center">
                    <i className="fas fa-check-circle mr-2"></i> Email Copied!
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleOpenZelle}
              className="w-full bg-[#6d1ed1] text-white py-4 rounded-xl font-bold shadow-lg hover:bg-[#5a18b1] transition-all flex items-center justify-center space-x-3 active:scale-95"
            >
              <i className="fas fa-external-link-alt text-sm"></i>
              <span>Open Zelle App / Site</span>
            </button>
            <p className="text-[10px] text-center text-gray-400 px-4">
              Note: Most users can find Zelle directly within their banking app (Chase, Bank of America, Wells Fargo, etc.)
            </p>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-semibold hover:text-gray-800 transition-colors text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
