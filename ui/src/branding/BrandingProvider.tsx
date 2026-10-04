import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Branding } from '../types';
import { apiService } from '../services/apiService';
import { applyBranding, BrandingContext, DEFAULT_BRANDING, formatMoney } from './branding';

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBrandingState] = useState<Branding>(DEFAULT_BRANDING);

  const setBranding = useCallback((next: Branding) => {
    setBrandingState(next);
    applyBranding(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiService.getBranding().then((loaded) => {
      if (!cancelled && loaded) setBranding(loaded);
    });
    return () => { cancelled = true; };
  }, [setBranding]);

  const value = useMemo(
    () => ({ branding, setBranding, money: (amount: number) => formatMoney(amount, branding) }),
    [branding, setBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};
