import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, CreditCard } from 'lucide-react';
import { DynamicIcon } from './CategoryIcon';
import BrandIcon from './BrandIcon';

const PRESET_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'
];

export default function AccountCombobox({
  accounts = [],
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  placeholder = "Escribe o selecciona cuenta..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const accountsList = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const selectedAcc = accountsList.find(a => a?.id === selectedAccountId);

  useEffect(() => {
    if (selectedAcc && selectedAcc.name) {
      setQuery(selectedAcc.name);
    } else {
      setQuery('');
    }
    setIsUserTyping(false);
  }, [selectedAccountId, selectedAcc]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsUserTyping(false);
        if (selectedAcc && selectedAcc.name) {
          setQuery(selectedAcc.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAcc]);

  // If user hasn't typed yet or query matches current selection, show ALL predefined accounts!
  const isShowingAll = !isUserTyping || query.trim() === '' || (selectedAcc && query.trim() === (selectedAcc?.name || '').trim());

  const filteredAccounts = isShowingAll
    ? accountsList
    : accountsList.filter(a =>
        (a?.name || '').toLowerCase().includes(query.toLowerCase().trim())
      );

  const exactMatch = accountsList.some(
    a => (a?.name || '').toLowerCase() === query.toLowerCase().trim()
  );

  const handleInputFocus = () => {
    setIsOpen(true);
    setIsUserTyping(false); // Show all predefined accounts upon opening
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsUserTyping(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (acc) => {
    onSelectAccount(acc.id);
    setQuery(acc.name);
    setIsUserTyping(false);
    setIsOpen(false);
  };

  const handleCreateAndSelect = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

    const newAccount = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('acc-' + Date.now()),
      name: trimmed,
      type: 'bank',
      initialBalance: 0,
      color: randomColor,
      icon: 'Building2'
    };

    if (onAddAccount) {
      onAddAccount(newAccount);
    }
    onSelectAccount(newAccount.id);
    setQuery(newAccount.name);
    setIsUserTyping(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAccounts.length > 0 && exactMatch) {
        handleSelect(filteredAccounts.find(a => a.name.toLowerCase() === query.toLowerCase().trim()) || filteredAccounts[0]);
      } else if (filteredAccounts.length > 0 && isUserTyping && query.trim() !== '') {
        const found = filteredAccounts.find(a => a.name.toLowerCase() === query.toLowerCase().trim());
        if (found) {
          handleSelect(found);
        } else {
          handleCreateAndSelect();
        }
      } else if (query.trim() !== '') {
        handleCreateAndSelect();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsUserTyping(false);
      if (selectedAcc) setQuery(selectedAcc.name);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsUserTyping(false);
      if (inputRef.current) inputRef.current.focus();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={toggleDropdown}
        className="relative flex items-center cursor-pointer"
      >
        {selectedAcc && (
          <div className="ml-2.5 mr-1 shrink-0 flex items-center justify-center">
            <BrandIcon 
              name={selectedAcc.name} 
              type={selectedAcc.type} 
              size={18} 
              fallback={
                <div 
                  className="w-3.5 h-3.5 rounded-full shadow-sm"
                  style={{ backgroundColor: selectedAcc.color || '#007AFF' }}
                />
              } 
            />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={handleInputFocus}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-2.5 pr-8 py-2.5 border border-transparent rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-text"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
        />
        <ChevronDown 
          className={`w-4 h-4 opacity-50 absolute right-3 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1 rounded-2xl shadow-2xl border max-h-60 overflow-y-auto z-50 animate-slide-up p-1.5 divide-y"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <div className="space-y-0.5">
            {filteredAccounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelect(acc)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                    isSelected ? 'bg-blue-500/15 font-bold text-[#007AFF]' : 'hover:bg-black/5 font-medium'
                  }`}
                  style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-main)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BrandIcon 
                      name={acc.name} 
                      type={acc.type}
                      size={18} 
                      wrapperClassName="w-5 h-5 rounded-md flex items-center justify-center shrink-0 overflow-hidden" 
                      fallback={
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: acc.color || '#007AFF' }} 
                        />
                      } 
                    />
                    <span className="truncate">{acc.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />}
                </button>
              );
            })}
          </div>

          {isUserTyping && !exactMatch && query.trim() !== '' && (
            <div className="pt-1 mt-1" style={{ borderColor: 'var(--border-color)' }}>
              <button
                type="button"
                onClick={handleCreateAndSelect}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-500/15 text-emerald-600 transition-colors font-semibold group text-left"
                style={{ backgroundColor: 'var(--bg-card-sub)' }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">Guardar "{query.trim()}"</span>
                </div>
                <span className="text-[10px] opacity-60 group-hover:text-emerald-600 px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border-color)' }}>
                  Enter ↵
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
