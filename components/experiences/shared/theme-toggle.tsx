"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type ThemeValue = "light" | "dark" | "system";

const themeOptions: Array<{
  value: ThemeValue;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function normalizeTheme(value: string | undefined): ThemeValue {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const activeTheme = isHydrated ? normalizeTheme(theme) : "system";
  const activeThemeOption = themeOptions.find((option) => option.value === activeTheme) ?? themeOptions[2];
  const ActiveIcon = activeThemeOption.icon;
  const nextTheme =
    activeTheme === "system" ? "light" : activeTheme === "light" ? "dark" : "system";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setTheme(nextTheme)}
      className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
      aria-label={`Theme: ${activeThemeOption.label}. Click to switch to ${nextTheme} theme.`}
      title={`Theme: ${activeThemeOption.label}`}
    >
      <ActiveIcon className="size-3.5" />
      <span>{activeThemeOption.label}</span>
    </Button>
  );
}
