import {Reflect} from '@rocicorp/reflect/client';
import 'codemirror/lib/codemirror.css';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import {nanoid} from 'nanoid';
import {MonacoBinding} from 'y-monaco';
import * as Y from 'yjs';
import './index.css';
import {Provider, mutators as yjsMutators} from './provider.js';
import {randUserInfo} from './user-info.js';

const userID = nanoid();
// const roomID = `r-${Math.floor(new Date().getTime() / 1000)}`;
const roomID = 'r-5';

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error('VITE_REFLECT_URL required');
}

const mutators = {
  ...yjsMutators,
  more: () => 1,
};

const reflect = new Reflect({
  server,
  userID,
  roomID,
  auth: userID,
  mutators,
});

const yDoc = new Y.Doc();
const provider = new Provider(reflect, 'monaco', yDoc);
const yText = yDoc.getText('monaco');

const userInfo = randUserInfo();
const {awareness} = provider;

awareness.setLocalStateField('user', userInfo);

const rootElement = must(document.getElementById('monaco-editor'));

const editor = monaco.editor.create(rootElement, {
  value: '', // MonacoBinding overwrites this value with the content of ytext
  language: 'javascript',
  automaticLayout: true,
});

const binding = new MonacoBinding(
  yText,
  must(editor.getModel()),
  new Set([editor]),
  awareness,
);

function must<T>(v: T | null | undefined): T {
  if (v === null || v === undefined) {
    throw new Error('Expected value to be defined');
  }
  return v;
}

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await reflect.close();
    rootElement.textContent = '';
    binding.destroy();
    provider.destroy();
  });
}
