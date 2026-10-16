export function createPersistence(
  storage: { setItem(key: string, value: string): Promise<void> },
  onError?: (error: unknown) => void,
  onSaved?: () => void,
): { write(key: string, value: string): Promise<void>; flush(): Promise<void> };
