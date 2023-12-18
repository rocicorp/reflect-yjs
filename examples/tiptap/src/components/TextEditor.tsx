"use client";
import "./TextEditor.css";
import React, { useState, useEffect } from "react";
import * as Y from "yjs";
import { Provider, mutators as yjsMutators } from "@rocicorp/reflect-yjs";
import { Reflect } from "@rocicorp/reflect/client";
import { nanoid } from "nanoid";
import { EditorContent, useEditor } from "@tiptap/react";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import MenuBar from "./MenuBar";
import Footer from "./Footer";
export function TextEditor({ roomID }: { roomID: string }) {
  return <Editor roomID={roomID} />;
}
const colors = [
  "#958DF1",
  "#F98181",
  "#FBBC88",
  "#FAF594",
  "#70CFF8",
  "#94FADB",
  "#B9F18D",
];
const names = [
  "Lea Thompson",
  "Cyndi Lauper",
  "Tom Cruise",
  "Madonna",
  "Jerry Hall",
  "Joan Collins",
  "Winona Ryder",
  "Christina Applegate",
  "Alyssa Milano",
  "Molly Ringwald",
  "Ally Sheedy",
  "Debbie Harry",
  "Olivia Newton-John",
  "Elton John",
  "Michael J. Fox",
  "Axl Rose",
  "Emilio Estevez",
  "Ralph Macchio",
  "Rob Lowe",
  "Jennifer Grey",
  "Mickey Rourke",
  "John Cusack",
  "Matthew Broderick",
  "Justine Bateman",
  "Lisa Bonet",
];

export type UserInfo = {
  name: string;
  color: string;
};

const getRandomElement = (list: string[]) =>
  list[Math.floor(Math.random() * list.length)];

const getRandomColor = () => getRandomElement(colors);
const getRandomName = () => getRandomElement(names);

const userInfo = {
  userInfo: {
    name: getRandomName(),
    color: getRandomColor(),
  },
};

const server: string | undefined = process.env.NEXT_PUBLIC_REFLECT_URL;
if (!server) {
  throw new Error("NEXT_PUBLIC_REFLECT_URL required");
}

// Collaborative text editor with simple rich text and live cursors
export function Editor({ roomID }: { roomID: string }) {
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<Provider>();

  useEffect(() => {
    console.log("creating new reflect instance");

    const userID = nanoid();

    const reflect = new Reflect({
      server,
      userID,
      roomID,
      auth: userID,
      mutators: yjsMutators,
    });

    const yDoc = new Y.Doc();
    const yProvider = new Provider(reflect, "one", yDoc);
    setDoc(yDoc);
    setProvider(yProvider);
    console.log("userInfo", userInfo);
    yProvider.awareness.setLocalStateField("user", userInfo.userInfo);
    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, []);

  if (!doc || !provider) {
    return null;
  }

  return <TiptapEditor doc={doc} provider={provider} />;
}

type EditorProps = {
  doc: Y.Doc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
};

function TiptapEditor({ doc, provider }: EditorProps) {
  const { name, color } = userInfo.userInfo;

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Highlight,
      TaskList,
      TaskItem,
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name,
          color,
        },
      }),
    ],
  });

  return (
    <div className="editor">
      {editor && <MenuBar editor={editor} />}
      <EditorContent className="editor__content" editor={editor} />
      <Footer provider={provider} currentUser={userInfo.userInfo} />
    </div>
  );
}
