import {mutators as yjsMutators, updateYJS} from '@rocicorp/reflect-yjs';
// @ts-expect-error "no ts support"
import {regex} from 'badwords-list';

function makeOptions() {
  return {
    mutators: {
      ...yjsMutators,
      updateYJS: updateYJS({
        validator: doc => {
          const text = doc.getText('monaco');
          const string = text.toString();
          let match: RegExpExecArray | null = null;
          while ((match = regex.exec(string)) !== null) {
            const badWordLength = match[0].length;
            text.delete(match.index, badWordLength);
            text.insert(match.index, '*'.repeat(badWordLength));
          }
        },
      }),
    },
  };
}

export {makeOptions as default};
