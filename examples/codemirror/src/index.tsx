import {Reflect} from '@rocicorp/reflect/client';
import 'codemirror/lib/codemirror.css';
import {nanoid} from 'nanoid';
import React, {useEffect, useRef} from 'react';
import {UnControlled as CodeMirror} from 'react-codemirror2';
import {render} from 'react-dom';
import {CodemirrorBinding} from 'y-codemirror';
import * as Y from 'yjs';
import './index.css';
import styles from './index.module.css';
import {
  Provider,
  mutators as yjsMutators,
  Mutators,
} from '@rocicorp/reflect-yjs';
import {UserInfo, randUserInfo} from './user-info.js';

const userID = nanoid();
const roomID = `r-${Math.floor(new Date().getTime() / (1000 * 60 * 60))}`;

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error('VITE_REFLECT_URL required');
}

const reflect = new Reflect({
  server,
  userID,
  roomID,
  auth: userID,
  mutators: yjsMutators,
});

type ReflectCodeMirrorProps = {
  reflect: Reflect<Mutators>;
  name: string;
  userInfo: UserInfo;
};

function ReflectCodeMirror({reflect, name, userInfo}: ReflectCodeMirrorProps) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;

  const provider = new Provider(reflect, name, ydoc);
  useEffect(() => {
    provider.awareness.setLocalStateField('user', userInfo);
  }, [provider.awareness, userInfo]);

  useEffect(() => () => provider.destroy(), []);

  const yText = ydoc.getText('codemirror');
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  return (
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
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root element is null');
}

const userInfo = randUserInfo();

render(
  <React.StrictMode>
    <div className={styles.container}>
      <h1>Reflect + yjs</h1>
      <h3>
        <a href="https://hello.reflect.net">hello.reflect.net</a>
      </h3>
      <ReflectCodeMirror userInfo={userInfo} name="one" reflect={reflect} />
      <ReflectCodeMirror userInfo={userInfo} name="two" reflect={reflect} />
    </div>
  </React.StrictMode>,
  rootElement,
);

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await reflect.close();
  });
}
