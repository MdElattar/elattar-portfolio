import admin from "firebase-admin";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin.mjs you@example.com");
  process.exit(1);
}

let serviceAccount;
try {
  if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  } else {
    const localPath = join(process.cwd(), "service-account.json");
    if (!existsSync(localPath)) throw new Error("service-account.json not found and FIREBASE_ADMIN_* env vars are missing.");
    serviceAccount = JSON.parse(readFileSync(localPath, "utf8"));
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

try {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    admin: true,
  });
  console.log(`admin claim set for ${user.uid} (${email}). Sign out and back in to refresh the token.`);
} catch (error) {
  console.error("Failed to set admin claim:", error.message);
  process.exit(1);
}
