import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scan } from '@/types/scan';

interface ScanState {
  scans: Scan[];
  currentScan: Scan | null;
  addScan: (scan: Scan) => void;
  setCurrentScan: (scan: Scan | null) => void;
  deleteScan: (id: string) => void;
  clearAllScans: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      scans: [],
      currentScan: null,
      addScan: (scan) => set((state) => ({ 
        scans: [scan, ...state.scans],
        currentScan: scan
      })),
      setCurrentScan: (scan) => set({ currentScan: scan }),
      deleteScan: (id) => set((state) => ({ 
        scans: state.scans.filter((scan) => scan.id !== id),
        currentScan: state.currentScan?.id === id ? null : state.currentScan
      })),
      clearAllScans: () => set({ scans: [], currentScan: null }),
    }),
    {
      name: 'scan-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);