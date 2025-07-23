// Test URL encoding/decoding of waitlistId
const waitlistId = "gin#2025-07-22#19:30#BB1 House 1";
const encoded = encodeURIComponent(waitlistId);
const decoded = decodeURIComponent(encoded);

console.log("Original waitlistId:", waitlistId);
console.log("URL encoded:", encoded);
console.log("URL decoded:", decoded);
console.log("Does decoding match original?", decoded === waitlistId);

// Test the problematic case from the database
const problematicEncoded = "gin%232025-07-22%2319:30%23BB1%20House%201";
const problematicDecoded = decodeURIComponent(problematicEncoded);
console.log("\nProblematic case:");
console.log("Encoded from database:", problematicEncoded);
console.log("Decoded:", problematicDecoded);
console.log("Does it match original?", problematicDecoded === waitlistId);