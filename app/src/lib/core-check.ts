import { validate, canTransition } from "@bayanihan/core";
export const coreCheck = () => ({
  person: validate({ resourceType: "Person", id: "7b1e2c4a-9f1d-4c2e-8a3b-1d77e0c3a41d", meta: { version: 1 }, name: { text: "Mia", use: "nickname" } }).valid,
  lifecycle: canTransition("Task", "ready", "accepted"),
});
