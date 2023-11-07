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

import type { WriteTransaction } from "@rocicorp/reflect";
import { initClientState, updateYJSAwarenessState, putYJSAwarenessState } from "./client-state.js";

export const mutators = {
  initClientState,
  updateYJSAwarenessState,
  putYJSAwarenessState,
  updateYJS,
};

export type M = typeof mutators;

export type UpdateYJS = {
  updateYJS: (
    tx: WriteTransaction,
    { name, update }: { name: string; update: string }
  ) => Promise<void>;
};


async function updateYJS(
  tx: WriteTransaction,
  { name, update }: { name: string; update: string }
) {
  await tx.put(editorKey(name), update);
}


export function editorKey(name: string): string {
  return `yjs/cm/${name}`;
}

