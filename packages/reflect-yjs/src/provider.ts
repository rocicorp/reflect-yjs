import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {ChunkedUpdateMeta, Mutators} from './mutators.js';
import {
  getClientUpdates,
  getServerUpdateChunkEntries,
  getServerUpdateMeta,
  yjsProviderServerUpdateChunkKeyPrefix,
  yjsProviderServerUpdateKeyPrefix,
  yjsProviderServerUpdateMetaKey,
} from './mutators.js';
import {unchunk} from './chunk.js';

export class Provider {
  readonly #reflect: Reflect<Mutators>;
  readonly #ydoc: Y.Doc;
  #destroyed = false;
  #awareness: Awareness | null = null;
  #cancelWatch: () => void = () => {};

  readonly name: string;
  #serverUpdateMeta: ChunkedUpdateMeta | null = null;
  #serverUpdateChunks: Map<string, Uint8Array> = new Map();

  constructor(reflect: Reflect<Mutators>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('updateV2', this.#handleUpdateV2);
    ydoc.on('destroy', this.#handleDestroy);

    void this.#init();
  }

  async #init(): Promise<void> {
    const {name} = this;
    const serverUpdateMetaKey = yjsProviderServerUpdateMetaKey(name);
    const serverUpdateChunkKeyPrefix =
      yjsProviderServerUpdateChunkKeyPrefix(name);

    const {clientUpdates, serverUpdateMeta, serverUpdateChunkEntries} =
      await this.#reflect.query(async tx => ({
        clientUpdates: await getClientUpdates(name, tx),
        serverUpdateMeta: await getServerUpdateMeta(name, tx),
        serverUpdateChunkEntries: await getServerUpdateChunkEntries(name, tx),
      }));
    if (this.#destroyed) {
      return;
    }

    this.#serverUpdateMeta = serverUpdateMeta ?? null;
    this.#serverUpdateChunks = new Map(
      serverUpdateChunkEntries.map(([hash, value]) => [
        hash,
        base64.toByteArray(value),
      ]),
    );
    if (this.#serverUpdateMeta) {
      Y.applyUpdateV2(
        this.#ydoc,
        unchunk(
          this.#serverUpdateChunks,
          this.#serverUpdateMeta.chunkHashes,
          this.#serverUpdateMeta.length,
        ),
        this,
      );
    }
    for (const clientUpdate of clientUpdates) {
      Y.applyUpdateV2(this.#ydoc, base64.toByteArray(clientUpdate), this);
    }

    this.#cancelWatch = this.#reflect.experimentalWatch(
      diff => {
        for (const diffOp of diff) {
          const {key} = diffOp;
          switch (diffOp.op) {
            case 'add':
            case 'change':
              if (key === serverUpdateMetaKey) {
                this.#serverUpdateMeta = diffOp.newValue as ChunkedUpdateMeta;
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
              } else if (key.startsWith(serverUpdateChunkKeyPrefix)) {
                this.#serverUpdateChunks.delete(
                  key.substring(serverUpdateChunkKeyPrefix.length),
                );
              }
              break;
          }
        }
        if (this.#serverUpdateMeta !== null) {
          Y.applyUpdateV2(
            this.#ydoc,
            unchunk(
              this.#serverUpdateChunks,
              this.#serverUpdateMeta.chunkHashes,
              this.#serverUpdateMeta.length,
            ),
            this,
          );
        }
      },
      {
        prefix: yjsProviderServerUpdateKeyPrefix(name),
      },
    );
  }

  get awareness(): Awareness {
    if (this.#awareness === null) {
      this.#awareness = new Awareness(this.#reflect, this.name, this.#ydoc);
    }
    return this.#awareness;
  }

  #handleUpdateV2 = async (update: Uint8Array, origin: unknown) => {
    if (origin === this) {
      return;
    }
    await this.#reflect.mutate.updateYJS({
      name: this.name,
      update: base64.fromByteArray(update),
    });
  };

  #handleDestroy = () => {
    this.destroy();
  };

  destroy(): void {
    this.#destroyed = true;
    this.#cancelWatch();
    this.#serverUpdateMeta = null;
    this.#serverUpdateChunks.clear();
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('updateV2', this.#handleUpdateV2);
    this.#awareness?.destroy();
  }
}
