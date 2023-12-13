"use client";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Highlight from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorView } from "prosemirror-view";
import React, { useState, useEffect } from "react";
import * as Y from "yjs";
import { CustomTaskItem } from "./CustomTaskItem";
import { SelectionMenu } from "./SelectionMenu";
import { Toolbar } from "./Toolbar";
import styles from "./TextEditor.module.css";
import { Avatars } from "@/components/Avatars";
import { Provider, mutators as yjsMutators } from "@rocicorp/reflect-yjs";
import { Reflect } from "@rocicorp/reflect/client";
import { nanoid } from "nanoid";

export function TextEditor({ roomID }: { roomID: string }) {
  return <Editor roomID={roomID} />;
}

const USER_INFO = [
  {
    name: "Charlie Layne",
    color: "#D583F0",
    picture: "https://i.pravatar.cc/150?img=66",
  },
  {
    name: "Mislav Abha",
    color: "#F08385",
    picture: "https://i.pravatar.cc/150?img=60",
  },
  {
    name: "Tatum Paolo",
    color: "#F0D885",
    picture: "https://i.pravatar.cc/150?img=54",
  },
  {
    name: "Anjali Wanda",
    color: "#85EED6",
    picture: "https://i.pravatar.cc/150?img=49",
  },
  {
    name: "Jody Hekla",
    color: "#85BBF0",
    picture: "https://i.pravatar.cc/150?img=21",
  },
  {
    name: "Emil Joyce",
    color: "#8594F0",
    picture: "https://i.pravatar.cc/150?img=12",
  },
  {
    name: "Jory Quispe",
    color: "#85DBF0",
    picture: "https://i.pravatar.cc/150?img=13",
  },
  {
    name: "Quinn Elton",
    color: "#87EE85",
    picture: "https://i.pravatar.cc/150?img=14",
  },
];

export type UserInfo = {
  name: string;
  picture: string;
  color: string;
};

const userInfo = {
  userInfo: USER_INFO[Math.floor(Math.random() * 10) % USER_INFO.length],
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
  provider: any;
};

function TiptapEditor({ doc, provider }: EditorProps) {
  const { name, color, picture } = userInfo.userInfo;

  // Set up editor with plugins, and place user info into Yjs awareness and cursors
  const editor = useEditor({
    editorProps: {
      attributes: {
        // Add styles to editor element
        class: styles.editor,
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: {
          HTMLAttributes: {
            class: "tiptap-blockquote",
          },
        },
        code: {
          HTMLAttributes: {
            class: "tiptap-code",
          },
        },
        codeBlock: {
          languageClassPrefix: "language-",
          HTMLAttributes: {
            class: "tiptap-code-block",
            spellcheck: false,
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: "tiptap-heading",
          },
        },
        // The Collaboration extension comes with its own history handling
        history: false,
        horizontalRule: {
          HTMLAttributes: {
            class: "tiptap-hr",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "tiptap-list-item",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "tiptap-ordered-list",
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: "tiptap-paragraph",
          },
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "tiptap-highlight",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "tiptap-empty",
      }),
      CustomTaskItem,
      TaskList.configure({
        HTMLAttributes: {
          class: "tiptap-task-list",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Typography,
      Youtube.configure({
        modestBranding: true,
        HTMLAttributes: {
          class: "tiptap-youtube",
        },
      }),
      // Register the document with Tiptap
      Collaboration.configure({
        document: doc,
      }),
      // Attach provider and user info
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name,
          color,
          picture,
        },
      }),
    ],
  });

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        {editor && <Toolbar editor={editor} />}
        <Avatars provider={provider} />
      </div>
      <div className={styles.editorPanel}>
        {editor && <SelectionMenu editor={editor} />}
        <EditorContent editor={editor} className={styles.editorContainer} />
      </div>
    </div>
  );
}

// Prevents a matchesNode error on hot reloading
EditorView.prototype.updateState = function updateState(state) {
  // @ts-ignore
  if (!this.docView) return;
  // @ts-ignore
  this.updateStateInner(state, this.state.plugins != state.plugins);
};
