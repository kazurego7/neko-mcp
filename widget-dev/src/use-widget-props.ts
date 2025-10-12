import { useOpenAiGlobal } from "./use-openai-global";
import type { UnknownObject } from "./types";

export function useWidgetProps<T extends UnknownObject>(defaultState?: T | (() => T)): T {
  const props = useOpenAiGlobal("toolOutput") as T | null;

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return props ?? fallback ?? ({} as T);
}
