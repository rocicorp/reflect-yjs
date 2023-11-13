import {Reflect} from '@rocicorp/reflect/client';
import 'codemirror/lib/codemirror.css';
import {nanoid} from 'nanoid';
import React, {useEffect, useRef} from 'react';
import {UnControlled as CodeMirror} from 'react-codemirror2';
import {render} from 'react-dom';
import {CodemirrorBinding} from 'y-codemirror';
import * as Y from 'yjs';
import {
  UserInfo,
  randUserInfo,
  yjsSetLocalState,
  yjsSetLocalStateField,
} from './client-state.js';
import './index.css';
import styles from './index.module.css';
import {updateYJS} from './mutators.js';
import {Provider} from './provider.js';

const userID = nanoid();
const roomID = `r-${Math.floor(new Date().getTime() / (1000 * 60 * 60))}`;

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error('VITE_REFLECT_URL required');
}

const mutators = {
  yjsSetLocalStateField,
  yjsSetLocalState,
  updateYJS,
};

const r = new Reflect({
  server,
  userID,
  roomID,
  auth: userID,
  mutators,
});

type RepCodeMirrorProps = {
  editorID: string;
  userInfo: UserInfo;
};

function ReflectCodeMirror({userInfo, editorID}: RepCodeMirrorProps) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;

  const provider = new Provider(r, editorID, ydoc);
  useEffect(() => {
    // TODO(arv): I don't understand why this does not work.
    //
    //   provider.awareness.setLocalStateField('user', userInfo);
    //
    // All the code I see out there uses setLocalStateField but the code
    // requires that there is an existing local state to set a state field.
    //
    // So I am using setLocalState instead.
    provider.awareness.setLocalState({user: userInfo});
  }, [provider.awareness, userInfo]);

  useEffect(() => {
    return () => provider.destroy();
  }, []);

  const yText = ydoc.getText('codemirror');
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  return (
    <div className={styles.container}>
      <h1>Reflect + yjs</h1>
      <h3>
        <a href="https://hello.reflect.net">hello.reflect.net</a>
      </h3>
      <CodeMirror
        editorDidMount={editor => {
          const binding = new CodemirrorBinding(
            yText,
            editor,
            provider.awareness,
          );
          bindingRef.current = binding;
        }}
        options={{
          theme: 'material',
          lineNumbers: true,
          showCursorWhenSelecting: true,
          autoCursor: true,
        }}
      />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root element is null');
}

const userInfo = randUserInfo();

render(
  <React.StrictMode>
    <ReflectCodeMirror userInfo={userInfo} editorID="one" />
  </React.StrictMode>,
  rootElement,
);

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await r.close();
    rootElement.textContent = '';
  });
}
