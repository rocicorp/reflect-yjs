// This file defines the ClientState entity that we use to track
// cursors. It also defines some basic CRUD functions using the
// @rocicorp/rails helper library.

import type { JSONObject, WriteTransaction } from "@rocicorp/reflect";
import { Entity, generate } from "@rocicorp/rails";

// ClientState is where we store the awareness state
export type ClientState = Entity & {
  userInfo: UserInfo;
  yjsClientID: number;
  yjsAwarenessState: JSONObject;
};

export type UserInfo = {
  name: string;
  avatar: string;
  color: string;
};

export {
  initClientState,
  listClientStates,
  randUserInfo,
  updateYJSAwarenessState,
  putYJSAwarenessState,
};

const {
  init: initImpl,
  get: getClientState,
  update: updateClientState,
  list: listClientStates,
} = generate<ClientState>("client-state");

async function updateYJSAwarenessState(
  tx: WriteTransaction,
  { yjsAwarenessState }: { yjsAwarenessState: JSONObject }
) {
  //get clientState
  const clientState = await getClientState(tx, tx.clientID);
  if (!clientState) {
    throw new Error("clientState not found");
  }
  await updateClientState(tx, {
    id: clientState.id,
    yjsAwarenessState: {
      ...clientState.yjsAwarenessState,
      ...yjsAwarenessState,
    },
  });
}

async function putYJSAwarenessState(
  tx: WriteTransaction,
  { yjsAwarenessState }: { yjsAwarenessState: JSONObject }
) {
  //get clientState
  const clientState = await getClientState(tx, tx.clientID);
  if (!clientState) {
    throw new Error("clientState not found");
  }
  await updateClientState(tx, { id: clientState.id, yjsAwarenessState });
}

function initClientState(
  tx: WriteTransaction,
  {
    userInfo,
    yjsClientID,
    yjsAwarenessState,
  }: { userInfo: UserInfo; yjsClientID: number; yjsAwarenessState: JSONObject }
) {
  return initImpl(tx, {
    id: tx.clientID,
    userInfo,
    yjsClientID,
    yjsAwarenessState,
  });
}

function randUserInfo(): UserInfo {
  const [avatar, name] = avatars[randInt(0, avatars.length - 1)];
  return {
    avatar,
    name,
    color: colors[randInt(0, colors.length - 1)],
  };
}

const colors = ["#f94144", "#f3722c", "#f8961e", "#f9844a", "#f9c74f"];
const avatars = [
  ["🐶", "Puppy"],
  ["🐱", "Kitty"],
  ["🐭", "Mouse"],
  ["🐹", "Hamster"],
  ["🐰", "Bunny"],
];

function randInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}
