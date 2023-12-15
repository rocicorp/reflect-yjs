import type {
  ClientID,
  ReadTransaction,
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  WriteTransaction,
} from '@rocicorp/reflect';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {chunk, unchunk} from './chunk.js';

export const mutators = {
  yjsSetLocalStateField,
  yjsSetLocalState,
  updateYJS: updateYJS(undefined),
};

export type Mutators = typeof mutators;

export type UpdateYJSArgs = {
  validator?: ((doc: Y.Doc) => void) | undefined;
};

export function updateYJS(args?: UpdateYJSArgs | undefined) {
  return async function (
    tx: WriteTransaction,
    {name, update}: {name: string; update: string},
  ) {
    const {validator} = args ?? {};
    if (tx.location === 'server') {
      const existingServerUpdate = await getServerUpdate(name, tx);
      const decodedUpdate = base64.toByteArray(update);
      let merged = existingServerUpdate
        ? Y.mergeUpdatesV2([existingServerUpdate, decodedUpdate])
        : decodedUpdate;

      if (validator) {
        // If we have a validator, we need to materialize the doc.
        // This is slow, but we'll add features to Reflect in the future to keep this doc
        // loaded so we don't have to do it over and over. Currently we cannot because it is
        // possible for multiple rooms to be loaded into the same JS context, so global
        // variables don't work. We need some shared context that we can stash cross-mutator
        // state like this on.
        const doc = new Y.Doc();
        Y.applyUpdateV2(doc, merged);
        validator(doc);
        merged = Y.encodeStateAsUpdateV2(doc);
      }
      await setServerUpdate(name, merged, tx);
    } else {
      if (validator) {
        throw new Error('validator only supported on server');
      }
      await setClientUpdate(name, update, tx);
    }
  };
}

export function yjsProviderKeyPrefix(name: string): string {
  return `'yjs/provider/${name}/`;
}

export function yjsProviderClientUpdateKey(name: string): string {
  return `${yjsProviderKeyPrefix(name)}client`;
}

function yjsProviderServerUpdateKeyPrefix(name: string): string {
  return `${yjsProviderKeyPrefix(name)}/server/`;
}

export function yjsProviderServerUpdateMetaKey(name: string): string {
  return `${yjsProviderServerUpdateKeyPrefix(name)}meta`;
}

export function yjsProviderServerUpdateChunkKeyPrefix(name: string): string {
  return `${yjsProviderServerUpdateKeyPrefix(name)}chunk/`;
}

export function yjsProviderServerChunkKey(
  name: string,
  chunkHash: string,
): string {
  return `${yjsProviderServerUpdateChunkKeyPrefix(name)}${chunkHash}`;
}

function setClientUpdate(name: string, update: string, tx: WriteTransaction) {
  return tx.set(yjsProviderClientUpdateKey(name), update);
}

const AVG_CHUNK_SIZE_B = 1024;
const MIN_CHUNK_SIZE_B = 256;
const MAX_CHUNK_SIZE_B = 2048;
async function setServerUpdate(
  name: string,
  update: Uint8Array,
  tx: WriteTransaction,
) {
  const existingInfo = (await tx.get(yjsProviderServerUpdateMetaKey(name))) as
    | undefined
    | ChunkedUpdateMeta;
  const toDelete: Set<string> = existingInfo
    ? new Set(existingInfo.chunkHashes)
    : new Set();

  const chunkInfo = await chunk(
    AVG_CHUNK_SIZE_B,
    MIN_CHUNK_SIZE_B,
    MAX_CHUNK_SIZE_B,
    update,
  );
  const updateMeta: ChunkedUpdateMeta = {
    chunkHashes: chunkInfo.sourceAsChunkHashes,
    length: update.length,
  };
  await tx.set(yjsProviderServerUpdateMetaKey(name), updateMeta);
  const writes = [];
  let common = 0;
  let commonSize = 0;
  let size = 0;
  for (const [hash, chunk] of chunkInfo.chunksByHash) {
    size += chunk.length;
    if (toDelete.has(hash)) {
      common++;
      toDelete.delete(hash);
      commonSize += chunk.length;
    } else {
      writes.push(
        tx.set(
          yjsProviderServerChunkKey(name, hash),
          base64.fromByteArray(chunk),
        ),
      );
    }
  }
  for (const hash of toDelete) {
    writes.push(tx.del(yjsProviderServerChunkKey(name, hash)));
  }
  await Promise.all(writes);
  console.log(
    `yjs content-defined-chunking of update stats:\n  ${common} of ${
      chunkInfo.chunksByHash.size
    } (${Math.floor(
      (common / chunkInfo.chunksByHash.size) * 100,
    )}%) chunks reused.\n  ${commonSize} bytes of ${size} bytes (${Math.floor(
      (commonSize / size) * 100,
    )}%) reused.`,
  );
}

export async function getClientUpdate(
  name: string,
  tx: ReadTransaction,
): Promise<string | undefined> {
  const v = await tx.get(yjsProviderClientUpdateKey(name));
  return typeof v === 'string' ? v : undefined;
}

export type ChunkedUpdateMeta = {
  chunkHashes: string[];
  length: number;
};

async function getServerUpdate(
  name: string,
  tx: ReadTransaction,
): Promise<Uint8Array | undefined> {
  const updateMeta = (await tx.get(yjsProviderServerUpdateMetaKey(name))) as
    | undefined
    | ChunkedUpdateMeta;
  if (updateMeta === undefined) {
    return undefined;
  }
  const chunksPrefix = yjsProviderServerUpdateChunkKeyPrefix(name);
  const chunks = await tx
    .scan({
      prefix: chunksPrefix,
    })
    .entries();
  const chunksByHash = new Map<string, Uint8Array>();
  const chunksPrefixLength = chunksPrefix.length;
  for await (const [key, value] of chunks) {
    const hash = key.substring(chunksPrefixLength, key.length);
    chunksByHash.set(hash, base64.toByteArray(value as string));
  }
  return unchunk(chunksByHash, updateMeta.chunkHashes, updateMeta.length);
}

export function yjsAwarenessKey(
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
): string {
  // -/p/${reflectClientID} is a presence key space and these are ephemeral. They
  // get deleted when Reflect knows that the client can never come back.
  return `-/p/${reflectClientID}/yjs/awareness/${name}/${yjsClientID}`;
}

export function parseKeyIntoClientIDs(
  key: string,
  name: string,
): undefined | [ClientID, string] {
  // `-/p/${reflectClientID}/yjs/awareness/${name}/${yjsClientID}`;
  //  0/1/2                 /3  /4        /5      /6
  const parts = key.split('/');
  if (
    parts[0] !== '-' ||
    parts[1] !== 'p' ||
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
  const prefix = '-/p/';
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
