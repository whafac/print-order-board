const bcrypt = require("bcrypt");

// 새로 생성한 해시 (PIN 123456)
const newHashB64 = "JDJiJDEwJG1IdkV1enc5REVETnBDZ24vZVVTaU8wSFhQWlhYNXZPU2RCbWduSkVMdC9EeWpvZFl2V1JX";
const testPin = "123456";

const hash = Buffer.from(newHashB64, "base64").toString("utf8");
console.log("Decoded hash:", hash);
const match = bcrypt.compareSync(testPin, hash);
console.log(match ? "✅ SUCCESS: PIN matches!" : "❌ FAILED: PIN does not match");
