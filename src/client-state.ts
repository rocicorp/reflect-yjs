// This file defines the ClientState entity that we use to track
// cursors. It also defines some basic CRUD functions using the
// @rocicorp/rails helper library.

import {Entity, generate} from '@rocicorp/rails';
import type {JSONObject, JSONValue, WriteTransaction} from '@rocicorp/reflect';

// ClientState is where we store the awareness state
export type ClientState = Entity & {
  // The yjsClientID is needed to map the state back to yjs
  yjsClientID: number;
  yjsAwarenessState: JSONObject;
};

const {
  get: getClientState,
  delete: deleteClientState,
  put: putClientState,
  update: updateClientState,
  list: listClientStates,
} = generate<ClientState>('client-state');

export {listClientStates};

export async function yjsSetLocalStateField(
  tx: WriteTransaction,
  args: {yjsClientID: number; field: string; value: JSONValue},
) {
  const clientState = await getClientState(tx, tx.clientID);
  if (clientState) {
    await updateClientState(tx, {
      id: clientState.id,
      yjsAwarenessState: {
        ...clientState.yjsAwarenessState,
        [args.field]: args.value,
      },
    });
  }
}

export async function yjsSetLocalState(
  tx: WriteTransaction,
  {
    yjsClientID,
    yjsAwarenessState,
  }: {yjsClientID: number; yjsAwarenessState: JSONObject | null},
) {
  if (yjsAwarenessState === null) {
    await deleteClientState(tx, tx.clientID);
  } else {
    await putClientState(tx, {id: tx.clientID, yjsClientID, yjsAwarenessState});
  }
}
