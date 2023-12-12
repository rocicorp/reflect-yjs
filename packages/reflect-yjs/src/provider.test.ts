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
type ExperimentalWatch = Reflect<MutatorDefs>['experimentalWatch'];
type SubscribeToPresence = Reflect<MutatorDefs>['subscribeToPresence'];

class FakeReflect {
  subscribe: MockedFunction<Subscribe> = vi
    .fn()
    .mockReturnValue(() => undefined);
  experimentalWatch: MockedFunction<ExperimentalWatch> = vi
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
    test('watch at construction time', () => {
      const reflect = fakeReflect();
      new Provider(reflect, 'test', new Doc());
      expect(reflect.experimentalWatch).toHaveBeenCalledTimes(1);
    });
  });

  test('destroy unsubscribes', () => {
    const reflect = new FakeReflect();
    reflect.experimentalWatch.mockClear();
    const unwatch = vi.fn();
    reflect.experimentalWatch.mockImplementationOnce(() => unwatch);

    const p = new Provider(
      reflect as unknown as Reflect<Mutators>,
      'test',
      new Doc(),
    );

    p.destroy();
    expect(unwatch).toHaveBeenCalledTimes(1);
  });
});
