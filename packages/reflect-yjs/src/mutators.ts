import type {
  ClientID,
  ReadTransaction,
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  WriteTransaction,
} from '@rocicorp/reflect';
import * as base64 from 'base64-js';
import * as Y from 'yjs';

export const mutators = {
  yjsSetLocalStateField,
  yjsSetLocalState,
  updateYJS,
};

export type Mutators = typeof mutators;

export async function updateYJS(
  tx: WriteTransaction,
  {name, update}: {name: string; update: string},
) {
  const existing = await tx.get<string>(yjsProviderServerKey(name));
  const getKeyToSet =
    tx.location === 'client' ? yjsProviderClientKey : yjsProviderServerKey;
  if (!existing) {
    await tx.set(getKeyToSet(name), update);
  } else {
    const updates = [base64.toByteArray(existing), base64.toByteArray(update)];
    const merged = Y.mergeUpdatesV2(updates);
    await tx.set(getKeyToSet(name), base64.fromByteArray(merged));
  }
}

export function yjsProviderClientKey(name: string): string {
  return `yjs/provider/client/${name}`;
}

export function yjsProviderServerKey(name: string): string {
  return `yjs/provider/server/${name}`;
}

export function yjsAwarenessKey(
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
): string {
  // -c/${reflectClientID} is a client key space and these are ephemeral. They
  // get deleted when Reflect knows that the client can never come back.
  return `-/c/${reflectClientID}/yjs/awareness/${name}/${yjsClientID}`;
}

function parseKeyIntoClientIDs(
  key: string,
  name: string,
): undefined | [ClientID, string] {
  // `-/c/${reflectClientID}/yjs/awareness/${name}/${yjsClientID}`;
  //  0/1/2                 /3  /4        /5      /6
  const parts = key.split('/');
  if (
    parts[0] !== '-' ||
    parts[1] !== 'c' ||
    parts[3] !== 'yjs' ||
    parts[4] !== 'awareness' ||
    parts[5] !== name
  ) {
    return undefined;
  }
  return [parts[2], parts[6]];
}

export async function yjsSetLocalStateField(
  tx: WriteTransaction,
  {
    name,
    yjsClientID,
    field,
    value,
  }: {
    name: string;
    yjsClientID: number;
    field: string;
    value: ReadonlyJSONValue;
  },
) {
  const clientState = await getClientState(tx, name, tx.clientID, yjsClientID);
  if (clientState) {
    await putClientState(tx, name, tx.clientID, yjsClientID, {
      ...(clientState as object),
      [field]: value,
    });
  }
}

export async function yjsSetLocalState(
  tx: WriteTransaction,
  {
    name,
    yjsClientID,
    yjsAwarenessState,
  }: {
    name: string;
    yjsClientID: number;
    yjsAwarenessState: ReadonlyJSONObject | null;
  },
) {
  if (yjsAwarenessState === null) {
    await deleteClientState(tx, name, tx.clientID, yjsClientID);
  } else {
    await putClientState(tx, name, tx.clientID, yjsClientID, yjsAwarenessState);
  }
}

function deleteClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
) {
  return tx.del(yjsAwarenessKey(name, reflectClientID, yjsClientID));
}

function putClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: string,
  yjsClientID: number,
  yjsAwarenessState: ReadonlyJSONObject | null,
) {
  return tx.set(
    yjsAwarenessKey(name, reflectClientID, yjsClientID),
    yjsAwarenessState,
  );
}

function getClientState(
  tx: WriteTransaction,
  name: string,
  reflectClientID: string,
  yjsClientID: number,
) {
  return tx.get(yjsAwarenessKey(name, reflectClientID, yjsClientID));
}

export async function listClientStates(
  tx: ReadTransaction,
  name: string,
): Promise<[ClientID, number, ReadonlyJSONObject][]> {
  const entries: [ClientID, number, ReadonlyJSONObject][] = [];
  const prefix = '-/c/';
  for await (const [key, value] of tx.scan({prefix}).entries()) {
    const parts = parseKeyIntoClientIDs(key, name);
    if (parts) {
      const [reflectClientID, yjsClientID] = parts;
      entries.push([
        reflectClientID,
        Number(yjsClientID),
        value as ReadonlyJSONObject,
      ]);
    }
  }
  return entries;
}
