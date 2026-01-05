
import React, { useState, useEffect } from 'react';
import { getFullManual } from '../services/manualService';
import { Chapter } from '../types';
import { ChevronLeft, ChevronRight, Zap, Play, Music } from 'lucide-react';

const Reader: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>(getFullManual());
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  useEffect(() => {
    setChapters(getFullManual());
  }, []);

  if (chapters.length === 0) return null;

  const chapter = chapters[currentChapterIndex];
  const isDynamic = chapter.id > 31; 
  const isHomecoming = chapter.id === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 md:p-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button 
          onClick={() => setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))}
          disabled={currentChapterIndex === 0}
          className="p-2 rounded-full hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[10px] mono text-cyan-400 uppercase tracking-widest block font-bold">
              {isHomecoming ? 'PREFACE // THE ANTHEM' : `Chapter ${chapter.id} of ${chapters.length - 1}`}
            </span>
          </div>
          <h2 className={`text-xl md:text-3xl font-black text-white tracking-tighter uppercase ${isHomecoming ? 'glitch-text pulse-90' : ''}`}>{chapter.title}</h2>
        </div>
        <button 
          onClick={() => setCurrentChapterIndex(Math.min(chapters.length - 1, currentChapterIndex + 1))}
          disabled={currentChapterIndex === chapters.length - 1}
          className="p-2 rounded-full hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto bg-black/40 border rounded-2xl p-6 md:p-10 shadow-2xl space-y-6 transition-all duration-500 custom-scrollbar ${isHomecoming ? 'border-cyan-400/50 shadow-[0_0_50px_rgba(0,229,255,0.1)] ring-1 ring-cyan-500/20' : 'border-cyan-900/30'}`}>
        {isHomecoming && (
           <div className="flex items-center gap-4 mb-8 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <div className="p-3 bg-cyan-500 rounded-full text-black pulse-90">
                <Music size={20} />
              </div>
              <div>
                <span className="text-[10px] mono text-cyan-400 uppercase font-black tracking-widest block">Neural Link Established</span>
                <span className="text-[9px] mono text-cyan-400/60 uppercase">40Hz Gamma Foundation // 90 BPM Heartbeat</span>
              </div>
           </div>
        )}
        {chapter.content.map((paragraph, idx) => (
          <p key={idx} className={`leading-relaxed text-base md:text-lg font-light ${isHomecoming ? 'text-cyan-100/90 italic border-l-2 border-cyan-500/30 pl-4 py-1' : 'text-gray-400'}`}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-5 md:grid-cols-8 gap-1 mt-6 shrink-0">
        {chapters.map((ch, idx) => (
          <button
            key={ch.id}
            onClick={() => setCurrentChapterIndex(idx)}
            className={`text-[8px] mono py-2 border transition-all truncate px-1 ${
              currentChapterIndex === idx 
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold' 
              : 'bg-transparent text-gray-700 border-gray-900 hover:border-cyan-800'
            }`}
          >
            {ch.id === 0 ? 'ANTHEM' : `CH ${ch.id}`}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Reader;
