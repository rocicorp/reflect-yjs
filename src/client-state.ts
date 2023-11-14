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

export type UserInfo = {
  name: string;
  avatar: string;
  color: string;
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
  let clientState = await getClientState(tx, tx.clientID);
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

export function randUserInfo(): UserInfo {
  const [avatar, name] = avatars[randInt(0, avatars.length - 1)];
  return {
    avatar,
    name,
    color: colors[randInt(0, colors.length - 1)],
  };
}

const colors = ['#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f'];
const avatars = [
  ['🐶', 'Puppy'],
  ['🐱', 'Kitty'],
  ['🐭', 'Mouse'],
  ['🐹', 'Hamster'],
  ['🐰', 'Bunny'],
];

function randInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}
