import type {MutatorDefs, WriteTransaction} from '@rocicorp/reflect';
import type {Reflect} from '@rocicorp/reflect/client';
import {MockedFunction, afterEach, expect, suite, test, vi} from 'vitest';
import {Doc} from 'yjs';
import {
  Mutators,
  updateYJS,
  yjsSetLocalState,
  yjsSetLocalStateField,
} from './mutators.js';
import {Provider} from './provider.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedMutator<Fn extends (tx: WriteTransaction, ...args: any[]) => any> =
  MockedFunction<(arg: Parameters<Fn>[1]) => ReturnType<Fn>>;

type Subscribe = Reflect<MutatorDefs>['subscribe'];
type SubscribeToPresence = Reflect<MutatorDefs>['subscribeToPresence'];

class FakeReflect {
  subscribe: MockedFunction<Subscribe> = vi
    .fn()
    .mockReturnValue(() => undefined);
  subscribeToPresence: MockedFunction<SubscribeToPresence> = vi
    .fn()
    .mockReturnValue(() => undefined);
  mutate: {
    updateYJS: MockedMutator<typeof updateYJS>;
    yjsSetLocalStateField: MockedMutator<typeof yjsSetLocalStateField>;
    yjsSetLocalState: MockedMutator<typeof yjsSetLocalState>;
  } = {
    updateYJS: vi.fn(),
    yjsSetLocalStateField: vi.fn(),
    yjsSetLocalState: vi.fn(),
  };
}

function fakeReflect() {
  return new FakeReflect() as unknown as Reflect<Mutators>;
}

afterEach(() => {
  vi.resetAllMocks();
});

suite('Provider', () => {
  test('awareness getter returns same awareness if called multiple times', () => {
    const p = new Provider(fakeReflect(), 'test', new Doc());
    expect(p.awareness).toBe(p.awareness);
  });

  suite('constructor', () => {
    test('subscribes at construction time', () => {
      const reflect = fakeReflect();
      new Provider(reflect, 'test', new Doc());
      expect(reflect.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  test('destroy unsubscribes', () => {
    const reflect = new FakeReflect();
    reflect.subscribe.mockClear();
    const unsubscribe1 = vi.fn();
    const unsubscribe2 = vi.fn();
    reflect.subscribe
      .mockImplementationOnce(() => unsubscribe1)
      .mockImplementationOnce(() => unsubscribe2);

    const p = new Provider(
      reflect as unknown as Reflect<Mutators>,
      'test',
      new Doc(),
    );

    p.destroy();
    expect(unsubscribe1).toHaveBeenCalledTimes(1);
    expect(unsubscribe2).toHaveBeenCalledTimes(1);
  });
});
