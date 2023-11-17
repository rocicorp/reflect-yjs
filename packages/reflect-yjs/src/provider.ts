import type {Reflect} from '@rocicorp/reflect/client';
import * as base64 from 'base64-js';
import * as Y from 'yjs';
import {Awareness} from './awareness.js';
import type {Mutators} from './mutators.js';
import {yjsProviderClientKey, yjsProviderServerKey} from './mutators.js';

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
        let v = await tx.get(yjsProviderClientKey(this.name));
        if (typeof v !== 'string') {
          v = await tx.get(yjsProviderServerKey(this.name));
        }
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
        const v = await tx.get(yjsProviderServerKey(this.name));
        return typeof v === 'string' ? v : null;
      },
      docStateFromServer => {
        if (docStateFromServer !== null) {
          this.#vector = Y.encodeStateVectorFromUpdateV2(
            base64.toByteArray(docStateFromServer),
          );
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
    this.#cancelUpdateSubscribe();
    this.#cancelVectorSubscribe();
    this.#vector = null;
    this.#ydoc.off('destroy', this.#handleDestroy);
    this.#ydoc.off('update', this.#handleUpdate);
    this.#awareness?.destroy();
  }
}
