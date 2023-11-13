import {ClientID, JSONObject} from '@rocicorp/reflect';
import {Reflect} from '@rocicorp/reflect/client';
import {ObservableV2} from 'lib0/observable';
import type {Awareness as YJSAwareness} from 'y-protocols/awareness.js';
import type * as Y from 'yjs';
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

  #presentClientIDs: string[] = [];
  #clients: Record<ClientID, ClientState> = {};

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
      const client = this.#clients[presentClientID];
      if (client) {
        states.set(client.yjsClientID, client.yjsAwarenessState);
      }
    }

    const prevStates = this.states;
    const added: number[] = [];
    const removed: number[] = [];
    const updated: number[] = [];
    for (const [yjsClientID, client] of prevStates) {
      const currClient = states.get(yjsClientID);
      if (currClient === undefined) {
        removed.push(yjsClientID);
      } else if (currClient !== client) {
        updated.push(yjsClientID);
      }
    }
    for (const yjsClientID of states.keys()) {
      if (prevStates.get(yjsClientID) === undefined) {
        added.push(yjsClientID);
      }
    }
    this.states = states;

    if (added.length || removed.length || updated.length) {
      // TODO(arv): YJS Awareness checks for deep equality here. We should do the
      // same.
      // https://github.com/yjs/y-protocols/blob/a4dd5de756f1061eaca9c1b4ebb2013e74987a11/awareness.js#L131-L135
      this.emit('change', [{added, updated, removed}, 'local']);
      this.emit('update', [{added, updated, removed}, 'local']);
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
        return Object.fromEntries(clientStates.map(cs => [cs.id, cs]));
      },
      result => {
        this.#clients = result;
        this.#handlePresenceChange();
      },
    );

    this.#unsubscribe = () => {
      unsubscribeToPresence();
      unsubscribe();
    };
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
