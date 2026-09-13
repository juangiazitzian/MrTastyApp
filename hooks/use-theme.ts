"use client";
import { useCallback, useEffect, useState } from "react";

const KEY = "tasty-theme";

/**
 * Tema claro/oscuro persistido en el navegador. El valor inicial lo aplica el
 * script de arranque de `app/layout.tsx`, así que acá sólo se lee la clase ya
 * presente en el documento y se mantiene sincronizada.
 */
export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    setDark((previous) => {
      const next = !previous;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem(KEY, next ? "dark" : "light");
      } catch {
        /* almacenamiento no disponible: el tema dura lo que la pestaña */
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
