"use client";
import "./MenuItem.css";

import React from "react";

import { Item } from "./MenuBar";
export function MenuItem({ icon, title, action, isActive }: Item) {
  return (
    <button
      className={`menu-item${isActive && isActive() ? " is-active" : ""}`}
      onClick={action}
      title={title}
    >
      <svg className="remix">
        <use xlinkHref={`/remixicon.symbol.svg#ri-${icon}`} />
      </svg>
    </button>
  );
}

export default MenuItem;
