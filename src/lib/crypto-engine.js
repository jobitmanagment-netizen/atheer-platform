/**
 * CCS Technology — Atheer Frontend Cryptographic Engine
 * Military-grade browser-side cryptography via Web Crypto API
 * Developed by Jihad Ahmad Obeid for CCS Technology
 *
 * Algorithms: AES-256-GCM, SHA-512, HMAC-SHA512, PBKDF2 (600K iterations)
 */

// ── SHA-512 ─────────────────────────────────────────────────────────────────
export async function sha512(message) {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── SHA-256 (kept for backward compat) ──────────────────────────────────────
export async function sha256(message) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── HMAC-SHA512 ─────────────────────────────────────────────────────────────
export async function hmacSHA512(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── HMAC-SHA256 ─────────────────────────────────────────────────────────────
export async function hmacSHA256(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── AES-256-GCM Encryption (client-side, session key) ───────────────────────
export async function encryptAES256(plaintext, passphrase) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-512' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
  );
  const ctBytes = new Uint8Array(encrypted);
  return {
    ciphertext: btoa(String.fromCharCode(...ctBytes)),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    algorithm: 'AES-256-GCM + PBKDF2-SHA512 (100K iterations)',
  };
}

export async function decryptAES256(ciphertextB64, ivB64, saltB64, passphrase) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-512' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const ctBytes = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ctBytes
  );
  return new TextDecoder().decode(decrypted);
}

// ── PBKDF2 Key Derivation ───────────────────────────────────────────────────
export async function deriveKeyPBKDF2(password, salt, iterations = 100000) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-512' },
    keyMaterial, 512
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Secure Random Generation ─────────────────────────────────────────────────
export function generateSecureToken(bytes = 32) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUIDv4() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ── Entropy Calculation ─────────────────────────────────────────────────────
export function calcEntropy(str) {
  if (!str) return 0;
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  const n = str.length;
  return -Object.values(freq).reduce((s, f) => {
    const p = f / n;
    return s + p * Math.log2(p);
  }, 0);
}

// ── Password Strength Assessment ────────────────────────────────────────────
export function assessPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: '#848E9C' };
  let score = 0;
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 15;
  if (password.length >= 24) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 32) score += 5;
  score = Math.min(score, 100);
  const label = score >= 90 ? 'Military Grade' : score >= 70 ? 'Very Strong' : score >= 50 ? 'Strong' : score >= 30 ? 'Moderate' : 'Weak';
  const color = score >= 90 ? '#03A66D' : score >= 70 ? '#03A66D' : score >= 50 ? '#F0B90B' : score >= 30 ? '#FF7A00' : '#CF304A';
  return { score, label, color };
}