import {expect, suite, test} from 'vitest';
import {chunk, unchunk} from './chunk.js';
import {TEST_TEXT_LEAR} from './chunk-test-text-lear.js';
import {TEST_TEXT_MOBY_DICK} from './chunk-test-text-moby-dick.js';

suite('chunk', () => {
  test('chunk is pure', async () => {
    const source = new TextEncoder().encode(TEST_TEXT_LEAR);
    const {
      chunksByHash: chunksByHash1,
      sourceAsChunkHashes: sourceAsChunkHashes1,
    } = await chunk(Math.pow(2, 10), Math.pow(2, 9), Math.pow(2, 11), source);

    const {
      chunksByHash: chunksByHash2,
      sourceAsChunkHashes: sourceAsChunkHashes2,
    } = await chunk(Math.pow(2, 10), Math.pow(2, 9), Math.pow(2, 11), source);

    expect(chunksByHash1).toEqual(chunksByHash2);
    expect(sourceAsChunkHashes1).toEqual(sourceAsChunkHashes2);
  });

  suite('roundtrip with size checks', () => {
    async function testRoundTrip(
      text: string,
      avg: number,
      min: number,
      max: number,
    ) {
      const source = new TextEncoder().encode(text);
      const {chunksByHash, sourceAsChunkHashes} = await chunk(
        avg,
        min,
        max,
        source,
      );

      let totalExcludingLast = 0;
      const chunks = [...chunksByHash.values()];
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const chunkLength = c.length;
        if (i !== chunks.length - 1) {
          totalExcludingLast += chunkLength;
          expect(chunkLength).toBeGreaterThanOrEqual(min);
        }
        expect(chunkLength).toBeLessThanOrEqual(max);
      }
      if (chunks.length > 1) {
        const avgExcludingLast = totalExcludingLast / (chunks.length - 1);
        expect(avgExcludingLast).toBeGreaterThan(avg * 0.8);
        expect(avgExcludingLast).toBeLessThan(avg * 1.2);
      }

      const unchunked = unchunk(
        chunksByHash,
        sourceAsChunkHashes,
        source.length,
      );
      const decoded = new TextDecoder().decode(unchunked);
      expect(decoded).toEqual(text);
    }

    const sizes = [Math.pow(2, 10), 15_000, Math.pow(2, 15), Math.pow(2, 20)];
    for (const text of [TEST_TEXT_LEAR, TEST_TEXT_MOBY_DICK])
      for (const size of sizes) {
        test(`round trip avg size ${size}`, () =>
          testRoundTrip(text, size, Math.floor(size / 2), size * 2));
      }
  });
});
