const bcrypt = require("bcrypt");

// Google Sheets에 입력된 pin_hash_b64 값 (이미지에서 확인)
const pin_hash_b64 = "JDJiJDEwJGIzWjRkaUNrSGxpeFU3eTFnb3JaVE9mUkVCOGNNRDZ50E5MSWxGUDR5MzU2Nm1Wc2VMOFJD";

// 테스트할 PIN 번호
const testPin = "123456";

try {
  // base64 디코딩
  const hash = Buffer.from(pin_hash_b64, "base64").toString("utf8");
  console.log("Decoded hash:", hash);
  
  // PIN 비교
  const match = bcrypt.compareSync(testPin, hash);
  
  if (match) {
    console.log(`✅ SUCCESS: PIN ${testPin} matches the hash!`);
  } else {
    console.log(`❌ FAILED: PIN ${testPin} does NOT match the hash.`);
    console.log("\nPossible reasons:");
    console.log("1. The hash was generated with a different PIN");
    console.log("2. The hash value in Google Sheets is incorrect");
    console.log("3. The hash was corrupted during copy/paste");
  }
} catch (e) {
  console.error("Error:", e.message);
}
