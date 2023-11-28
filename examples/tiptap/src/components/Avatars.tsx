import styles from "./Avatars.module.css";
import { Provider } from "@rocicorp/reflect-yjs";
import { useEffect, useState } from "react";
import { UserInfo } from "./TextEditor";

export function Avatars({ provider }: { provider: Provider }) {
  const [users, setUsers] = useState<Record<string, UserInfo>>({});

  useEffect(() => {
    const awareness = provider.awareness;
    const updateUsers = () => {
      const awarenessusers = Object.fromEntries(
        [...awareness.getStates().entries()].map(([key, state]) => {
          return [key, (state as any).user];
        })
      );
      setUsers(awarenessusers);
    };
    updateUsers();
    awareness.on("change", updateUsers);
    return () => {
      awareness.off("change", updateUsers);
    };
  }, [provider]);

  return (
    <div className={styles.avatars}>
      {Object.entries(users).map(([key, info]) => {
        return (
          info && <Avatar key={key} picture={info.picture} name={info.name} />
        );
      })}
    </div>
  );
}

export function Avatar({ picture, name }: { picture: string; name: string }) {
  return (
    <div className={styles.avatar} data-tooltip={name}>
      <img
        alt={name}
        src={picture}
        className={styles.avatar_picture}
        data-tooltip={name}
      />
    </div>
  );
}
