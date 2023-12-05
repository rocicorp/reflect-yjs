/* eslint-disable @typescript-eslint/ban-ts-comment */
import {expect, test, beforeEach, suite, afterEach} from 'vitest';
import {Awareness} from './awareness.js';
import {resolver} from '@rocicorp/resolver';

import {Mutators, mutators} from './mutators.js';
import * as Y from 'yjs';

import {Reflect} from '@rocicorp/reflect/client';

let reflect: Reflect<Mutators>;

beforeEach(() => {
  reflect = new Reflect<Mutators>({
    server: undefined,
    userID: '1',
    roomID: '1',
    mutators,
  });
});

afterEach(async () => {
  await reflect.close();
});

suite('Awareness', () => {
  test('verify awareness changes are present multiple instances', async () => {
    const doc1 = new Y.Doc();
    doc1.clientID = 0;
    const aw1 = new Awareness(reflect, 'testName', doc1);

    const doc2 = new Y.Doc();
    doc2.clientID = 1;
    const aw2 = new Awareness(reflect, 'testName', doc2);

    expect(aw1).to.be.an.instanceof(Awareness);

    const initialState = aw1.getLocalState();
    expect(initialState).to.deep.equal(null);

    const aw1changes: {
      added: number[];
      updated: number[];
      removed: number[];
    }[] = [];
    const aw1changeResolvers = [resolver<void>(), resolver<void>()];
    let aw1changecalls = 0;

    aw1.on('change', change => {
      aw1changes.push(change);
      aw1changeResolvers[aw1changecalls++].resolve();
    });
    const aw2changes: {
      added: number[];
      updated: number[];
      removed: number[];
    }[] = [];
    const aw2changeResolvers = [resolver<void>(), resolver<void>()];
    let aw2changecalls = 0;
    aw2.on('change', change => {
      aw2changes.push(change);
      aw2changeResolvers[aw2changecalls++].resolve();
    });

    await aw2changeResolvers[0].promise;
    expect(aw1.getStates()).toEqual(aw2.getStates());
    expect(aw2.getStates()).toEqual(
      new Map([
        [0, {}],
        [1, {}],
      ]),
    );

    expect(aw1changes).to.deep.equal(aw2changes);
    expect(aw2changes).to.deep.equal([
      {added: [0, 1], updated: [], removed: []},
    ]);

    aw1.setLocalState({x: 3});

    await aw2changeResolvers[1].promise;
    expect(aw1.getStates()).toEqual(aw2.getStates());
    expect(aw2.getStates()).toEqual(
      new Map([
        [0, {x: 3}],
        [1, {}],
      ]),
    );

    expect(aw1changes).to.deep.equal(aw2changes);
    expect(aw2changes).to.deep.equal([
      {added: [0, 1], updated: [], removed: []},
      {added: [], updated: [0], removed: []},
    ]);
  });
});
