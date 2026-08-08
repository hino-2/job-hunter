import { useEffect, useState } from 'react';

/**
 * Значение, отстающее от переданного на delayMs после последнего изменения.
 *
 * Нужно только полю поиска: без задержки каждое нажатие клавиши уходило бы отдельным
 * HTTP-запросом и оседало отдельным ключом в кэше React Query. Переключатели статуса
 * и сортировки дебаунсить не надо — они применяются мгновенно.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
