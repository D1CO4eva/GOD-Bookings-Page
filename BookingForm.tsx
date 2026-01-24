
import React, { useState } from 'react';
import { DevotionalProgram, BookingData, FormErrors, TimeSlot } from '../types';

interface BookingFormProps {
  program: DevotionalProgram;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  onSubmit: (data: BookingData) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ program, selectedDate, selectedSlot, onSubmit, isSubmitting, onCancel }) => {
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

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
      const fullDateStr = `${selectedDate.toLocaleDateString()} | ${selectedSlot.start} - ${selectedSlot.end} (${selectedSlot.durationLabel})`;
      const fullAddressStr = `${formData.street}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
      
      const payload: BookingData = {
        typeOfProgram: program.name,
        date: fullDateStr,
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-sm font-semibold text-gray-800">
                <i className="far fa-clock mr-2"></i>
                {selectedSlot.start} - {selectedSlot.end} ({selectedSlot.durationLabel})
              </p>
            </div>
            <button onClick={onCancel} className="text-sm text-[#2E3192] font-semibold hover:underline">Change</button>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Full Name *</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`} 
              placeholder="e.g. Krishna Das"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Email Address *</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`} 
              placeholder="email@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Phone Number *</label>
            <input 
              type="tel" 
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`} 
              placeholder="(123) 456-7890"
            />
            {errors.phoneNumber && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.phoneNumber}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Street Address *</label>
            <input 
              type="text" 
              name="street"
              value={formData.street}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.street ? 'border-red-500' : 'border-gray-300'}`} 
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.city ? 'border-red-500' : 'border-gray-300'}`} 
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
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.zipCode ? 'border-red-500' : 'border-gray-300'}`} 
                placeholder="30301"
              />
              {errors.zipCode && <p className="mt-1 text-xs text-red-500 font-semibold">{errors.zipCode}</p>}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">Occasion / Reason *</label>
            <input 
              type="text" 
              name="occasion"
              value={formData.occasion}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent ${errors.occasion ? 'border-red-500' : 'border-gray-300'}`} 
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
          ) : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
