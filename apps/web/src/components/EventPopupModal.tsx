import React, { useEffect, useState } from 'react';
import { resolvePublicAssetUrl } from '../utils/assetUtils';

interface EventPopupModalProps {
  isOpen: boolean;
  openInFullView?: boolean;
  onClose: () => void;
}

const REGISTRATION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSecoUraNUKuSLpstLavzvx7NFJjLzaP0tGrBQZzcSoqXSirQQ/viewform';
const FLYER_IMAGE_PATH = '/event-flyers/sri-dhruva-charithram-katha-kacheri-fundraiser.jpg';

const FLYER_IMAGE_URL = resolvePublicAssetUrl(FLYER_IMAGE_PATH);

const EventPopupModal: React.FC<EventPopupModalProps> = ({ isOpen, openInFullView = false, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      setIsVisible(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShowFullDetails(openInFullView);
      return;
    }
    setShowFullDetails(false);
  }, [isOpen, openInFullView]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-4 transition-opacity duration-500 ${
        isVisible ? 'bg-black/60 opacity-100' : 'bg-black/0 opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Fundraiser event registration popup"
    >
      <div
        className={`relative w-full ${showFullDetails ? 'max-w-4xl max-h-[90vh]' : 'max-w-md'} overflow-hidden bg-white shadow-2xl border border-gray-200 rounded-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 md:translate-y-2 scale-[0.99] opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event popup"
          className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 shadow-sm"
        >
          <i className="fas fa-times"></i>
        </button>

        {showFullDetails ? (
          <div className="max-h-[90vh] overflow-y-auto px-4 pt-14 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-8 md:pt-6 md:pb-8">
            <h2 className="text-xl md:text-4xl font-bold text-[#1f2a69] leading-tight mb-4 pr-12 md:pr-0">
              Sri Dhruva Charithram - Katha Kacheri (Fundraiser Event)
            </h2>

            <p className="text-sm md:text-base text-gray-700 mb-4 leading-relaxed">
              Join us and immerse in the divine glories of <span className="font-bold">Sri Dhruva Charithram</span> - a one-of-a-kind Katha
              Kacheri experience offered in service to Atlanta Namadwaar.
            </p>

            <div className="rounded-xl border border-[#2E3192]/20 bg-[#2E3192]/5 px-4 py-3 text-gray-800 mb-5 text-sm md:text-base leading-relaxed">
              <p><span className="font-bold">Date:</span> March 21st, 2026</p>
              <p><span className="font-bold">Time:</span> 10:30 AM - 12:30 PM</p>
              <p><span className="font-bold">Venue:</span> 239 Atlanta Rd, Cumming, GA</p>
              <p><span className="font-bold">Minimum Ticket:</span> $25 per person (Additional contributions are welcome and appreciated)</p>
            </div>

            <p className="text-sm md:text-base text-gray-700 mb-2">
              This is a <span className="font-bold">Fundraiser Event</span> in service of Atlanta Namadwaar.
            </p>
            <p className="text-sm md:text-base text-gray-700 mb-1">
              Please complete the registration form to confirm your participation.
            </p>
            <p className="text-sm md:text-base font-semibold text-red-600 mb-1">
              Seats are filling fast! - register NOW to secure your spot!!
            </p>
            <p className="text-sm md:text-base text-gray-700 mb-5">We look forward to your presence and support.</p>

            <a
              href={REGISTRATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl overflow-hidden border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300"
              title="Open event registration form"
              aria-label="Open event registration form"
            >
              <img
                src={FLYER_IMAGE_URL}
                alt="Sri Dhruva Charithram Katha Kacheri fundraiser flyer. Click to register."
                className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
              />
            </a>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <a
                href={REGISTRATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-[#2E3192] px-5 py-3 text-white font-bold hover:bg-indigo-900 transition-colors"
              >
                Register Now
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-xl border border-[#2E3192] px-5 py-3 text-[#2E3192] font-bold hover:bg-[#2E3192] hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-16 pb-8 text-center">
            <h3 className="text-xl md:text-2xl font-bold text-[#1f2a69] mb-3">
              Check out our newest Fundraiser Event for Namadwaar
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              A special devotional event is now open for registration.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowFullDetails(true)}
                className="inline-flex items-center justify-center rounded-xl bg-[#2E3192] px-6 py-3 text-white font-bold hover:bg-indigo-900 transition-colors"
              >
                view here
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-[#2E3192] px-6 py-3 text-[#2E3192] font-bold hover:bg-[#2E3192] hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventPopupModal;
