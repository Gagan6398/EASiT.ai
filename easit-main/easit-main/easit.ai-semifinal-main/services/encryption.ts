/**
 * EASIT.ai — End-to-End Encryption Service
 * 
 * Implements true E2E encryption using the Web Crypto API (built into browsers, free).
 * Conversations are encrypted with AES-GCM-256 BEFORE leaving the browser.
 * The encryption key lives ONLY in the user's localStorage.
 * Supabase only ever stores encrypted blobs.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const KEY_STORAGE_KEY = 'easit-e2e-key';

// ─── Key Management ───

/**
 * Generates a new AES-GCM-256 encryption key.
 */
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable (so we can save to localStorage)
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a base64 string for localStorage storage.
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/**
 * Imports a base64 string back into a CryptoKey.
 */
async function importKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Gets the user's encryption key from localStorage, or generates a new one.
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      return await importKey(stored);
    } catch {
      // Corrupted key — regenerate
      console.warn('[E2E] Stored key corrupted, generating new one');
    }
  }

  // Generate and store a new key
  const key = await generateKey();
  const exported = await exportKey(key);
  localStorage.setItem(KEY_STORAGE_KEY, exported);
  return key;
}

// ─── Encryption / Decryption ───

/**
 * Encrypts a plaintext string using AES-GCM-256.
 * Returns a base64-encoded string containing [IV (12 bytes) + ciphertext].
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Prepend IV to ciphertext so we can extract it during decryption
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded [IV + ciphertext] string back to plaintext.
 */
export async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ─── Conversation-Level Helpers ───

/**
 * Encrypts a conversation object for storage in Supabase.
 * Only the messages array is encrypted (title stays readable for sidebar display).
 */
export async function encryptConversation(
  messages: any[],
  key: CryptoKey
): Promise<string> {
  const json = JSON.stringify(messages);
  return encrypt(json, key);
}

/**
 * Decrypts a conversation's messages from Supabase.
 * Returns the parsed messages array.
 */
export async function decryptConversation(
  encryptedMessages: string,
  key: CryptoKey
): Promise<any[]> {
  try {
    const json = await decrypt(encryptedMessages, key);
    return JSON.parse(json);
  } catch {
    console.warn('[E2E] Failed to decrypt conversation — may be pre-encryption data');
    return [];
  }
}

/**
 * Checks if a messages field is encrypted (base64) or plaintext (JSON array).
 * Used for backwards compatibility with pre-encryption conversations.
 */
export function isEncrypted(messagesField: any): boolean {
  if (typeof messagesField === 'string') {
    // It's a base64 string = encrypted
    return true;
  }
  // It's a JSON array = unencrypted (old format)
  return false;
}
