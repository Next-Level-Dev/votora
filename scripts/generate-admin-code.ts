import crypto from 'crypto';

const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
const randomNum = Math.floor(1000 + Math.random() * 9000);
const suggestedCode = `ADMIN-${randomHex}-${randomNum}`;

console.log('\n===========================================');
console.log('   VOTORA - ADMIN CODE GENERATOR');
console.log('===========================================\n');
console.log(`Generated Admin Code: ${suggestedCode}\n`);
console.log('How to use this code:');
console.log('1. Open or create your .env file in the root directory.');
console.log('2. Set the ADMIN_CODE variable:');
console.log(`   ADMIN_CODE="${suggestedCode}"\n`);
console.log('3. Restart the server (npm run dev or npm start).');
console.log('   The database will automatically sync this as your admin code.\n');
console.log('Production Note:');
console.log('  In production (NODE_ENV=production), fast demo login');
console.log('  buttons on the login page are automatically hidden for security.');
console.log('===========================================\n');
