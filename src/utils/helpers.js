/**
 * Utility functions for the Second Thrift application
 */

// Format price in EUR
export const formatPrice = (price) => {
    if (price === undefined || price === null) return '';
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false
    }).format(price);
    return `${formattedNumber} €`;
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

// Calculate order totals — admin price is final, no add-ons
export const calculateOrderTotals = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal: total, shipping: 0, tax: 0, total };
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
    return /youtube\.com|youtu\.be/.test(url);
};

// Extract YouTube video ID
export const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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
    'Nike', 'Adidas', 'Zara', 'H&M', "Levi's", 'Gucci', 'Prada', 'Ralph Lauren',
    'Tommy Hilfiger', 'Calvin Klein', 'Versace', 'Burberry', 'Louis Vuitton', 'Balenciaga',
    'The North Face', 'Patagonia', 'Carhartt', 'Champion', 'New Balance', 'Puma',
    'Reebok', 'Converse', 'Vans', 'Fila', 'Stussy', 'Supreme', 'Off-White',
    'Diesel', 'Hugo Boss', 'Lacoste', 'Uniqlo', 'GAP', 'Mango', 'Evisu',
    'Unbranded', 'Other',
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
    tops: ['T-Shirts', 'Shirts', 'Polos', 'Blouses', 'Sweaters', 'Hoodies', 'Tank Tops', 'Crop Tops'],
    bottoms: ['Jeans', 'Trousers', 'Shorts', 'Joggers', 'Skirts', 'Cargo Pants', 'Chinos'],
    outerwear: ['Jackets', 'Coats', 'Blazers', 'Vests', 'Puffer Jackets', 'Windbreakers', 'Parkas'],
    dresses: ['Casual', 'Formal', 'Maxi', 'Mini', 'Midi', 'Party', 'Bodycon'],
    activewear: ['Sportswear', 'Tracksuits', 'Yoga', 'Gym Wear', 'Running', 'Compression'],
    accessories: ['Bags', 'Belts', 'Scarves', 'Hats', 'Watches', 'Sunglasses', 'Jewellery', 'Wallets'],
    footwear: ['Sneakers', 'Boots', 'Sandals', 'Loafers', 'Heels', 'Slides', 'Formal Shoes'],
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
