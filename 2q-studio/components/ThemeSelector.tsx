"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "2q-theme";

const THEME_VALUES = {
  light: {
    "--ink": "#0A0A0A",
    "--paper": "#FAFAFA",
    "--mid": "#737373",
    "--rule": "#E2E2E2",
    "--surface": "#F4F4F4",
    "--inverse-bg": "#0A0A0A",
    "--inverse-fg": "#FAFAFA",
    "--accent": "#0A0A0A",
    "--destructive": "#D62828",
    "--success": "#1A7A4A",
  },
  dark: {
    "--ink": "#FAFAFA",
    "--paper": "#0A0A0A",
    "--mid": "#A3A3A3",
    "--rule": "#333333",
    "--surface": "#171717",
    "--inverse-bg": "#FAFAFA",
    "--inverse-fg": "#0A0A0A",
    "--accent": "#FAFAFA",
    "--destructive": "#F05252",
    "--success": "#45A66F",
  },
} as const;

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Monitor;
}> = [
  { value: "system", label: "Theo hệ thống", description: "Dùng cài đặt của thiết bị", Icon: Monitor },
  { value: "light", label: "Sáng", description: "Luôn dùng nền sáng", Icon: Sun },
  { value: "dark", label: "Tối", description: "Luôn dùng nền tối", Icon: Moon },
];

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function applyTheme(preference: ThemePreference) {
  const isDark = preference === "dark"
    || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const resolvedTheme = isDark ? "dark" : "light";
  const root = document.documentElement;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  Object.entries(THEME_VALUES[resolvedTheme]).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const savedPreference = localStorage.getItem(THEME_STORAGE_KEY);
    const initialPreference = isThemePreference(savedPreference) ? savedPreference : "system";
    const timer = window.setTimeout(() => {
      setPreference(initialPreference);
      applyTheme(initialPreference);
    }, 0);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem(THEME_STORAGE_KEY) || "system") === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      window.clearTimeout(timer);
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const selectTheme = (nextPreference: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setPreference(nextPreference);
    applyTheme(nextPreference);
  };

  return (
    <section aria-labelledby="theme-heading" className="mb-6 border border-rule bg-paper p-4">
      <div className="mb-4">
        <h3 id="theme-heading" className="font-medium">Giao diện</h3>
        <p className="mt-1 text-sm text-mid">Chọn giao diện cho thiết bị này.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, description, Icon }) => {
          const isSelected = preference === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => selectTheme(value)}
              className={`relative flex min-h-16 items-center gap-3 border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isSelected ? "border-ink bg-ink text-paper" : "border-rule bg-surface hover:border-ink"}`}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className={`block text-xs ${isSelected ? "text-paper/75" : "text-mid"}`}>{description}</span>
              </span>
              {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
