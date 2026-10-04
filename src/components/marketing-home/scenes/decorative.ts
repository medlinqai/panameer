"use client";

import { createContext, useContext } from "react";

const DecorativeSceneContext = createContext(false);

export const DecorativeSceneProvider = DecorativeSceneContext.Provider;

/** True when this scene is the decorative card crop rather than the dialog. */
export function useDecorativeScene(): boolean {
  return useContext(DecorativeSceneContext);
}
