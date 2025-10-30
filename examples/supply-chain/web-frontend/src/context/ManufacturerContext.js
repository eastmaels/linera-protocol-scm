import React, { createContext, useContext, useState, useEffect } from 'react';

const ManufacturerContext = createContext();

const STORAGE_KEY = 'linera_manufacturers';

export function ManufacturerProvider({ children }) {
  const [manufacturers, setManufacturers] = useState({});

  // Load manufacturers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setManufacturers(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading manufacturers from localStorage:', error);
      }
    }
  }, []);

  // Save manufacturers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manufacturers));
  }, [manufacturers]);

  const addManufacturer = (address, name) => {
    // Ensure address has 0x prefix
    const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
    setManufacturers(prev => ({
      ...prev,
      [formattedAddress]: name,
    }));
  };

  const removeManufacturer = (address) => {
    const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
    setManufacturers(prev => {
      const newManufacturers = { ...prev };
      delete newManufacturers[formattedAddress];
      return newManufacturers;
    });
  };

  const getManufacturerName = (address) => {
    if (!address) return null;
    const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
    return manufacturers[formattedAddress] || null;
  };

  const getAllManufacturers = () => {
    return Object.entries(manufacturers).map(([address, name]) => ({
      address,
      name,
    }));
  };

  const value = {
    manufacturers,
    addManufacturer,
    removeManufacturer,
    getManufacturerName,
    getAllManufacturers,
  };

  return (
    <ManufacturerContext.Provider value={value}>
      {children}
    </ManufacturerContext.Provider>
  );
}

export function useManufacturers() {
  const context = useContext(ManufacturerContext);
  if (!context) {
    throw new Error('useManufacturers must be used within ManufacturerProvider');
  }
  return context;
}
