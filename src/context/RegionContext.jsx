import { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency } from '../utils/helpers';
import { getExchangeRates, convertFromEur } from '../services/exchangeRates';
import { getSettings } from '../services/settings';

const RegionContext = createContext(null);

export const RegionProvider = ({ children }) => {
    // Default region is EU (Europe), can be switched to US (United States)
    const [region, setRegionState] = useState(() => {
        const saved = localStorage.getItem('second_thrift_region');
        if (saved === 'US' || saved === 'EU') return saved;
        
        // Auto-detect based on user timezone as initial guess
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz.includes('America') || tz.includes('US') || tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles')) {
                return 'US';
            }
        } catch {
            // ignore
        }
        return 'EU';
    });

    const [exchangeRates, setExchangeRates] = useState({ USD: 1.09, EUR: 1, GBP: 0.86 });
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        getExchangeRates().then(({ rates }) => {
            if (rates && Object.keys(rates).length > 0) {
                setExchangeRates(rates);
            }
        }).catch(() => {});

        getSettings().then(s => setSettings(s)).catch(() => {});
    }, []);

    const setRegion = (newRegion) => {
        setRegionState(newRegion);
        try {
            localStorage.setItem('second_thrift_region', newRegion);
        } catch {
            // ignore
        }
    };

    const isUS = region === 'US';
    const activeCurrency = isUS ? 'USD' : 'EUR';

    /**
     * Format price for display according to active region.
     * Shows base EUR price and if region is US, displays converted USD as well.
     */
    const getRegionalPrice = (eurAmount) => {
        const numEur = Number(eurAmount) || 0;
        if (!isUS) {
            return {
                primary: `€${numEur.toFixed(2)}`,
                secondary: null,
                shippingBadge: 'Free EU Shipping',
                currency: 'EUR',
            };
        }

        const usdAmount = convertFromEur(numEur, 'USD', exchangeRates);
        return {
            primary: `€${numEur.toFixed(2)}`,
            secondary: `approx. $${usdAmount.toFixed(2)} USD`,
            usdAmount,
            shippingBadge: '🇺🇸 Ships to USA',
            currency: 'USD',
        };
    };

    const value = {
        region,
        setRegion,
        isUS,
        activeCurrency,
        exchangeRates,
        settings,
        getRegionalPrice,
        shippingNotice: isUS
            ? 'Fast express courier to USA · Shipping calculated at checkout'
            : 'Free delivery to Australia, Austria, Germany, France, UK & Italy',
    };

    return (
        <RegionContext.Provider value={value}>
            {children}
        </RegionContext.Provider>
    );
};

export const useRegion = () => {
    const context = useContext(RegionContext);
    if (!context) {
        throw new Error('useRegion must be used within a RegionProvider');
    }
    return context;
};
