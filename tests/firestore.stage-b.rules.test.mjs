import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-cyber-portfolio";
const projectData = {
  title: "Test",
  desc: "Test project",
  tech: "NEXT",
  image: "https://example.com/a.png",
  liveLink: "https://example.com",
  githubLink: "https://github.com",
  views: 0,
  liveClicks: 0,
  codeClicks: 0,
  reviews: [],
};
const bookingData = {
  type: "DIRECT_MESSAGE",
  createdAt: "2026-11-21T00:00:00.000Z",
  payload: { email: "visitor@example.com", message: "hello" },
};

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.stage-b.rules", "utf8"),
    },
  });
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe("Stage B rules (reference, not deployed)", () => {
  it("blocks all public project writes", async () => {
    const admin = testEnv.authenticatedContext("admin-uid", { admin: true }).firestore();
    const visitor = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(admin, "projects/stage-b-project"), projectData));
    await assertFails(updateDoc(doc(visitor, "projects/stage-b-project"), { views: 1 }));
    await assertFails(deleteDoc(doc(visitor, "projects/stage-b-project")));
  });

  it("still accepts well-formed bookings and hides them from visitors", async () => {
    const visitor = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(addDoc(collection(visitor, "bookings"), bookingData));
    await assertFails(getDocs(collection(visitor, "bookings")));
  });
});
