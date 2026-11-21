import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin.mjs you@example.com");
  process.exit(1);
}

const envKeys = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];

function toServiceAccount(source, label) {
  const projectId = source.projectId ?? source.project_id;
  const clientEmail = source.clientEmail ?? source.client_email;
  const rawPrivateKey = source.privateKey ?? source.private_key;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(`Incomplete service account in ${label}.`);
  }

  const privateKey = String(rawPrivateKey).replace(/\\n/g, "\n").trim();
  if (!/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)) {
    throw new Error(`Invalid private key in ${label}.`);
  }

  return { projectId, clientEmail, privateKey };
}

function loadServiceAccount() {
  const providedEnvKeys = envKeys.filter((key) => process.env[key]);

  if (providedEnvKeys.length === envKeys.length) {
    return toServiceAccount(
      {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      },
      "FIREBASE_ADMIN_* environment variables",
    );
  }

  if (providedEnvKeys.length > 0) {
    const missing = envKeys.filter((key) => !process.env[key]).join(", ");
    throw new Error(`Missing ${missing}. Provide all FIREBASE_ADMIN_* variables or none.`);
  }

  const localPath = join(process.cwd(), "scripts", "service-account.json");
  if (!existsSync(localPath)) {
    throw new Error(
      "scripts/service-account.json not found and FIREBASE_ADMIN_* environment variables are missing.",
    );
  }

  return toServiceAccount(JSON.parse(readFileSync(localPath, "utf8")), localPath);
}

try {
  const serviceAccount = loadServiceAccount();

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  const auth = getAuth(getApp());
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    admin: true,
  });

  console.log(
    `admin claim set for ${user.uid} (${email}). Sign out and back in to refresh the token.`,
  );
} catch (error) {
  console.error("Failed to set admin claim:", error.message ?? error);
  process.exit(1);
}
