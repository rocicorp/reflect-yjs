"use client";
import { TextEditor } from "@/components/TextEditor";

export default function Home() {
  const [, , roomID] = location.pathname.split("/");

  return (
    <main>
      <TextEditor roomID={roomID} />
    </main>
  );
}
