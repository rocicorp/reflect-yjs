/* eslint-disable @typescript-eslint/ban-ts-comment */
import {expect} from 'chai';
import {Awareness} from './awareness.js';
import {
  ConnectionState,
  MockSocket,
  TestReflect,
  reflectForTest,
  tickAFewTimes,
} from './test-utils.js';
import {
  updateYJS,
  yjsSetLocalState,
  yjsSetLocalStateField,
  Mutators,
} from './mutators.js';
import * as Y from 'yjs';
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness.js';
import * as t from 'lib0/testing.js';
import * as sinon from 'sinon';

let aw1: Awareness;
let aw2: Awareness;

let mockReflect: TestReflect<Mutators>;
let doc1: Y.Doc;
let doc2: Y.Doc;

let clock: sinon.SinonFakeTimers;
const startTime = 1678829450000;

setup(async () => {
  clock = sinon.useFakeTimers();
  clock.setSystemTime(startTime);
  sinon.replace(
    globalThis,
    'WebSocket',
    MockSocket as unknown as typeof WebSocket,
  );
  mockReflect = reflectForTest({
    mutators: {
      yjsSetLocalStateField,
      yjsSetLocalState,
      updateYJS,
    },
  });
  console.log(clock.now);
  await mockReflect.triggerConnected();
  await mockReflect.waitForConnectionState(ConnectionState.Connected);
  // await clock.tickAsync(0);
  // await tickAFewTimes(clock);
  expect(mockReflect.online).true;
  doc1 = new Y.Doc();
  aw1 = new Awareness(mockReflect, 'testName', doc1);

  doc2 = new Y.Doc();
  aw2 = new Awareness(mockReflect, 'testName', doc2);
});

teardown(() => {});

test('Awareness', () => {
  expect(aw1).to.be.an.instanceof(Awareness);

  // Check initial state
  const initialState = aw1.getLocalState();
  expect(initialState).to.deep.equal(null);

  console.log('aw1.getLocalState()', aw1.getLocalState());
  aw1.setLocalStateField('user', {
    avatar: 'random-avatar.png',
    name: 'Test User',
    color: '#000000',
  });

  const doc1 = new Y.Doc();
  doc1.clientID = 0;
  const doc2 = new Y.Doc();
  doc2.clientID = 1;
  aw1.on('update', ({added, updated, removed}) => {
    const enc = encodeAwarenessUpdate(
      aw1,
      added.concat(updated).concat(removed),
    );
    applyAwarenessUpdate(aw2, enc, 'custom');
  });
  let lastChangeLocal = null;
  aw1.on('change', change => {
    lastChangeLocal = change;
  });
  let lastChange = null;
  aw2.on('change', change => {
    lastChange = change;
  });
  aw1.setLocalState({x: 3});
  console.log('aw1.getStates()', aw1.getStates());
  console.log('aw2.getStates()', aw2.getStates());
  t.compare(aw2.getStates().get(0), {x: 3});
  if (aw2.meta.get(0) !== undefined) {
    //@ts-ignore
    t.assert(aw2.meta.get(0).clock === 1);
  }
  if (lastChange !== null) {
    //@ts-ignore
    t.compare(lastChange.added, [0]);
  }
  // When creating an Awareness instance, the the local client is already marked as available, so it is not updated.
  t.compare(lastChangeLocal, {added: [], updated: [0], removed: []});
});
