import { Reflect } from "@rocicorp/reflect/client";
import { nanoid } from "nanoid";
import React, { useEffect, useRef, useState } from "react";
import { UserInfo, randUserInfo } from "./client-state.js";
import { UpdateYJS, editorKey, mutators } from "./mutators.js";
import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import * as Y from "yjs";
import * as yprotocolAwareness from "y-protocols/awareness.js";
import { CodemirrorBinding } from "y-codemirror";
import * as base64 from "base64-js";
import { render } from "react-dom";
import { useSubscribe } from "@rocicorp/reflect/react";
import styles from "./index.module.css";
import "./index.css";
import { Awareness } from "./awareness.js";

const userID = nanoid();
const roomID = "my-room";

const server: string | undefined = import.meta.env.VITE_REFLECT_URL;
if (!server) {
  throw new Error("VITE_REFLECT_URL required");
}

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

function ReflectCodeMirror({ userInfo, editorID }: RepCodeMirrorProps) {
  const ydocRef = useRef(new Y.Doc());
  const ydoc = ydocRef.current;
  useEffect(() => {
    void (async () => {
      await r.mutate.initClientState({
        userInfo,
        yjsClientID: ydoc.clientID,
        yjsAwarenessState: {
          user: { color: userInfo.color, name: userInfo.name },
        },
      });
    })();
  }, [ydoc]);
  const yText = ydoc.getText("codemirror");
  const bindingRef = useRef<CodemirrorBinding | null>(null);

  useYJSReflect(r, editorID, yText);

  const awarenessRef = useRef(new Awareness(ydoc, r));
  const awareness = awarenessRef.current;

  return (
    <div className={styles.container}>
      <h1>Reflect + yjs</h1>
      <CodeMirror
        editorDidMount={(editor) => {
          const binding = new CodemirrorBinding(yText, editor, awareness);
          bindingRef.current = binding;
        }}
        options={{
          theme: "material",
          lineNumbers: true,
          showCursorWhenSelecting: true,
          autoCursor: true,
        }}
      />
    </div>
  );
}

function useYJSReflect(r: Reflect<UpdateYJS>, editorID: string, yText: Y.Text) {
  const ydoc = yText.doc;
  if (!ydoc) {
    return;
  }

  const docStateFromReflect = useSubscribe(
    r,
    async (tx) => {
      const v = await tx.get(editorKey(editorID));
      if (typeof v === "string") {
        return v;
      }
      return null;
    },
    null,
    [editorID]
  );

  if (docStateFromReflect !== null) {
    const update = base64.toByteArray(docStateFromReflect);
    Y.applyUpdateV2(ydoc, update);
  }

  useEffect(() => {
    const f = async () => {
      const update = Y.encodeStateAsUpdateV2(ydoc);
      await r.mutate.updateYJS({
        name: editorID,
        update: base64.fromByteArray(update),
      });
    };
    yText.observe(f);
    return () => {
      yText.unobserve(f);
    };
  }, [yText, editorID]);
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("root element is null");
}

const userInfo = randUserInfo();

render(
  <React.StrictMode>
    <ReflectCodeMirror userInfo={userInfo} editorID="one" />
  </React.StrictMode>,
  rootElement
);

if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    // this makes sure that there is only one instance of the reflect client during hmr reloads
    await r.close();
    rootElement?.remove();
  });
}
