import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {ChunkedUpdateMeta, Mutators} from './mutators.js';
import {
  yjsProviderClientUpdateKey,
  yjsProviderKeyPrefix,
  yjsProviderServerUpdateChunkKeyPrefix,
  yjsProviderServerUpdateMetaKey,
} from './mutators.js';
import {unchunk} from './chunk.js';

export class Provider {
  readonly #reflect: Reflect<Mutators>;
  readonly #ydoc: Y.Doc;
  #awareness: Awareness | null = null;
  readonly #cancelWatch: () => void;

  readonly name: string;
  #clientUpdate: Uint8Array | null = null;
  #serverUpdate: Uint8Array | null = null;
  #serverUpdateMeta: ChunkedUpdateMeta | null = null;
  #serverUpdateChunks: Map<string, Uint8Array> = new Map();
  #vector: Uint8Array | null = null;

  constructor(reflect: Reflect<Mutators>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('update', this.#handleUpdate);
    ydoc.on('destroy', this.#handleDestroy);

    const clientUpdateKey = yjsProviderClientUpdateKey(name);
    const serverUpdateMetaKey = yjsProviderServerUpdateMetaKey(name);
    const serverUpdateChunkKeyPrefix =
      yjsProviderServerUpdateChunkKeyPrefix(name);

    let isInitial = true;
    this.#cancelWatch = reflect.experimentalWatch(
      diff => {
        let serverUpdateChange = false;
        for (const diffOp of diff) {
          const {key} = diffOp;
          switch (diffOp.op) {
            case 'add':
            case 'change':
              if (key === clientUpdateKey) {
                this.#clientUpdate = base64.toByteArray(
                  diffOp.newValue as string,
                );
              } else if (key === serverUpdateMetaKey) {
                this.#serverUpdateMeta = diffOp.newValue as ChunkedUpdateMeta;
                serverUpdateChange = true;
              } else if (key.startsWith(serverUpdateChunkKeyPrefix)) {
                this.#serverUpdateChunks.set(
                  key.substring(serverUpdateChunkKeyPrefix.length),
                  base64.toByteArray(diffOp.newValue as string),
                );
              }
              break;
            case 'del':
              if (key === clientUpdateKey) {
                this.#clientUpdate = null;
              } else if (key === serverUpdateMetaKey) {
                this.#serverUpdateMeta = null;
                serverUpdateChange = true;
              } else if (key.startsWith(serverUpdateChunkKeyPrefix)) {
                this.#serverUpdateChunks.delete(
                  key.substring(serverUpdateChunkKeyPrefix.length),
                );
              }
              break;
          }
        }
        if (serverUpdateChange) {
          if (this.#serverUpdateMeta === null) {
            this.#serverUpdate = null;
            this.#vector = null;
          } else {
            this.#serverUpdate = unchunk(
              this.#serverUpdateChunks,
              this.#serverUpdateMeta.chunkHashes,
              this.#serverUpdateMeta.length,
            );
            this.#vector = Y.encodeStateVectorFromUpdateV2(this.#serverUpdate);
            Y.applyUpdateV2(ydoc, this.#serverUpdate);
          }
        }
        if (isInitial) {
          isInitial = false;
          // Only apply client update on initial load of document.
          // All other client updates will have originated from this ydoc
          // and thus not need to be applied.
          if (this.#clientUpdate) {
            Y.applyUpdateV2(ydoc, this.#clientUpdate);
          }
        }
      },
      {
        prefix: yjsProviderKeyPrefix(name),
        initialValuesInFirstDiff: true,
      },
    );
  }

  get awareness(): Awareness {
    if (this.#awareness === null) {
      this.#awareness = new Awareness(this.#reflect, this.name, this.#ydoc);
    }
    return this.#awareness;
  }

  #handleUpdate = async () => {
    const diffUpdate = this.#vector
      ? Y.encodeStateAsUpdateV2(this.#ydoc, this.#vector)
      : Y.encodeStateAsUpdateV2(this.#ydoc);
    await this.#reflect.mutate.updateYJS({
      name: this.name,
      update: base64.fromByteArray(diffUpdate),
    });
  };

  #handleDestroy = () => {
    this.destroy();
  };

  destroy(): void {
    this.#cancelWatch();
    this.#clientUpdate = null;
    this.#serverUpdateMeta = null;
    this.#serverUpdateChunks.clear();
    this.#vector = null;
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('update', this.#handleUpdate);
    this.#awareness?.destroy();
  }
}
