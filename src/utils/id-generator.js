/**
 * Membuat id unik, misalnya "task_3f9a1c2b7d4e".
 * Memakai crypto.randomUUID jika tersedia; jika tidak, jatuh ke Math.random.
 * @param {string} prefix awalan agar id mudah dikenali saat debugging
 */
export function generateId(prefix = 'id') {
  const cryptoApi = globalThis.crypto;
  const random =
    cryptoApi && typeof cryptoApi.randomUUID === 'function'
      ? cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14).padEnd(12, '0');
  return `${prefix}_${random}`;
}
