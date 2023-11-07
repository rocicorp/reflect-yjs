/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Observable } from "lib0/observable";
import type * as Y from "yjs";
import { Reflect } from "@rocicorp/reflect/client";
import { ClientID, MutatorDefs } from "@rocicorp/reflect";
import { ClientState, listClientStates } from "./client-state";
const Y_PRESENCE_KEY = "__yjs";

type MetaClientState = {
  clock: number;
  lastUpdated: number;
};

export class Awareness<M extends MutatorDefs> extends Observable<unknown> {
  #reflect: Reflect<M>;
  #presentClientIDs: string[] = [];
  #clients: Record<ClientID, ClientState> = {};

  public doc: Y.Doc;
  public clientID: number;
  public states: Map<number, unknown> = new Map();
  // Meta is used to keep track and timeout users who disconnect. Reflect provides this for us, so we don't need to
  // manage it here. Unfortunately, it's expected to exist by various integrations, so it's an empty map.
  public meta: Map<number, MetaClientState> = new Map();
  // _checkInterval this would hold a timer to remove users, but Liveblock's presence already handles this
  // unfortunately it's typed by various integrations
  public _checkInterval: number = 0;
  handlePresenceChange = () => {
    const presentClients: Record<string, ClientState> = {};
    for (const presentClientID of this.#presentClientIDs) {
      const client = this.#clients[presentClientID];
      if (client) {
        presentClients[client.yjsClientID] = client;
      }
    }
    const prevPresentClients = presentClients;
    const adds: number[] = [];
    const removes: number[] = [];
    const updates: number[] = [];
    for (const clientID in prevPresentClients) {
      const client = prevPresentClients[clientID];
      const currClient = presentClients[clientID];
      if (currClient === undefined) {
        removes.push(client.yjsClientID);
      } else if (currClient !== client) {
        updates.push(client.yjsClientID);
      }
    }
    for (const clientID in presentClients) {
      if (prevPresentClients[clientID] === undefined) {
        adds.push(presentClients[clientID].yjsClientID);
      }
    }

    this.#clients = presentClients;

    if (adds.length || removes.length || updates.length) {
      // fire update and change events
    }
  };

  constructor(doc: Y.Doc, reflect: Reflect<M>) {
    super();
    this.doc = doc;
    this.#reflect = reflect;
    this.clientID = doc.clientID;
    this.#reflect.subscribeToPresence((clientIDs) => {
      this.#presentClientIDs = [...clientIDs];
      this.handlePresenceChange();
    });

    this.#reflect.subscribe(
      async (tx) => {
        var clientStates = await listClientStates(tx);
        return Object.fromEntries(clientStates.map((cs) => [cs.id, cs]));
      },
      (result) => {
        this.#clients = result;
        this.handlePresenceChange();
      }
    );
  }

  destroy(): void {
    this.emit("destroy", [this]);
    this.setLocalState(null);
    super.destroy();
  }

  //just get this clients clientdata
  getLocalState(): ClientState | null {
    return this.#clients[this.clientID];
  }

  setLocalState(state: ClientState | null): void {
    this.#reflect.    
  }

  setLocalStateField(field: string, value: Partial<ClientState>): void {

  }

  // Translate liveblocks presence to yjs awareness
  getStates(): Map<number, unknown> {
    return new Map();
    // const others = this.room.getOthers();
    // const states = others.reduce((acc: Map<number, unknown>, currentValue) => {
    //   if (currentValue.connectionId) {
    //     // connectionId == actorId == yjs.clientId
    //     acc.set(
    //       currentValue.connectionId,
    //       currentValue.presence[Y_PRESENCE_KEY] || {}
    //     );
    //   }
    //   return acc;
    // }, new Map());
    // return states;
  }
}
