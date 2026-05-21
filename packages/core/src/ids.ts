const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

export function createId(prefix: string): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject && "randomUUID" in cryptoObject) {
    return `${prefix}_${cryptoObject.randomUUID().replaceAll("-", "")}`;
  }

  let value = "";
  for (let index = 0; index < 20; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}_${value}`;
}

export function now(): number {
  return Date.now();
}
