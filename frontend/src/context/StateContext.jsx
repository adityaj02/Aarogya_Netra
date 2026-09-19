/**
 * StateContext — persists the selected Indian state across sessions
 * via localStorage so it survives page refreshes within a session.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'an_selected_state';

const StateContext = createContext(null);

export function StateProvider({ children }) {
  const [selectedState, _setSelectedState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ''; }
    catch { return ''; }
  });

  const setSelectedState = useCallback((state) => {
    try { localStorage.setItem(STORAGE_KEY, state); } catch {}
    _setSelectedState(state);
  }, []);

  return (
    <StateContext.Provider value={{ selectedState, setSelectedState }}>
      {children}
    </StateContext.Provider>
  );
}

export function useSelectedState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useSelectedState must be used inside <StateProvider>');
  return ctx;
}
