"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const STORAGE_KEY = "crewos-theme";
const CHANGE_EVENT = "crewos:theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerTheme(): Theme {
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f3f4ee" : "#0d0e0c");
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const light = theme === "light";
  const label = light ? "Usar modo escuro" : "Usar modo claro";

  return <button
    type="button"
    className={compact ? "theme-toggle-compact icon-button" : "theme-toggle"}
    onClick={() => applyTheme(light ? "dark" : "light")}
    aria-label={label}
    title={label}
  >
    {light ? <Moon size={compact ? 17 : 16} /> : <Sun size={compact ? 17 : 16} />}
    {!compact && <span>{light ? "Modo escuro" : "Modo claro"}</span>}
  </button>;
}
