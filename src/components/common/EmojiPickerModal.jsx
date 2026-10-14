import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { EMOJI_CATEGORIES } from '../../constants/emojiCategories';

export { EMOJI_CATEGORIES };

export default function EmojiPickerModal({ isOpen, onClose, selectedEmoji = '🍔', onSelectEmoji }) {
  const [activeTab, setActiveTab] = useState('food');
  const [searchQuery, setSearchQuery] = useState('');
  useBackHandler(Boolean(isOpen), onClose);

  const displayedEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return (EMOJI_CATEGORIES.find(c => c.id === activeTab) || EMOJI_CATEGORIES[0]).emojis;
    const all = [], seen = new Set();
    EMOJI_CATEGORIES.forEach(cat => cat.emojis.forEach(item => {
      if (!seen.has(item.emoji) && (item.keywords.some(k => k.toLowerCase().includes(q)) || item.emoji.includes(q))) {
        seen.add(item.emoji);
        all.push(item);
      }
    }));
    return all;
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;
  const handleSelect = (emoji) => { onSelectEmoji?.(emoji); onClose?.(); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border animate-slide-up pb-safe max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-400/40 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xl shadow-sm">{selectedEmoji || '🏷️'}</div>
            <div>
              <h3 className="text-base font-bold">Seleccionar Icono</h3>
              <p className="text-[11px] opacity-60">Emojis nativos estilo WhatsApp a todo color</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar selector" className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold opacity-60 hover:opacity-100 cursor-pointer transition-colors" style={{ backgroundColor: 'var(--bg-card-sub)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="relative my-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
          <input type="text" placeholder="Buscar emoji (ej: café, pizza, taxi, casa, gym)..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-[#34C759] transition-all"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }} />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100 p-1">✕</button>
          )}
        </div>

        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none">
            {EMOJI_CATEGORIES.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  activeTab === cat.id ? 'bg-emerald-500 text-white shadow-sm scale-102' : 'hover:bg-slate-200/50 dark:hover:bg-white/10 opacity-70'
                }`} style={activeTab !== cat.id ? { backgroundColor: 'var(--bg-card-sub)' } : {}}>
                <span className="text-sm">{cat.icon}</span>
                <span className="truncate max-w-[110px]">{cat.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 mt-2 min-h-[200px] max-h-[300px]">
          {displayedEmojis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-60 text-center">
              <span className="text-3xl mb-2">🔍</span><p className="text-xs font-semibold">No se encontraron emojis</p><p className="text-[11px] opacity-75">Intenta con otra palabra clave</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 place-items-center">
              {displayedEmojis.map((item, idx) => (
                <button key={`${item.emoji}-${idx}`} type="button" onClick={() => handleSelect(item.emoji)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-2xl transition-all cursor-pointer select-none active:scale-90 ${
                    selectedEmoji === item.emoji ? 'ring-2 ring-emerald-500 bg-emerald-500/15 shadow-sm scale-110' : 'hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-115'
                  }`} title={item.keywords.join(', ')}>
                  <span role="img" aria-label={item.keywords[0]} className="leading-none pointer-events-none">{item.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 mt-2 border-t flex items-center justify-between text-[11px] opacity-60" style={{ borderColor: 'var(--border-color)' }}>
          <span>Toca cualquier emoji para seleccionarlo</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{displayedEmojis.length} emoji{displayedEmojis.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
