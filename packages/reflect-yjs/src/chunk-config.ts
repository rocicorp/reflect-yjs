import * as base64 from 'base64-js';

export const AVG_CHUNK_SIZE_B = 1024;
export const MIN_CHUNK_SIZE_B = 256;
export const MAX_CHUNK_SIZE_B = 2048;

export const hashFn = async (chunk: Uint8Array) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
  // Truncate the sha-256 hash from 32 bytes to 9 bytes.  This gives us
  // plenty of collision resistance for the range of expected document sizes.
  // If we assume a max document size of 100MB, the probability of having a
  // hash collision in a document of this size is roughly 1 in a trillion
  // (based on the approximation function p(n) = n^2 / (2H)
  // from
  // https://en.wikipedia.org/wiki/Birthday_attack#Simple_approximation),
  // where p(n) is probability of collision, n is number of hashes, and H
  // is number of possible hash outputs.  For 100MB document we have
  // n = 100,000 (100,000 1KB chunks) and H = 2^(8*9),
  // p(100,000) = (100,000^2 / (2*2^72)) = 1.0587912e-12
  //
  // In base64 9 bytes will encode to 12 chars with no padding (all chars
  // contain information).
  return base64.fromByteArray(new Uint8Array(hashBuffer.slice(0, 9)));
};
