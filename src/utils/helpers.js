/**
 * Utility functions for the Second Thrift application
 */

// Currency symbols map
const CURRENCY_SYMBOLS = { EUR: '€', GBP: '£', USD: '$', INR: '₹' };

// Format price with optional currency support
export const formatPrice = (price, currency = 'EUR') => {
    if (price === undefined || price === null) return '';
    const symbol = CURRENCY_SYMBOLS[currency] || '€';
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false
    }).format(price);
    return `${formattedNumber} ${symbol}`;
};

export const formatCurrency = (price, currency = 'EUR', locale = 'en-US') => {
    if (price === undefined || price === null) return '';
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    } catch {
        return `${Number(price).toFixed(2)} ${currency}`;
    }
};

// Format date
export const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

// Calculate bulk price
export const getBulkPrice = (product, quantity) => {
    if (!product.bulkPrices || product.bulkPrices.length === 0) return product.price;
    const sorted = [...product.bulkPrices].sort((a, b) => b.minQty - a.minQty);
    const applicable = sorted.find(bp => quantity >= bp.minQty);
    return applicable ? applicable.price : product.price;
};

export const DEFAULT_USA_WEIGHT_TIERS = [
    { maxWeight: 2, rate: 20.00, label: 'Up to 2 KG' },
    { maxWeight: 5, rate: 35.00, label: 'Up to 5 KG' },
    { maxWeight: 10, rate: 60.00, label: 'Up to 10 KG' },
    { maxWeight: 20, rate: 110.00, label: 'Up to 20 KG' },
    { maxWeight: 30, rate: 160.00, label: 'Up to 30 KG' },
];

// Calculate total parcel weight in KG from cart items
export const calculateCartWeight = (items) => {
    if (!items || items.length === 0) return 0;
    const total = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 1;
        let unitWeight = 0;
        if (item.weight && !isNaN(parseFloat(item.weight)) && parseFloat(item.weight) > 0) {
            unitWeight = parseFloat(item.weight);
        } else {
            // Check if title or name has explicit weight (e.g. "10 kg", "20 kg", "5 kg")
            const nameMatch = (item.name || '').match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/i);
            if (nameMatch) {
                unitWeight = parseFloat(nameMatch[1]);
            } else {
                unitWeight = 0.8; // default 0.8 kg per piece of apparel
            }
        }
        return sum + (unitWeight * qty);
    }, 0);
    return Math.round(total * 100) / 100;
};

// Determine USA shipping rate and label according to parcel weight and settings
export const getUsaShippingForWeight = (totalWeight, usaConfig) => {
    const rawTiers = (usaConfig?.weightTiers && usaConfig.weightTiers.length > 0)
        ? usaConfig.weightTiers
        : DEFAULT_USA_WEIGHT_TIERS;

    // Filter valid tiers and sort ascending by maxWeight
    const tiers = [...rawTiers]
        .filter(t => t && !isNaN(parseFloat(t.maxWeight)) && !isNaN(parseFloat(t.rate)))
        .map(t => ({
            maxWeight: parseFloat(t.maxWeight),
            rate: parseFloat(t.rate),
            label: t.label || `Up to ${t.maxWeight} KG`,
        }))
        .sort((a, b) => a.maxWeight - b.maxWeight);

    if (tiers.length === 0) {
        return {
            rate: Number(usaConfig?.rate) || 20.00,
            label: 'USA Express Courier',
            tier: null,
        };
    }

    // Match first tier where totalWeight <= maxWeight
    const matched = tiers.find(t => totalWeight <= t.maxWeight);
    if (matched) {
        return {
            rate: matched.rate,
            label: `USA Express (${matched.label})`,
            tier: matched,
        };
    }

    // Weight exceeds highest tier: highest tier rate + per-KG surplus
    const highest = tiers[tiers.length - 1];
    const excessWeight = Math.max(0, totalWeight - highest.maxWeight);
    const perKgRate = Number(usaConfig?.excessPerKgRate) || 6.00;
    const surplus = Math.ceil(excessWeight) * perKgRate;
    const finalRate = highest.rate + surplus;

    return {
        rate: finalRate,
        label: `USA Express (${totalWeight.toFixed(1)} KG Bulk)`,
        tier: highest,
    };
};

// The 6 designated countries with Free Shipping
export const FREE_SHIPPING_COUNTRIES = [
    'australia',
    'austria',
    'germany',
    'france',
    'united kingdom',
    'italy',
];

export const FREE_SHIPPING_ALIASES = {
    'uk': 'united kingdom',
    'great britain': 'united kingdom',
    'gb': 'united kingdom',
    'deutschland': 'germany',
    'de': 'germany',
    'italia': 'italy',
    'it': 'italy',
    'fr': 'france',
    'at': 'austria',
    'au': 'australia',
};

// Calculate order totals dynamically based on destination country and store settings
export const calculateOrderTotals = (items, destinationCountry = '', settings = null) => {
    const subtotal = (items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const totalWeight = calculateCartWeight(items);
    
    const regional = settings?.regionalShipping || {
        europe: { rate: 15.00, label: 'Europe Standard Delivery', freeThreshold: 0 },
        usa: { rate: 20.00, label: 'United States (Express Courier)', freeThreshold: 0, excessPerKgRate: 6.00, weightTiers: DEFAULT_USA_WEIGHT_TIERS },
        restOfWorld: { rate: 25.00, label: 'Rest of World (Standard International)', freeThreshold: 0 },
    };

    let shipping = 0;
    let shippingZone = 'europe';
    let shippingLabel = 'Standard Delivery';

    const normalizedCountry = (destinationCountry || '').trim().toLowerCase();
    const canonicalCountry = FREE_SHIPPING_ALIASES[normalizedCountry] || normalizedCountry;
    const isFreeShippingCountry = FREE_SHIPPING_COUNTRIES.includes(canonicalCountry);

    if (normalizedCountry) {
        // Check specific country overrides first
        const countryOverride = settings?.shippingRates?.find(
            r => r.country && (
                r.country.trim().toLowerCase() === normalizedCountry ||
                r.country.trim().toLowerCase() === canonicalCountry
            )
        );

        const isUSA = normalizedCountry === 'united states' || normalizedCountry === 'usa' || normalizedCountry === 'us';

        // Check if all items in cart qualify for promotional free shipping
        const allItemsFree = (items || []).length > 0 && (items || []).every(i => i.isFreeShipping || i.shippingType === 'free');

        if (allItemsFree) {
            shipping = 0;
            shippingLabel = 'Free Shipping (Item Promotion)';
            shippingZone = isUSA ? 'usa' : (COUNTRIES_BY_REGION['Europe']?.some(c => c.toLowerCase() === normalizedCountry) ? 'europe' : 'restOfWorld');
        } else if (isFreeShippingCountry) {
            // ONLY Australia, Austria, Germany, France, United Kingdom, and Italy receive Free Shipping
            shippingZone = canonicalCountry === 'australia' ? 'oceania' : 'europe';

            // If admin explicitly set a custom paid rate in Settings > Country Rates, respect admin's override:
            if (countryOverride && typeof countryOverride.rate === 'number' && countryOverride.rate > 0) {
                const freeThreshold = Number(countryOverride.freeThreshold) || 0;
                const isFree = freeThreshold > 0 && subtotal >= freeThreshold;
                shipping = isFree ? 0 : countryOverride.rate;
                shippingLabel = isFree
                    ? `${countryOverride.country || destinationCountry} Delivery (Free Shipping)`
                    : `${countryOverride.country || destinationCountry} Delivery`;
            } else {
                shipping = 0;
                const countryTitle = countryOverride?.country || (destinationCountry.charAt(0).toUpperCase() + destinationCountry.slice(1));
                shippingLabel = `${countryTitle} Delivery (Free Shipping)`;
            }
        } else if (isUSA) {
            shippingZone = 'usa';
            const usaConfig = regional.usa || { rate: 20, freeThreshold: 0, excessPerKgRate: 6.00, weightTiers: DEFAULT_USA_WEIGHT_TIERS };
            const freeThreshold = countryOverride?.freeThreshold !== undefined ? Number(countryOverride.freeThreshold) : Number(usaConfig.freeThreshold || 0);
            const isFree = freeThreshold > 0 && subtotal >= freeThreshold;

            const hasCustomUsa = (items || []).some(i => i.shippingType === 'custom' && i.shippingPriceUsa !== null && !isNaN(Number(i.shippingPriceUsa)));

            if (isFree) {
                shipping = 0;
                shippingLabel = 'USA Express (Free Shipping)';
            } else if (hasCustomUsa) {
                const customUsaTotal = (items || []).reduce((sum, i) => {
                    if (i.shippingType === 'custom' && i.shippingPriceUsa !== null && !isNaN(Number(i.shippingPriceUsa))) {
                        return sum + (Number(i.shippingPriceUsa) * (Number(i.quantity) || 1));
                    }
                    return sum;
                }, 0);
                shipping = customUsaTotal;
                shippingLabel = 'USA Express (Custom Product Rate)';
            } else {
                const weightShipping = getUsaShippingForWeight(totalWeight, usaConfig);
                shipping = weightShipping.rate;
                shippingLabel = weightShipping.label;
            }
        } else {
            const isEurope = COUNTRIES_BY_REGION['Europe']?.some(
                c => c.toLowerCase() === normalizedCountry
            );

            if (isEurope) {
                shippingZone = 'europe';
                const hasCustomEu = (items || []).some(i => i.shippingType === 'custom' && i.shippingPriceEurope !== null && !isNaN(Number(i.shippingPriceEurope)));

                if (hasCustomEu) {
                    const customEuTotal = (items || []).reduce((sum, i) => {
                        if (i.shippingType === 'custom' && i.shippingPriceEurope !== null && !isNaN(Number(i.shippingPriceEurope))) {
                            return sum + (Number(i.shippingPriceEurope) * (Number(i.quantity) || 1));
                        }
                        return sum;
                    }, 0);
                    shipping = customEuTotal;
                    shippingLabel = customEuTotal === 0 ? `${destinationCountry} Delivery (Free)` : `${destinationCountry} Delivery`;
                } else if (countryOverride && typeof countryOverride.rate === 'number') {
                    const freeThreshold = Number(countryOverride.freeThreshold) || 0;
                    const isFree = freeThreshold > 0 && subtotal >= freeThreshold;
                    shipping = isFree ? 0 : countryOverride.rate;
                    shippingLabel = isFree
                        ? `${countryOverride.country} Delivery (Free Shipping)`
                        : `${countryOverride.country} Delivery`;
                } else {
                    const euConfig = regional.europe || { rate: 15.00, freeThreshold: 0 };
                    const isFree = euConfig.freeThreshold > 0 && subtotal >= euConfig.freeThreshold;
                    shipping = isFree ? 0 : (Number(euConfig.rate) || 15.00);
                    shippingLabel = `${destinationCountry || 'Europe'} Delivery`;
                }
            } else {
                shippingZone = 'restOfWorld';
                const hasCustomRow = (items || []).some(i => i.shippingType === 'custom' && i.shippingPriceRow !== null && !isNaN(Number(i.shippingPriceRow)));

                if (hasCustomRow) {
                    const customRowTotal = (items || []).reduce((sum, i) => {
                        if (i.shippingType === 'custom' && i.shippingPriceRow !== null && !isNaN(Number(i.shippingPriceRow))) {
                            return sum + (Number(i.shippingPriceRow) * (Number(i.quantity) || 1));
                        }
                        return sum;
                    }, 0);
                    shipping = customRowTotal;
                    shippingLabel = customRowTotal === 0 ? 'International (Free)' : 'International Courier';
                } else if (countryOverride && typeof countryOverride.rate === 'number') {
                    const freeThreshold = Number(countryOverride.freeThreshold) || 0;
                    const isFree = freeThreshold > 0 && subtotal >= freeThreshold;
                    shipping = isFree ? 0 : countryOverride.rate;
                    shippingLabel = isFree
                        ? `${countryOverride.country} Delivery (Free Shipping)`
                        : `${countryOverride.country} Delivery`;
                } else {
                    const rowConfig = regional.restOfWorld || { rate: 25.00, freeThreshold: 0 };
                    const isFree = rowConfig.freeThreshold > 0 && subtotal >= rowConfig.freeThreshold;
                    shipping = isFree ? 0 : (Number(rowConfig.rate) || 25.00);
                    shippingLabel = 'International Courier';
                }
            }
        }
    } else {
        // No country selected yet
        shipping = 0;
        shippingLabel = 'Select country at checkout';
    }

    const total = subtotal + shipping;
    return { subtotal, shipping, tax: 0, total, shippingZone, shippingLabel, totalWeight };
};

// Validate email
export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Generate slug from text
export const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Check if a media URL is a video (including YouTube clips)
export const isVideoUrl = (url) => {
    if (!url) return false;
    // Check common video file extensions (with or without query params)
    if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i.test(url)) return true;
    // Check if URL contains video content-type hint
    if (/video/i.test(url)) return true;
    // Check if YouTube
    if (isYouTubeUrl(url)) return true;
    return false;
};

// Check if URL is a YouTube link
export const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /youtube\.com|youtu\.be/i.test(url);
};

// Extract YouTube video ID
export const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]{11})/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

// Order status labels with colors
export const ORDER_STATUSES = {
    pending: { label: 'Pending Payment', color: 'warning', icon: '◷' },
    payment_received: { label: 'Payment Received', color: 'primary', icon: '◆' },
    processing: { label: 'Processing', color: 'primary', icon: '⬡' },
    shipped: { label: 'Shipped', color: 'info', icon: '▸' },
    delivered: { label: 'Delivered', color: 'success', icon: '✓' },
    cancelled: { label: 'Cancelled', color: 'error', icon: '✕' },
};

// Countries grouped by region
export const COUNTRIES_BY_REGION = {
    'Europe': [
        'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
        'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia',
        'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
        'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
        'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia',
        'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia',
        'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine',
        'United Kingdom',
    ],
    'Asia': [
        'Afghanistan', 'Armenia', 'Azerbaijan', 'Bangladesh', 'Bhutan', 'Brunei',
        'Cambodia', 'China', 'Georgia', 'Hong Kong', 'India', 'Indonesia', 'Japan',
        'Kazakhstan', 'Kyrgyzstan', 'Laos', 'Macau', 'Malaysia', 'Maldives',
        'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Pakistan', 'Philippines',
        'Singapore', 'South Korea', 'Sri Lanka', 'Taiwan', 'Tajikistan', 'Thailand',
        'Timor-Leste', 'Turkmenistan', 'Uzbekistan', 'Vietnam',
    ],
    'North America': [
        'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada',
        'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador',
        'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
        'Nicaragua', 'Panama', 'Saint Kitts and Nevis', 'Saint Lucia',
        'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'United States',
    ],
    'South America': [
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
        'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
    ],
    'Africa': [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
        'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Comoros',
        'Congo', 'DR Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea',
        'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
        'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya',
        'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco',
        'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Senegal',
        'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
        'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
    ],
    'Oceania': [
        'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia',
        'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa',
        'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
    ],
    'Middle East': [
        'Bahrain', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon',
        'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Syria', 'Turkey',
        'United Arab Emirates', 'Yemen',
    ],
};

export const COUNTRY_CURRENCY = {
    Austria: 'EUR',
    Belgium: 'EUR',
    Croatia: 'EUR',
    Cyprus: 'EUR',
    Estonia: 'EUR',
    Finland: 'EUR',
    France: 'EUR',
    Germany: 'EUR',
    Greece: 'EUR',
    Ireland: 'EUR',
    Italy: 'EUR',
    Latvia: 'EUR',
    Lithuania: 'EUR',
    Luxembourg: 'EUR',
    Malta: 'EUR',
    Netherlands: 'EUR',
    Portugal: 'EUR',
    Slovakia: 'EUR',
    Slovenia: 'EUR',
    Spain: 'EUR',
    Andorra: 'EUR',
    Kosovo: 'EUR',
    Monaco: 'EUR',
    Montenegro: 'EUR',
    'San Marino': 'EUR',
    'United Kingdom': 'GBP',
    Switzerland: 'CHF',
    Liechtenstein: 'CHF',
    Norway: 'NOK',
    Sweden: 'SEK',
    Denmark: 'DKK',
    Poland: 'PLN',
    'Czech Republic': 'CZK',
    Hungary: 'HUF',
    Romania: 'RON',
    Bulgaria: 'BGN',
    Serbia: 'RSD',
    Albania: 'ALL',
    Iceland: 'ISK',
    Ukraine: 'UAH',
    Moldova: 'MDL',
    Russia: 'RUB',
    Belarus: 'BYN',
    'Bosnia and Herzegovina': 'BAM',
    'North Macedonia': 'MKD',
    India: 'INR',
    Bhutan: 'INR',
    Nepal: 'NPR',
    Bangladesh: 'BDT',
    Pakistan: 'PKR',
    'Sri Lanka': 'LKR',
    Maldives: 'MVR',
    China: 'CNY',
    'Hong Kong': 'HKD',
    Macau: 'MOP',
    Japan: 'JPY',
    'South Korea': 'KRW',
    Taiwan: 'TWD',
    Singapore: 'SGD',
    Malaysia: 'MYR',
    Thailand: 'THB',
    Indonesia: 'IDR',
    Philippines: 'PHP',
    Vietnam: 'VND',
    Cambodia: 'KHR',
    Laos: 'LAK',
    Myanmar: 'MMK',
    Mongolia: 'MNT',
    Kazakhstan: 'KZT',
    Uzbekistan: 'UZS',
    Azerbaijan: 'AZN',
    Armenia: 'AMD',
    Georgia: 'GEL',
    'United States': 'USD',
    Canada: 'CAD',
    Mexico: 'MXN',
    Australia: 'AUD',
    'New Zealand': 'NZD',
    Brazil: 'BRL',
    Argentina: 'ARS',
    Chile: 'CLP',
    Colombia: 'COP',
    Peru: 'PEN',
    'South Africa': 'ZAR',
    Egypt: 'EGP',
    Morocco: 'MAD',
    Nigeria: 'NGN',
    Kenya: 'KES',
    Ghana: 'GHS',
    Turkey: 'TRY',
    'United Arab Emirates': 'AED',
    'Saudi Arabia': 'SAR',
    Qatar: 'QAR',
    Kuwait: 'KWD',
    Bahrain: 'BHD',
    Oman: 'OMR',
    Israel: 'ILS',
};

export const getCurrencyForCountry = (country) => COUNTRY_CURRENCY[country] || 'EUR';

export const getPaymentCurrencyForCountry = (country) => 'EUR';

// Flat list of all countries (for backward compatibility)
export const ALL_COUNTRIES = Object.values(COUNTRIES_BY_REGION).flat();

// Keep EU_COUNTRIES as alias for backward compat
export const EU_COUNTRIES = ALL_COUNTRIES;

// Product conditions
export const PRODUCT_CONDITIONS = [
    { value: 'new', label: 'New with Tags' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
];

// Common sizes
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'One Size'];

// Brands
export const BRANDS = [
    "Levi's",
    'True Religion',
    'Carhartt',
    'Dickies',
    'Evisu',
    'D&G',
    'Armani',
    'Miss Me',
    'Rock Revival',
    'Realtree',
    'G-Star',
    'Diesel',
    'JNCO',
    'Wrangler',
    'Lee',
    'Laguna Beach',
    'Nike',
    'Adidas',
    'Zara',
    'H&M',
    'Other',
];

// Currencies
export const CURRENCIES = [
    { code: 'EUR', symbol: '€', label: 'Euro (€)' },
    { code: 'GBP', symbol: '£', label: 'Pound (£)' },
    { code: 'USD', symbol: '$', label: 'Dollar ($)' },
    { code: 'INR', symbol: '₹', label: 'Rupee (₹)' },
];

// Grading system
export const GRADES = [
    { value: 'A', label: 'Grade A', icon: '👑', title: '100% Grade A', description: 'All items in this bundle are Grade A — premium quality, minimal to no defects.' },
    { value: 'A/B', label: 'Grade A/B', icon: '👑', title: '>70% of items are GRADE A', description: 'This bundle contains a mix of Grade A and Grade B items, with more than 70% of the items being Grade A.' },
    { value: 'B', label: 'Grade B', icon: '👑', title: '100% Grade B', description: 'All items are Grade B — good condition with minor signs of wear.' },
    { value: 'B/C', label: 'Grade B/C', icon: '👑', title: '>50% Grade B', description: 'A mix of Grade B and Grade C items, with the majority being Grade B quality.' },
    { value: 'C', label: 'Grade C', icon: '👑', title: 'Grade C', description: 'Items may have visible wear, minor damage, or cosmetic imperfections. Budget-friendly.' },
    { value: 'A/B/C', label: 'Grade A/B/C', icon: '👑', title: '>30% Grade A', description: 'This bundle contains a mix of all three grades, with more than 30% of the items being Grade A. A detailed product description can highlight the mix of grades in the bundle.' },
];

// Waist sizes for jeans/denim
export const WAIST_SIZES = [
    '26', '27', '28', '29', '30', '31', '32', '33', '34',
    '36', '38', '40', '42', '44',
];

// Colors with hex values
export const COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Red', hex: '#E53E3E' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Navy', hex: '#1E3A5F' },
    { name: 'Green', hex: '#38A169' },
    { name: 'Grey', hex: '#A0AEC0' },
    { name: 'Brown', hex: '#8B5E3C' },
    { name: 'Beige', hex: '#D4C5A9' },
    { name: 'Pink', hex: '#ED64A6' },
    { name: 'Yellow', hex: '#ECC94B' },
    { name: 'Orange', hex: '#ED8936' },
    { name: 'Purple', hex: '#805AD5' },
    { name: 'Multi', hex: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)' },
];

// Materials / Fabrics
export const MATERIALS = [
    'Cotton', 'Polyester', 'Denim', 'Leather', 'Silk', 'Wool', 'Linen', 'Nylon', 'Fleece', 'Velvet', 'Corduroy', 'Mixed',
];

// Gender
export const GENDERS = [
    { value: 'men', label: 'Men' },
    { value: 'women', label: 'Women' },
    { value: 'unisex', label: 'Unisex' },
    { value: 'kids', label: 'Kids' },
];

// Seasons
export const SEASONS = [
    { value: 'spring-summer', label: 'Spring / Summer' },
    { value: 'fall-winter', label: 'Fall / Winter' },
    { value: 'all-season', label: 'All Season' },
];

// Subcategories mapped to parent category slugs
export const SUBCATEGORIES = {
    jeans: ['Slim Fit', 'Straight Leg', 'Baggy', 'Bootcut', 'Skinny', 'Cargo Denim', 'Selvedge', 'Raw Denim', 'Stonewash', 'Light Wash', 'Dark Wash'],
    levis: ["501 Original", "502 Taper", "505 Regular", "511 Slim", "512 Slim Taper", "514 Straight", "517 Bootcut", "527 Bootcut", "550 Relaxed", "569 Loose", "Boot Cut", "Orange Tab", "Red Tab"],
    'true-religion': ['Ricky', 'Bobby', 'Geno', 'Rocco', 'Joey', 'Billy', 'Straight', 'Slim', 'Bootcut', 'Skinny'],
    japanese: ['Selvedge Denim', 'Art Print', 'Oni Denim', 'Studio D\'Artisan', 'Samurai Jeans', 'Kapital', 'Evisu', 'Yoropiko', 'Embroidered'],
    shorts: ['Cargo Shorts', 'Denim Shorts', 'Basketball Shorts', 'Board Shorts', 'Chino Shorts', 'Track Shorts', 'Vintage Shorts'],
    'hip-hop': ['Hoodies', 'Graphic Tees', 'Baggy Jeans', 'Tracksuits', 'Bomber Jackets', 'Jerseys', 'Bucket Hats', 'Oversized'],
    outerwear: ['Jackets', 'Coats', 'Blazers', 'Vests', 'Puffer Jackets', 'Windbreakers', 'Parkas', 'Denim Jackets'],
    vintage: ['70s', '80s', '90s', '2000s', 'Retro', 'Heritage'],
    designer: ['Premium', 'Luxury', 'Limited Edition', 'Collaboration', 'Runway'],
    'bulk-deals': ['Mixed Bundle', 'Category Bundle', 'Brand Bundle', 'Mystery Box'],
};

// Popular tags for thrift / fashion
export const PRODUCT_TAGS = [
    'streetwear', 'y2k', 'grunge', 'minimalist', 'boho', 'retro', 'vintage',
    'oversized', 'slim-fit', 'casual', 'formal', 'athleisure', 'workwear',
    'sustainable', 'rare', 'limited', 'deadstock', 'designer', 'luxury', 'essentials',
];

// Product visibility options
export const VISIBILITY_OPTIONS = [
    { value: 'active', label: 'Active', icon: '●' },
    { value: 'draft', label: 'Draft', icon: '●' },
    { value: 'hidden', label: 'Hidden', icon: '●' },
];
