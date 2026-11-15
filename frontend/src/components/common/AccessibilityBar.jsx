import React from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx';
import { Eye, Type, Volume2, VolumeX } from 'lucide-react';

export default function AccessibilityBar() {
  const { fontScale, setFontScale, isHighContrast, toggleHighContrast, isSpeaking, stopSpeaking } = useAccessibility();

  return (
    <div className="bg-slate-900 text-slate-100 py-1.5 px-4 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 transition-all">
      <div className="flex items-center gap-2 font-medium">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
        <span className="text-slate-300">Senior Accessibility Suite:</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Font Size Scaling */}
        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span className="text-slate-400 mr-1">Text:</span>
          {[
            { label: 'Normal', scale: 1 },
            { label: 'Large (115%)', scale: 1.15 },
            { label: 'XL (130%)', scale: 1.3 },
            { label: 'Max (150%)', scale: 1.5 },
          ].map((item) => (
            <button
              key={item.scale}
              onClick={() => setFontScale(item.scale)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                fontScale === item.scale
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* High Contrast Toggle */}
        <button
          onClick={toggleHighContrast}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
            isHighContrast
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Toggle High Contrast Mode for improved visibility"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isHighContrast ? 'High Contrast: ON' : 'High Contrast: OFF'}</span>
        </button>

        {/* Audio Mute if speaking */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[11px] font-medium animate-pulse"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Stop Audio</span>
          </button>
        )}
      </div>
    </div>
  );
}
