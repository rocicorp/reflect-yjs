import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {Mutators} from './mutators.js';
import {getClientUpdate, getServerUpdate} from './mutators.js';

export class Provider {
  readonly #reflect: Reflect<Mutators>;
  readonly #ydoc: Y.Doc;
  #awareness: Awareness | null = null;
  readonly #cancelSubscribe: () => void;

  readonly name: string;
  #vector: Uint8Array | null = null;

  constructor(reflect: Reflect<Mutators>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('update', this.#handleUpdate);
    ydoc.on('destroy', this.#handleDestroy);

    this.#cancelSubscribe = reflect.subscribe<[string | null, string | null]>(
      async tx => [
        (await getServerUpdate(this.name, tx)) ?? null,
        (await getClientUpdate(this.name, tx)) ?? null,
      ],
      ([serverUpdate, clientUpdate]) => {
        if (serverUpdate !== null) {
          this.#vector = Y.encodeStateVectorFromUpdateV2(
            base64.toByteArray(serverUpdate),
          );
        }
        const update = clientUpdate ?? serverUpdate;
        if (update !== null) {
          Y.applyUpdateV2(ydoc, base64.toByteArray(update));
        }
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
    this.#cancelSubscribe();
    this.#vector = null;
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('update', this.#handleUpdate);
    this.#awareness?.destroy();
  }
}
