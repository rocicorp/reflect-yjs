import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {Mutators} from './mutators.js';
import {yjsProviderUpdateKey, yjsProviderVectorKey} from './mutators.js';

export class Provider {
  readonly #reflect: Reflect<Mutators>;
  readonly #ydoc: Y.Doc;
  #awareness: Awareness | null = null;
  #cancelUpdateSubscribe: () => void;
  #cancelVectorSubscribe: () => void;

  readonly name: string;
  #vector: Uint8Array | null = null;

  constructor(reflect: Reflect<Mutators>, name: string, ydoc: Y.Doc) {
    this.#reflect = reflect;
    this.name = name;
    this.#ydoc = ydoc;

    ydoc.on('update', this.#handleUpdate);
    ydoc.on('destroy', this.#handleDestroy);

    this.#cancelUpdateSubscribe = reflect.subscribe(
      async tx => {
        const v = await tx.get(yjsProviderUpdateKey(this.name));
        return typeof v === 'string' ? v : null;
      },
      docStateFromReflect => {
        if (docStateFromReflect !== null) {
          const update = base64.toByteArray(docStateFromReflect);
          Y.applyUpdateV2(ydoc, update);
        }
      },
    );

    this.#cancelVectorSubscribe = reflect.subscribe(
      async tx => {
        const v = await tx.get(yjsProviderVectorKey(this.name));
        return typeof v === 'string' ? v : null;
      },
      docStateFromReflect => {
        if (docStateFromReflect !== null) {
          this.#vector = base64.toByteArray(docStateFromReflect);
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
    // We could/should use the update passed into the on('update') but encoding the whole state is easier for now.
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
    this.#cancelUpdateSubscribe();
    this.#cancelVectorSubscribe();
    this.#vector = null;
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('update', this.#handleUpdate);
    this.#awareness?.destroy();
  }
}
