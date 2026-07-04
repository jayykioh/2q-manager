const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function requireValidPublicKey() {
  const value = (
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
  ).trim();

  if (!value) {
    throw new Error("VAPID_PUBLIC_KEY is missing");
  }

  if (!BASE64URL_PATTERN.test(value)) {
    throw new Error("VAPID_PUBLIC_KEY must be an unquoted base64url value");
  }

  const decoded = decodeBase64Url(value);
  if (decoded.length !== 65 || decoded[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY is not a valid uncompressed P-256 public key");
  }

  return value;
}

function requireValidPrivateKey() {
  const value = (process.env.VAPID_PRIVATE_KEY || "").trim();

  if (!value) {
    throw new Error("VAPID_PRIVATE_KEY is missing");
  }

  if (!BASE64URL_PATTERN.test(value) || decodeBase64Url(value).length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY is invalid");
  }

  return value;
}

function requireValidSubject() {
  const value = (process.env.VAPID_SUBJECT || "").trim();

  if (!value || (!value.startsWith("mailto:") && !value.startsWith("https://"))) {
    throw new Error("VAPID_SUBJECT must start with mailto: or https://");
  }

  return value;
}

export function getVapidPublicKey() {
  return requireValidPublicKey();
}

export function getVapidDetails() {
  return {
    publicKey: requireValidPublicKey(),
    privateKey: requireValidPrivateKey(),
    subject: requireValidSubject(),
  };
}

