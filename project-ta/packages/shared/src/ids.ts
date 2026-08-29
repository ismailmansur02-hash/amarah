const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-safe, sortable-enough ids. No dependency needed. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}_${time}${rand}`;
}
