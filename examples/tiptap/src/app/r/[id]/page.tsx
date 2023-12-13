"use client";
import { TextEditor } from "@/components/TextEditor";
import { useEffect, useState } from "react";

export default function Home() {
  const [roomID, setRoomID] = useState<string | null>(null);
  useEffect(() => {
    const [, , roomID] = location.pathname.split("/");
    setRoomID(roomID);
  }, []);

  return (
    roomID && (
      <main>
        <TextEditor roomID={roomID} />
      </main>
    )
  );
}
