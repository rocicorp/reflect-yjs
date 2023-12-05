/* eslint-disable @typescript-eslint/ban-ts-comment */
import {expect, test, beforeEach, suite} from 'vitest';
import {Awareness} from './awareness.js';
import {resolver} from '@rocicorp/resolver';

import {Mutators, mutators} from './mutators.js';
import * as Y from 'yjs';

import * as t from 'lib0/testing.js';
import {Reflect} from '@rocicorp/reflect/client';

let aw1: Awareness;
let aw2: Awareness;

let doc1: Y.Doc;
let doc2: Y.Doc;

let reflect: Reflect<Mutators>;

beforeEach(() => {
  reflect = new Reflect<Mutators>({
    server: undefined,
    userID: '1',
    roomID: '1',
    mutators,
  });

  doc1 = new Y.Doc();
  doc1.clientID = 0;
  aw1 = new Awareness(reflect, 'testName', doc1);

  doc2 = new Y.Doc();
  doc2.clientID = 1;
  aw2 = new Awareness(reflect, 'testName', doc2);
});
suite('Awareness', () => {
  test('verify awareness changes are present multiple instances', async () => {
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
    t.compare(aw1.getStates(), aw2.getStates());
    t.compare(
      aw2.getStates(),
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
    t.compare(aw1.getStates(), aw2.getStates());
    t.compare(
      aw2.getStates(),
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
