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
  const existing = await getServerUpdate(name, tx);
  const set = tx.location === 'client' ? setClientUpdate : setServerUpdate;
  if (!existing) {
    await set(name, update, tx);
  } else {
    const updates = [base64.toByteArray(existing), base64.toByteArray(update)];
    const merged = Y.mergeUpdatesV2(updates);
    await set(name, base64.fromByteArray(merged), tx);
  }
}

const yjsProviderKeyPrefix = 'yjs/provider/';

function yjsProviderClientUpdateKey(name: string): string {
  return `${yjsProviderKeyPrefix}client/${name}`;
}

function yjsProviderServerUpdatePrefix(name: string): string {
  return `${yjsProviderKeyPrefix}server/${name}/`;
}

function setClientUpdate(name: string, update: string, tx: WriteTransaction) {
  return tx.set(yjsProviderClientUpdateKey(name), update);
}

async function setServerUpdate(
  name: string,
  update: string,
  tx: WriteTransaction,
) {
  const writes = [];
  let i = 0;
  const existingEntries = tx
    .scan({
      prefix: yjsProviderServerUpdatePrefix(name),
    })
    .entries();
  for (; i * CHUNK_LENGTH < update.length; i++) {
    const next = await existingEntries.next();
    const existing = next.done ? undefined : next.value[1];
    const chunk = update.substring(
      i * CHUNK_LENGTH,
      i * CHUNK_LENGTH + CHUNK_LENGTH,
    );
    if (existing !== chunk) {
      writes.push(tx.set(yjsProviderServerKey(name, i), chunk));
    }
  }
  // If the previous value had more chunks than thew new value, delete these
  // additional chunks.
  for await (const [key] of existingEntries) {
    writes.push(tx.del(key));
  }
  await Promise.all(writes);
}

// Supports updates up to length 10^14
const CHUNK_LENGTH = 10_000;
export function yjsProviderServerKey(name: string, chunkIndex: number): string {
  return `${yjsProviderServerUpdatePrefix(name)}${chunkIndex
    .toString(10)
    .padStart(10, '0')}`;
}

export async function getClientUpdate(
  name: string,
  tx: ReadTransaction,
): Promise<string | undefined> {
  const v = await tx.get(yjsProviderClientUpdateKey(name));
  return typeof v === 'string' ? v : undefined;
}

export async function getServerUpdate(
  name: string,
  tx: ReadTransaction,
): Promise<string | undefined> {
  const chunks = await tx
    .scan({
      prefix: yjsProviderServerUpdatePrefix(name),
    })
    .values()
    .toArray();
  return chunks.length === 0 ? undefined : chunks.join('');
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
