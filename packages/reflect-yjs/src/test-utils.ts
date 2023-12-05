import type {Context, LogLevel, LogSink} from '@rocicorp/logger';
import {Resolver, resolver} from '@rocicorp/resolver';
import {
  Puller,
  Pusher,
  Reflect,
  ReflectOptions,
} from '@rocicorp/reflect/client';
import type {SinonFakeTimers} from 'sinon';
import {MutatorDefs} from '@rocicorp/reflect';

export function assert(b: unknown, msg = 'Assertion failed'): asserts b {
  if (!b) {
    throw new Error(msg);
  }
}

export async function tickAFewTimes(clock: SinonFakeTimers, duration = 100) {
  const n = 10;
  const t = Math.ceil(duration / n);
  for (let i = 0; i < n; i++) {
    await clock.tickAsync(t);
  }
}

export const enum ConnectionState {
  Disconnected,
  Connecting,
  Connected,
}

export const exposedToTestingSymbol = Symbol();
export const onSetConnectionStateSymbol = Symbol();
export const createLogOptionsSymbol = Symbol();

export type LogOptions = {
  readonly logLevel: LogLevel;
  readonly logSink: LogSink;
};

export type TestingContext = {
  puller: Puller;
  pusher: Pusher;
  setReload: (r: () => void) => void;
  logOptions: LogOptions;
  connectStart: () => number | undefined;
  socketResolver: () => Resolver<WebSocket>;
  connectionState: () => ConnectionState;
};

export class MockSocket extends EventTarget {
  readonly url: string | URL;
  protocol: string;
  messages: string[] = [];
  closed = false;
  onUpstream?: (message: string) => void;

  constructor(url: string | URL, protocol = '') {
    super();
    this.url = url;
    this.protocol = protocol;
  }

  send(message: string) {
    this.messages.push(message);
    this.onUpstream?.(message);
  }

  close() {
    this.closed = true;
    this.dispatchEvent(new CloseEvent('close'));
  }
}

export class TestReflect<MD extends MutatorDefs> extends Reflect<MD> {
  #connectionStateResolvers: Set<{
    state: ConnectionState;
    resolve: (state: ConnectionState) => void;
  }> = new Set();

  get connectionState() {
    assert(TESTING);
    return this[exposedToTestingSymbol].connectionState();
  }

  get connectionStateAsString(): string {
    switch (this.connectionState) {
      case ConnectionState.Disconnected:
        return 'Disconnected';
      case ConnectionState.Connecting:
        return 'Connecting';
      case ConnectionState.Connected:
        return 'Connected';
    }
    return 'Unknown';
  }

  get connectingStart() {
    return this[exposedToTestingSymbol].connectStart;
  }

  // Testing only hook
  [onSetConnectionStateSymbol](newState: ConnectionState) {
    for (const entry of this.#connectionStateResolvers) {
      const {state, resolve} = entry;
      if (state === newState) {
        this.#connectionStateResolvers.delete(entry);
        resolve(newState);
      }
    }
  }

  [createLogOptionsSymbol](options: {consoleLogLevel: LogLevel}): LogOptions {
    assert(TESTING);
    return {
      logLevel: options.consoleLogLevel,
      logSink: new TestLogSink(),
    };
  }

  get testLogSink(): TestLogSink {
    assert(TESTING);
    const {logSink} = this[exposedToTestingSymbol].logOptions;
    assert(logSink instanceof TestLogSink);
    return logSink;
  }

  waitForConnectionState(state: ConnectionState) {
    if (this.connectionState === state) {
      return Promise.resolve(state);
    }
    const {promise, resolve} = resolver<ConnectionState>();
    this.#connectionStateResolvers.add({state, resolve});
    return promise;
  }

  get socket(): Promise<MockSocket> {
    console.log(this[exposedToTestingSymbol]);
    return this[exposedToTestingSymbol].socketResolver()
      .promise as Promise<unknown> as Promise<MockSocket>;
  }

  async triggerMessage(data: unknown): Promise<void> {
    const socket = await this.socket;
    assert(!socket.closed);
    socket.dispatchEvent(
      new MessageEvent('message', {data: JSON.stringify(data)}),
    );
  }

  triggerConnected(): Promise<void> {
    const msg = ['connected', {wsid: 'wsidx'}];
    return this.triggerMessage(msg);
  }

  triggerPong(): Promise<void> {
    const msg = ['pong', {}];
    return this.triggerMessage(msg);
  }

  triggerPoke(pokeBody: unknown): Promise<void> {
    const msg = ['poke', pokeBody];
    return this.triggerMessage(msg);
  }

  triggerPullResponse(pullResponseBody: unknown): Promise<void> {
    const msg = ['pull', pullResponseBody];
    return this.triggerMessage(msg);
  }

  triggerError(kind: unknown, message: string): Promise<void> {
    const msg = ['error', kind, message];
    return this.triggerMessage(msg);
  }

  async triggerClose(): Promise<void> {
    const socket = await this.socket;
    socket.dispatchEvent(new CloseEvent('close'));
  }

  declare [exposedToTestingSymbol]: TestingContext;

  get pusher() {
    assert(TESTING);
    return this[exposedToTestingSymbol].pusher;
  }

  get puller() {
    assert(TESTING);
    return this[exposedToTestingSymbol].puller;
  }

  set reload(r: () => void) {
    assert(TESTING);
    this[exposedToTestingSymbol].setReload(r);
  }
}

declare const TESTING: boolean;

const testReflectInstances = new Set<TestReflect<MutatorDefs>>();

let testReflectCounter = 0;

export function reflectForTest<MD extends MutatorDefs>(
  options: Partial<ReflectOptions<MD>> = {},
): TestReflect<MD> {
  const r = new TestReflect({
    server: 'https://example.com/',
    // Make sure we do not reuse IDB instances between tests by default
    userID: 'test-user-id-' + testReflectCounter++,
    roomID: 'test-room-id',
    auth: 'test-auth',
    ...options,
  });
  // We do not want any unexpected onUpdateNeeded calls in tests. If the test
  // needs to call onUpdateNeeded it should set this as needed.
  r.onUpdateNeeded = () => {
    throw new Error('Unexpected update needed');
  };

  // Keep track of all instances so we can close them in teardown.
  testReflectInstances.add(r);
  return r;
}
// This file is imported in a worker and web-test-runner does not inject the
// teardown function there.
if (typeof teardown === 'function') {
  teardown(async () => {
    for (const r of testReflectInstances) {
      if (!r.closed) {
        await r.close();
        testReflectInstances.delete(r);
      }
    }
  });
}

export class TestLogSink implements LogSink {
  messages: [LogLevel, Context | undefined, unknown[]][] = [];
  flushCallCount = 0;

  log(level: LogLevel, context: Context | undefined, ...args: unknown[]): void {
    this.messages.push([level, context, args]);
  }

  flush() {
    this.flushCallCount++;
    return Promise.resolve();
  }
}

export async function waitForUpstreamMessage(
  r: TestReflect<MutatorDefs>,
  name: string,
  clock: SinonFakeTimers,
) {
  let gotMessage = false;
  (await r.socket).onUpstream = message => {
    const v = JSON.parse(message);
    if (v['kind'] === name) {
      gotMessage = true;
    }
  };
  for (;;) {
    await clock.tickAsync(100);
    if (gotMessage) {
      break;
    }
  }
}
