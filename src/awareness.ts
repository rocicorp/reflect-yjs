import {ClientID, JSONObject} from '@rocicorp/reflect';
import {Reflect} from '@rocicorp/reflect/client';
import {ObservableV2} from 'lib0/observable';
import type {Awareness as YJSAwareness} from 'y-protocols/awareness.js';
import type * as Y from 'yjs';
import * as f from 'lib0/function';
import {
  ClientState,
  listClientStates,
  yjsSetLocalState,
  yjsSetLocalStateField,
} from './client-state';

type MetaClientState = {
  clock: number;
  lastUpdated: number;
};

type Events = {
  destroy: (o: Awareness) => unknown;
  change: (
    args: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    x: 'local',
  ) => unknown;
  update: (
    args: {
      added: number[];
      updated: number[];
      removed: number[];
    },
    x: 'local',
  ) => unknown;
};

export type AwarenessMutators = {
  yjsSetLocalState: typeof yjsSetLocalState;
  yjsSetLocalStateField: typeof yjsSetLocalStateField;
};

export const awarenessMutators: AwarenessMutators = {
  yjsSetLocalState,
  yjsSetLocalStateField,
};

export class Awareness extends ObservableV2<Events> implements YJSAwareness {
  #reflect: Reflect<AwarenessMutators>;

  #presentClientIDs: readonly string[] = [];
  #clients: ReadonlyMap<ClientID, ClientState> = new Map();

  doc: Y.Doc;
  clientID: number;
  states: Map<number, JSONObject> = new Map();

  // Meta is used to keep track and timeout users who disconnect. Reflect provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  meta: Map<number, MetaClientState> = new Map();

  // _checkInterval this would hold a timer to remove users, but Reflects presence already handles this
  // unfortunately it's typed by various integrations
  _checkInterval: number = 0;

  #handlePresenceChange() {
    const states: Map<number, JSONObject> = new Map();

    for (const presentClientID of this.#presentClientIDs) {
      const client = this.#clients.get(presentClientID);
      if (client) {
        states.set(client.yjsClientID, client.yjsAwarenessState);
      }
    }

    const prevStates = this.states;
    const added: number[] = [];
    const removed: number[] = [];
    const changed: number[] = [];
    for (const [yjsClientID, state] of prevStates) {
      const currState = states.get(yjsClientID);
      if (currState === undefined) {
        removed.push(yjsClientID);
      } else if (currState !== state || !f.equalityDeep(currState, state)) {
        changed.push(yjsClientID);
      }
    }
    for (const yjsClientID of states.keys()) {
      if (prevStates.get(yjsClientID) === undefined) {
        added.push(yjsClientID);
      }
    }
    this.states = states;

    if (added.length || removed.length || changed.length) {
      this.emit('change', [{added, updated: changed, removed}, 'local']);
      // NOTE: with reflect we can't tell if something was set to the same value
      // because we do not propogate non changes, therefore we don't need to ever call 'update'
      // this.emit('update', [{added, updated, removed}, 'local']);
    }
  }

  readonly #unsubscribe: () => void;

  constructor(doc: Y.Doc, reflect: Reflect<AwarenessMutators>) {
    super();
    this.doc = doc;
    this.#reflect = reflect;
    this.clientID = doc.clientID;

    const unsubscribeToPresence = this.#reflect.subscribeToPresence(
      clientIDs => {
        this.#presentClientIDs = [...clientIDs];
        this.#handlePresenceChange();
      },
    );

    const unsubscribe = this.#reflect.subscribe(
      async tx => {
        var clientStates = await listClientStates(tx);
        return clientStates.map(cs => [cs.id, cs] as const);
      },
      entries => {
        this.#clients = new Map(entries);
        this.#handlePresenceChange();
      },
    );

    this.#unsubscribe = () => {
      unsubscribeToPresence();
      unsubscribe();
    };

    this.setLocalState({});
  }

  destroy(): void {
    this.emit('destroy', [this]);
    this.setLocalState(null);
    this.#unsubscribe();
    super.destroy();
  }

  getLocalState(): JSONObject | null {
    return this.states.get(this.doc.clientID) ?? null;
  }

  setLocalState(state: JSONObject | null): void {
    this.#reflect.mutate.yjsSetLocalState({
      yjsClientID: this.doc.clientID,
      yjsAwarenessState: state,
    });
  }

  setLocalStateField(field: string, value: JSONObject): void {
    this.#reflect.mutate.yjsSetLocalStateField({
      yjsClientID: this.doc.clientID,
      field,
      value,
    });
  }

  getStates(): Map<number, JSONObject> {
    return this.states;
  }
}
