"use client";
import { createContext, useContext } from "react";
export const SCREEN_W = 512;
export const SCREEN_H = 342;
export const ScaleCtx = createContext(1);
export const useScreenScale = () => useContext(ScaleCtx);
