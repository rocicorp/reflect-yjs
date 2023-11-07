import { Observable } from "lib0/observable";
import type * as Y from "yjs";
import { Reflect } from "@rocicorp/reflect/client";
import { ClientID, JSONObject } from "@rocicorp/reflect";
import { ClientState, listClientStates } from "./client-state";
import { M } from "./mutators";

type MetaClientState = {
  clock: number;
  lastUpdated: number;
};

export class Awareness extends Observable<unknown> {
  #reflect: Reflect<M>;

  #presentClientIDs: string[] = [];
  #clients: Record<ClientID, ClientState> = {};

  public doc: Y.Doc;
  public clientID: number;
  public states: Map<number, JSONObject> = new Map();
  // Meta is used to keep track and timeout users who disconnect. Reflect provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  public meta: Map<number, MetaClientState> = new Map();
  // _checkInterval this would hold a timer to remove users, but Reflects presence already handles this
  // unfortunately it's typed by various integrations
  public _checkInterval: number = 0;
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
      this.emit("change", [{ added, updated, removed }, "local"]);
    }
  }
  #unsubscribe: () => void;
  constructor(doc: Y.Doc, reflect: Reflect<M>) {
    super();
    this.doc = doc;
    this.#reflect = reflect;
    this.clientID = doc.clientID;

    const unsubscribeToPresence = this.#reflect.subscribeToPresence(
      (clientIDs) => {
        this.#presentClientIDs = [...clientIDs];
        this.#handlePresenceChange();
      }
    );

    const unsubscribe = this.#reflect.subscribe(
      async (tx) => {
        var clientStates = await listClientStates(tx);
        return Object.fromEntries(clientStates.map((cs) => [cs.id, cs]));
      },
      (result) => {
        this.#clients = result;
        this.#handlePresenceChange();
      }
    );

    this.#unsubscribe = () => {
      unsubscribeToPresence();
      unsubscribe();
    };
  }

  destroy(): void {
    this.emit("destroy", [this]);
    this.setLocalState(null);
    this.#unsubscribe();
    super.destroy();
  }

  getLocalState(): JSONObject | null {
    return this.states.get(this.doc.clientID) ?? null;
  }

  setLocalState(state: JSONObject | null): void {
    if (state === null) {
      return;
    }
    this.#reflect.mutate.putYJSAwarenessState({ yjsAwarenessState: state });
  }

  setLocalStateField(field: string, value: JSONObject): void {
    this.#reflect.mutate.updateYJSAwarenessState({
      yjsAwarenessState: { [field]: value },
    });
  }

  getStates(): Map<number, JSONObject> {
    return this.states;
  }
}
