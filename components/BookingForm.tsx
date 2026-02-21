import React, { useEffect, useRef, useState } from 'react';
import { DevotionalProgram, BookingData, FormErrors, TimeSlot } from '../types';

interface BookingFormProps {
  program: DevotionalProgram;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  onSubmit: (data: BookingData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

interface AddressSuggestion {
  display: string;
  placeId: string;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ALLOWED_STATES = new Set(['GA', 'AL', 'TN', 'NC', 'SC', 'FL']);
const GOOGLE_PLACES_SCRIPT_ID = 'google-places-api-script';

let googlePlacesScriptPromise: Promise<void> | null = null;

const loadGooglePlacesScript = (apiKey: string): Promise<void> => {
  const win = window as any;
  if (win.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }

  if (googlePlacesScriptPromise) {
    return googlePlacesScriptPromise;
  }

  googlePlacesScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_PLACES_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Places script')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_PLACES_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Places script'));
    document.head.appendChild(script);
  });

  return googlePlacesScriptPromise;
};

const getAddressComponent = (
  components: any[],
  type: string,
  useShortName = false
): string => {
  const match = components.find(
    (component: any) => Array.isArray(component.types) && component.types.includes(type)
  );
  if (!match) return '';
  return useShortName ? match.short_name || '' : match.long_name || '';
};

const getCityFromComponents = (components: any[]): string => {
  return (
    getAddressComponent(components, 'locality') ||
    getAddressComponent(components, 'postal_town') ||
    getAddressComponent(components, 'administrative_area_level_3') ||
    getAddressComponent(components, 'sublocality')
  );
};

const BookingForm: React.FC<BookingFormProps> = ({
  program,
  selectedDate,
  selectedSlot,
  onSubmit,
  isSubmitting,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: 'GA',
    zipCode: '',
    occasion: '',
    additionalNotes: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isAddressLookupLoading, setIsAddressLookupLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState('');

  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const placesContainerRef = useRef<HTMLDivElement | null>(null);

  const googlePlacesApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
      }
    };
  }, []);

  const clearError = (field: keyof FormErrors) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const ensureGooglePlacesReady = async () => {
    await loadGooglePlacesScript(googlePlacesApiKey);
    const googleObj = (window as any).google;

    if (!googleObj?.maps?.places) {
      throw new Error('Google Places API is not available.');
    }

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new googleObj.maps.places.AutocompleteService();
    }

    if (!placesServiceRef.current) {
      placesContainerRef.current = document.createElement('div');
      placesServiceRef.current = new googleObj.maps.places.PlacesService(placesContainerRef.current);
    }
  };

  const searchAddress = async (query: string) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressLookupError('');
      return;
    }

    setIsAddressLookupLoading(true);
    setAddressLookupError('');

    try {
      await ensureGooglePlacesReady();
      const googleObj = (window as any).google;

      const predictions: any[] = await new Promise(resolve => {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: 'us' },
            types: ['address']
          },
          (results: any, status: any) => {
            if (status !== googleObj.maps.places.PlacesServiceStatus.OK || !results) {
              resolve([]);
              return;
            }
            resolve(results);
          }
        );
      });

      const suggestions = predictions.slice(0, 6).map(prediction => ({
        display: prediction.description,
        placeId: prediction.place_id
      }));

      setAddressSuggestions(suggestions);
      if (!suggestions.length) {
        setAddressLookupError('Please enter a valid address.');
      }
    } catch (error) {
      console.error('Address lookup error:', error);
      setAddressSuggestions([]);
      setAddressLookupError('Please enter a valid address.');
    } finally {
      setIsAddressLookupLoading(false);
    }
  };

  const applyAddressSuggestion = async (suggestion: AddressSuggestion) => {
    setAddressLookupError('');
    setAddressSuggestions([]);
    setAddressQuery(suggestion.display);

    try {
      await ensureGooglePlacesReady();
      const googleObj = (window as any).google;

      const details: any = await new Promise((resolve, reject) => {
        placesServiceRef.current.getDetails(
          {
            placeId: suggestion.placeId,
            fields: ['formatted_address', 'address_components']
          },
          (result: any, status: any) => {
            if (status !== googleObj.maps.places.PlacesServiceStatus.OK || !result) {
              reject(new Error('Unable to load full address details.'));
              return;
            }
            resolve(result);
          }
        );
      });

      const components = details.address_components || [];
      const streetNumber = getAddressComponent(components, 'street_number');
      const route = getAddressComponent(components, 'route');
      const street = [streetNumber, route].filter(Boolean).join(' ').trim();
      const city = getCityFromComponents(components);
      const state = getAddressComponent(components, 'administrative_area_level_1', true).toUpperCase();
      const zipCode = getAddressComponent(components, 'postal_code');

      setFormData(prev => ({
        ...prev,
        street: street || prev.street,
        city: city || prev.city,
        state: ALLOWED_STATES.has(state) ? state : prev.state,
        zipCode: zipCode || prev.zipCode
      }));

      setAddressQuery(details.formatted_address || suggestion.display);
      clearError('street');
      clearError('city');
      clearError('zipCode');
    } catch (error) {
      console.error('Address detail lookup error:', error);
      setAddressLookupError('Please enter a valid address.');
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');

    if (!formData.name.trim()) newErrors.name = 'Full name is required';

    if (!phoneDigits) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phoneDigits)) {
      newErrors.phoneNumber = 'Phone number must be exactly 10 digits';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.street.trim()) newErrors.street = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code is required';
    if (!formData.occasion.trim()) newErrors.occasion = 'Occasion is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const dateIso = selectedDate.toLocaleDateString('en-CA');
      const timeLabel = `${selectedSlot.start} - ${selectedSlot.end}`;
      const fullAddressStr = `${formData.street}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
      const phoneDigits = formData.phoneNumber.replace(/\D/g, '');

      const payload: BookingData = {
        typeOfProgram: program.name,
        date: dateIso,
        time: timeLabel,
        name: formData.name,
        email: formData.email.trim(),
        phoneNumber: phoneDigits,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        fullAddress: fullAddressStr,
        occasion: formData.occasion,
        additionalNotes: formData.additionalNotes
      };

      onSubmit(payload);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'phoneNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAddressLookupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressQuery(value);
    setAddressLookupError('');

    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      setIsAddressLookupLoading(false);
      return;
    }

    addressDebounceRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-10 border border-gray-100">
      <div className="mb-8 bg-[#2E3192]/5 rounded-xl p-4 border border-[#2E3192]/10">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Booking Selection</h4>
            <p className="text-[#2E3192] font-bold text-lg">{program.name}</p>
            <p className="text-sm text-gray-700">
              <i className="far fa-calendar-alt mr-2"></i>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="text-sm font-semibold text-gray-800">
              <i className="far fa-clock mr-2"></i>
              {selectedSlot.start} - {selectedSlot.end} ({selectedSlot.durationLabel})
            </p>
          </div>
          <button onClick={onCancel} className="text-sm text-[#2E3192] font-semibold hover:underline">
            Change
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g. Krishna Das"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              pattern="^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="1234567890"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-xs text-red-500 font-semibold">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Address Lookup
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressQuery}
                onChange={handleAddressLookupChange}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent border-gray-300"
                placeholder="Type at least 3 characters to search address"
                autoComplete="off"
              />
              {isAddressLookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Searching...</div>
              )}
              {addressSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.placeId}-${index}`}
                      type="button"
                      onClick={() => applyAddressSuggestion(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion.display}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {addressLookupError && (
              <p className="mt-1 text-xs text-amber-700 font-semibold">{addressLookupError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Powered by Google Places. Select a suggestion to auto-fill street, city, state, and zip.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Street Address *
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.street ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123 Bhakti Way"
            />
            {errors.street && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.street}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">City *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Atlanta"
            />
            {errors.city && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.city}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">State *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192]"
              >
                <option value="GA">GA</option>
                <option value="AL">AL</option>
                <option value="TN">TN</option>
                <option value="NC">NC</option>
                <option value="SC">SC</option>
                <option value="FL">FL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Zip Code *</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                  errors.zipCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="30301"
              />
              {errors.zipCode && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.zipCode}</p>}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
              Occasion / Reason *
            </label>
            <input
              type="text"
              name="occasion"
              value={formData.occasion}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${
                errors.occasion ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g. Housewarming, Birthday, Wedding Anniversary"
            />
            {errors.occasion && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.occasion}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192]"
              placeholder="Any special requests or information we should know..."
            ></textarea>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-4 bg-[#2E3192] text-white rounded-xl font-bold hover:bg-indigo-900 transition-all shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-lg"
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin mr-3"></i> Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
