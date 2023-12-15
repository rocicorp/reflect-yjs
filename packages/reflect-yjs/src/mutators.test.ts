import {expect, test} from 'vitest';
import {parseKeyIntoClientIDs} from './mutators.js';

test('parseKeyIntoClientIDs', () => {
  // Mostly just sanity checking that the function is up to date with the
  // implementation.
  expect(parseKeyIntoClientIDs('', '')).toBeUndefined();
  expect(
    parseKeyIntoClientIDs(
      '-/p/ReflectClientID/yjs/awareness/name/yjsClientID',
      'name',
    ),
  ).toEqual(['ReflectClientID', 'yjsClientID']);
  expect(
    parseKeyIntoClientIDs(
      '-/p/ReflectClientID/yjs/awareness/name/yjsClientID',
      'x',
    ),
  ).toBeUndefined();
});
