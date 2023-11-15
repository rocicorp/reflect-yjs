// This file defines our "mutators".
//
// Mutators are how you change data in Reflect apps.
//
// They are registered with Reflect at construction-time and callable like:
// `myReflect.mutate.setCursor()`.
//
// Reflect runs each mutation immediately (optimistically) on the client,
// against the local cache, and then later (usually moments later) sends a
// description of the mutation (its name and arguments) to the server, so that
// the server can *re-run* the mutation there against the authoritative
// datastore.
//
// This re-running of mutations is how Reflect handles conflicts: the
// mutators defensively check the database when they run and do the appropriate
// thing. The Reflect sync protocol ensures that the server-side result takes
// precedence over the client-side optimistic result.

import type {ClientID, WriteTransaction} from '@rocicorp/reflect';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {yjsSetLocalState, yjsSetLocalStateField} from './client-state.js';

export const mutators = {
  yjsSetLocalStateField,
  yjsSetLocalState,
  updateYJS,
};

export type M = typeof mutators;

export type UpdateYJS = {
  updateYJS: typeof updateYJS;
};

export type YJSSetLocalStateField = {
  yjsSetLocalStateField: typeof yjsSetLocalStateField;
};

export type YJSSetLocalState = {
  yjsSetLocalState: typeof yjsSetLocalState;
};

export async function updateYJS(
  tx: WriteTransaction,
  {name, update}: {name: string; update: string},
) {
  const existing = await tx.get<string>(yjsProviderKey(name));
  if (!existing) {
    await tx.set(yjsProviderKey(name), update);
  } else {
    const updates = [base64.toByteArray(existing), base64.toByteArray(update)];
    const merged = Y.mergeUpdatesV2(updates);
    await tx.set(yjsProviderKey(name), base64.fromByteArray(merged));
  }
}

export function yjsAwarenessPrefix(name: string) {
  return `yjs/awareness/${name}/`;
}

export function yjsProviderKey(name: string): string {
  return `yjs/provider/${name}`;
}

export function yjsAwarenessKey(
  name: string,
  reflectClientID: ClientID,
  yjsClientID: number,
): string {
  return `${yjsAwarenessPrefix(name)}${reflectClientID}/${yjsClientID}`;
}
