import { createECDH, hkdfSync } from "node:crypto";

// Purpose-separated key material: no session secret is sent to a push provider.
// A stable shared SESSION_SECRET makes subscriptions survive server restarts.
// Rotation of that secret requires devices to register against the new key.
export function deriveStudyVapid(secret: string, subject = "https://ethiohudhud.com") {
  if (secret.length < 32) return null;
  const ecdh = createECDH("prime256v1");
  const key = Buffer.from(hkdfSync(
    "sha256", secret, "ethio-hudhud/study-notifications/v1", "vapid-signing-key", 32,
  ));
  try { ecdh.setPrivateKey(key); } catch { return null; }
  return {
    subject, publicKey: ecdh.getPublicKey().toString("base64url"),
    privateKey: key.toString("base64url"),
  };
}
export function studyVapidDetails() {
  return deriveStudyVapid(process.env.SESSION_SECRET ?? "");
}
export function studyWebConfig() {
  const details = studyVapidDetails();
  return { webConfigured: !!details, nativeConfigured: false, publicKey: details?.publicKey ?? null };
}
