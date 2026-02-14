const bcrypt = require("bcrypt");

const pin = process.argv[2];
if (!pin || !/^\d{6}$/.test(pin)) {
  console.error("Usage: node scripts/gen-pin-hash.js <6자리 PIN>");
  process.exit(1);
}

const hash = bcrypt.hashSync(pin, 10);
const b64 = Buffer.from(hash, "utf8").toString("base64");
console.log("TEAM_PIN_HASH=" + hash);
console.log("# .env에서 $ 문자가 깨지면 아래 사용:");
console.log("TEAM_PIN_HASH_B64=" + b64);