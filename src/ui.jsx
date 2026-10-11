import React from 'react';
import { X } from 'lucide-react';
import { CLINIC } from './lib.js';

export const inputCls = 'w-full px-3 py-2.5 min-h-11 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
export const btnPrimary = 'bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 min-h-11 rounded-lg text-base sm:text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost = 'px-5 py-2.5 min-h-11 rounded-lg text-base sm:text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';

export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-3 sm:p-4 overflow-auto z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-4 sm:mt-8 mb-8">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2" aria-label="Close"><X size={22} /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
  </label>
);

const STATUS_STYLE = {
  planned: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-800',
};
export const StatusBadge = ({ status, label }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE.planned}`}>
    {label || status.replace('-', ' ')}
  </span>
);

// Big touch-friendly either/or buttons.
export const Segmented = ({ options, value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {options.map(o => (
      <button
        type="button"
        key={o.value}
        onClick={() => onChange(o.value)}
        className={`flex-1 min-w-24 min-h-11 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
          value === o.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-brand-50'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// A list of big buttons where some are greyed out (busy doctors / rooms in use).
export const ChoiceGrid = ({ items, value, onChange }) => (
  <div className="grid grid-cols-2 gap-2">
    {items.map(i => (
      <button
        type="button"
        key={i.id}
        disabled={i.disabled}
        onClick={() => onChange(i.id)}
        className={`min-h-14 px-3 py-2 rounded-lg border text-left transition-colors ${
          i.disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : value === i.id
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-800 border-gray-300 hover:bg-brand-50'
        }`}
      >
        <span className="block text-sm font-medium">{i.name}</span>
        {i.note && <span className="block text-xs">{i.note}</span>}
      </button>
    ))}
  </div>
);

// Logo + clinic details, used at the top of the prescription and the receipt.
export const ClinicHeader = ({ title, children }) => (
  <div className="flex items-start gap-3 border-b-2 border-brand-600 pb-3">
    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="h-16 w-auto shrink-0" />
    <div className="flex-1 min-w-0 text-sm">
      <p className="font-bold text-base text-brand-700 font-heading">{CLINIC.name}</p>
      <p className="text-gray-600">{CLINIC.address}</p>
      <p className="text-gray-600">{CLINIC.phones}</p>
      <p className="text-gray-600">{CLINIC.website}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="font-semibold text-gray-900 uppercase tracking-wide text-sm">{title}</p>
      {children}
    </div>
  </div>
);
