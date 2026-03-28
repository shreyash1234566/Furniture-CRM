'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function WalkinFormPage() {
  const [storeName, setStoreName] = useState('');
  const [logo, setLogo] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', requirement: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/walkin')
      .then(r => r.json())
      .then(data => {
        setStoreName(data.storeName || 'Furniture Store');
        setLogo(data.logo);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.phone.trim() || form.phone.length < 10) { setError('Please enter a valid phone number'); return; }
    if (!form.requirement.trim()) { setError('Please tell us what you are looking for'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          requirement: form.requirement.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success Screen ─────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-600 mb-2">Thank you, <strong>{form.name}</strong>!</p>
          <p className="text-gray-500 text-sm mb-8">
            Our team will assist you shortly. Feel free to explore our showroom.
          </p>
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">You are looking for</p>
            <p className="text-gray-700 font-medium">{form.requirement}</p>
          </div>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', requirement: '' }); }}
            className="mt-8 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Register another visitor
          </button>
        </div>
      </div>
    );
  }

  // ─── Form Screen ────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {logo ? (
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
              <Image src={logo} alt={storeName} width={64} height={64} className="object-contain w-full h-full" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl text-white">🪑</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{storeName}</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome! Please fill in your details</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="px-3 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium">+91</span>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                inputMode="numeric"
                maxLength={10}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Requirement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What are you looking for? <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Sofa Set', 'Bed & Mattress', 'Dining Table', 'Wardrobe', 'Office Furniture', 'Home Decor'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    requirement: f.requirement
                      ? (f.requirement.includes(tag) ? f.requirement : `${f.requirement}, ${tag}`)
                      : tag
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.requirement.includes(tag)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              placeholder="Or type your specific requirement..."
              value={form.requirement}
              onChange={e => setForm(f => ({ ...f, requirement: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-amber-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Registering...
              </>
            ) : (
              'Register Visit'
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Your information is safe and will only be used for in-store assistance.
          </p>
        </form>
      </div>
    </div>
  );
}
