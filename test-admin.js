import { chromium } from 'playwright';

const products = [
    { name: 'Vintage Olive Cargo Pants', desc: 'Baggy streetwear cargo pants, olive green', price: '65', cat: 'bottoms', cond: 'fair', gender: 'unisex', file: 'product_cargo_pants_1772983845014.png' },
    { name: 'Oversized Grey Vintage Hoodie', desc: 'Zip-up oversized hoodie, grey', price: '55', cat: 'tops', cond: 'good', gender: 'unisex', file: 'product_hoodie_1772983866558.png' },
    { name: 'Bright Orange Fisherman Beanie', desc: 'Fisherman beanie hat, bright orange', price: '15', cat: 'accessories', cond: 'new', gender: 'unisex', file: 'product_beanie_1772983888310.png' },
    { name: 'Vintage 501 Light Wash Jeans', desc: 'Light wash blue denim jeans', price: '95', cat: 'bottoms', cond: 'good', gender: 'unisex', file: 'product_jeans_1772983909216.png' },
    { name: 'Black Utility Techwear Bag', desc: 'Crossbody bag with multiple zippers', price: '35', cat: 'accessories', cond: 'new', gender: 'unisex', file: 'product_crossbody_bag_1772983928784.png' },
    { name: 'Retro 90s Colorblock Windbreaker', desc: 'Neon purple and teal windbreaker jacket', price: '75', cat: 'outerwear', cond: 'good', gender: 'unisex', file: 'product_windbreaker_1772983957504.png' },
    { name: 'Vintage Cyberpunk Matrix Sunglasses', desc: 'Rectangular black frames, dark lenses', price: '45', cat: 'accessories', cond: 'new', gender: 'unisex', file: 'product_sunglasses_1772983978407.png' }
];

(async () => {
    console.log('Starting Playwright...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // Listen for failed network requests that might indicate Firebase Storage errors
    page.on('response', resp => {
        if (resp.status() >= 400 && resp.url().includes('firebasestorage')) {
            console.log(`FIREBASE STORAGE HTTP ERROR: ${resp.status()} ${resp.url()}`);
        }
    });

    await page.goto('https://secondthrift.vercel.app/admin/login');

    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', 'secondthriftt.1@gmail.com');
    await page.fill('input[type="password"]', 'Second@Thrift9909');
    await page.click('button:has-text("Sign In")');

    await page.waitForTimeout(3000);
    // Find link or button with text Products
    await page.click('text="Products"');
    await page.waitForTimeout(2000);

    for (const p of products) {
        console.log(`Adding ${p.name}...`);
        await page.click('button:has-text("Add Product"):not(.btn-lg)');
        await page.waitForTimeout(1000);

        // Product Name *
        await page.waitForSelector('input[placeholder="e.g. Nike Air Max 90 Vintage"]');
        await page.fill('input[placeholder="e.g. Nike Air Max 90 Vintage"]', p.name);
        // Description
        await page.fill('textarea[placeholder*="Describe the product"]', p.desc);
        // Price
        // Using locator to get the first input that matches (the price field)
        const inputs = await page.$$('input[placeholder="0.00"]');
        if (inputs.length > 0) {
            await inputs[0].fill(p.price); // Final price
        }

        // Category - select by checking all selects and finding the one with specific options
        await page.evaluate(({ cat, cond, gender }) => {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const select of selects) {
                if (select.innerHTML.includes('tops')) select.value = cat;
                if (select.innerHTML.includes('Like New')) select.value = cond;
                if (select.innerHTML.includes('Men')) select.value = gender;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, { cat: p.cat, cond: p.cond, gender: p.gender });

        // Upload media
        const filePath = `C:\\Users\\ANIL GOVINDLAL\\.gemini\\antigravity\\brain\\c8fd0ec0-c070-4d8d-a828-783598a02bae\\${p.file}`;
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for preview to show up
        await page.waitForSelector('.ap-media-preview', { timeout: 5000 }).catch(() => console.log('Preview did not appear'));

        // Important: Wait enough time to ensure Firebase Storage upload starts when clicking save
        // ONLY click the button with .btn-lg (the form submit button)
        await page.click('button.btn-lg:has-text("Add Product")');

        // Wait for the popup to close by checking if the button disappears
        await page.waitForSelector('button.btn-lg:has-text("Add Product")', { state: 'hidden', timeout: 30000 }).catch(() => console.log('Form did not close!'));
        console.log(`Finished ${p.name}`);
    }

    console.log('All products added successfully!');
    await browser.close();
})();
