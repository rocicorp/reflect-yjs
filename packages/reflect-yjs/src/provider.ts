import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {ChunkedUpdateMeta, Mutators} from './mutators.js';
import {
  yjsProviderKeyPrefix,
  yjsProviderClientUpdateKeyPrefix,
  yjsProviderServerUpdateChunkKeyPrefix,
  yjsProviderServerUpdateMetaKey,
} from './mutators.js';
import {unchunk} from './chunk.js';
import {uuidv4} from 'lib0/random.js';

export class Provider {
  readonly #reflect: Reflect<Mutators>;
  readonly #ydoc: Y.Doc;
  #awareness: Awareness | null = null;
  readonly #cancelWatch: () => void;

  readonly name: string;
  #serverUpdateMeta: ChunkedUpdateMeta | null = null;
  #serverUpdateChunks: Map<string, Uint8Array> = new Map();

  constructor(reflect: Reflect<Mutators>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('updateV2', this.#handleUpdateV2);
    ydoc.on('destroy', this.#handleDestroy);

    const clientUpdateKeyPrefix = yjsProviderClientUpdateKeyPrefix(name);
    const serverUpdateMetaKey = yjsProviderServerUpdateMetaKey(name);
    const serverUpdateChunkKeyPrefix =
      yjsProviderServerUpdateChunkKeyPrefix(name);

    this.#cancelWatch = reflect.experimentalWatch(
      diff => {
        const newClientUpdates: Uint8Array[] = [];
        let serverUpdateChange = false;
        for (const diffOp of diff) {
          const {key} = diffOp;
          switch (diffOp.op) {
            case 'add':
            case 'change':
              if (key.startsWith(clientUpdateKeyPrefix)) {
                newClientUpdates.push(
                  base64.toByteArray(diffOp.newValue as string),
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
              if (key === serverUpdateMetaKey) {
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
        if (serverUpdateChange && this.#serverUpdateMeta !== null) {
          const serverUpdate = unchunk(
            this.#serverUpdateChunks,
            this.#serverUpdateMeta.chunkHashes,
            this.#serverUpdateMeta.length,
          );
          Y.applyUpdateV2(ydoc, serverUpdate, this);
        }
        for (const clientUpdate of newClientUpdates) {
          Y.applyUpdateV2(ydoc, clientUpdate, this);
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

  #handleUpdateV2 = async (updateV2: Uint8Array, origin: unknown) => {
    if (origin === this) {
      return;
    }
    await this.#reflect.mutate.updateYJS({
      name: this.name,
      id: uuidv4(),
      update: base64.fromByteArray(updateV2),
    });
  };

  #handleDestroy = () => {
    this.destroy();
  };

  destroy(): void {
    this.#cancelWatch();
    this.#serverUpdateMeta = null;
    this.#serverUpdateChunks.clear();
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('updateV2', this.#handleUpdateV2);
    this.#awareness?.destroy();
  }
}
