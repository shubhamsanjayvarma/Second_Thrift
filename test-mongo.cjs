const mongoose = require('mongoose');

// The connection string provided by the user
const mongoURI = 'mongodb+srv://tsec704_db_user:RTMk1ywdz9EDhMub@secondthrift.hrwcuwm.mongodb.net/?appName=SecondThrift';

console.log('🔄 Checking MongoDB connection...');
console.log('   (This will take up to 10 seconds. If it times out or fails, your IP is blocked!)');

// 10 second timeout for quick testing
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        console.log('\n✅ SUCCESS! MongoDB Atlas accepted the connection!');
        console.log('   Your IP is whitelisted perfectly.\n');
        console.log('   Now simply run: node server.js');
        process.exit(0);
    })
    .catch((err) => {
        console.log('\n❌ FAILED! Connection blocked by your Network or MongoDB Atlas.');
        console.error('ERROR MESSAGE:', err.message);
        console.log('\n======================================================');
        console.log('WHY THIS FAILED & HOW TO FIX IT:');
        console.log('1. Go to your MongoDB Atlas Dashboard (cloud.mongodb.com)');
        console.log('2. Click "Network Access" on the left menu.');
        console.log('3. Click the green "+ ADD IP ADDRESS" button.');
        console.log('4. Click "ALLOW ACCESS FROM ANYWHERE" (it will say 0.0.0.0/0).');
        console.log('5. Click Confirm, wait 1 minute, and run this file again:');
        console.log('   node test-mongo.js');
        console.log('======================================================\n');
        console.log('NOTE: If you already did this and it still fails, your school/office WiFi is completely blocking Port 27017 (MongoDB). In that case, you CANNOT use MongoDB on this WiFi, and you MUST revert to Firebase Storage.\n');
        process.exit(1);
    });
