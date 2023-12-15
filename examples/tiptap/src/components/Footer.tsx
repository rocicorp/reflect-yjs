"use client";
import React, { useEffect, useState } from "react";
import { Provider } from "@rocicorp/reflect-yjs";
import { UserInfo } from "./TextEditor";

export function Footer({
  provider,
  currentUser,
}: {
  provider: Provider;
  currentUser: UserInfo;
}) {
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  useEffect(() => {
    const { awareness } = provider;
    const updateUsers = () => {
      const awarenessusers = Object.fromEntries(
        [...awareness.getStates().entries()].map(([key, state]) => [
          key,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state as any).user,
        ])
      );

      setUsers(awarenessusers);
    };
    updateUsers();
    awareness.on("change", updateUsers);
    return () => {
      awareness.off("change", updateUsers);
    };
  }, [provider]);

  const usersLength = Object.keys(users).length;

  return (
    <div className="editor__footer">
      <div
        className={`editor__status editor__status--${
          usersLength ? "connected" : "offline"
        }`}
      >
        {usersLength ? `${usersLength} online` : "offline"}
      </div>
      <div className="editor__name">{currentUser.name}</div>
    </div>
  );
}

export default Footer;
