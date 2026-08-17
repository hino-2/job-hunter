import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  EDITABLE_TEXT_FIELDS,
  EMPTY_PENDING_TEXT_VALUES,
  EMPTY_SAVED_FIELDS,
  SAVE_ERROR_FALLBACK_MESSAGE,
} from '../constants/application.constants';
import { SAVED_FLASH_DURATION_MS } from '../constants/layout.constants';
import { AUTOSAVE_DEBOUNCE_MS } from '../constants/query.constants';
import type { ApplicationUpdate } from '../types/application.interfaces';
import type {
  EditableField,
  EditableTextField,
  PendingTextValues,
} from '../types/application.type';
import {
  buildTextFieldPatch,
  isNoopPatch,
  isUrlTextField,
  listPatchedFields,
  readTextFieldValue,
  withDraft,
  withoutDraft,
  withTerminalResultStatus,
} from '../utils/application.utils';
import { readApplicationFromCaches } from '../utils/applications-cache.utils';
import { extractApiErrorMessage } from '../utils/error.utils';
import {
  EMPTY_PENDING_BY_ID,
  EMPTY_SAVED_BY_ID,
  PENDING_KEY_SEPARATOR,
} from './use-inline-edits.constants';
import type {
  InlineEditHandlers,
  InlineEditsController,
  InlineEditsOptions,
} from './use-inline-edits.interfaces';
import type { PendingById, SavedById, TimerId } from './use-inline-edits.type';
import type { UpdateApplicationVariables } from './use-update-application.interfaces';
import { useUpdateApplication } from './useUpdateApplication';

/**
 * Несохранённый ввод и подсветка «сохранено» для всего списка (§7.3).
 *
 * Кэш React Query остаётся единственным носителем сохранённого состояния, а черновик —
 * это то, что пользователь набрал, но ещё не отправил. Черновик живёт ровно от нажатия
 * клавиши до отправки: в момент отправки он удаляется, и поле показывает оптимистичное
 * значение из кэша — тот же самый текст, поэтому мигания нет, зато «догоняющий» ответ
 * сервера уже не может затереть набранное.
 *
 * Состояние держится здесь, а не внутри полей аккордеона, из-за §13.10.7: свернуть
 * аккордеон можно и кликом по шапке, и кнопкой «Свернуть все», а оба пути проходят
 * через App. Черновик внутри компонента полей потребовал бы useEffect на смену пропа
 * expanded, что запрещает react-hooks/set-state-in-effect.
 */
export function useInlineEdits(options: InlineEditsOptions): InlineEditsController {
  const { onError } = options;
  const client = useQueryClient();
  const [pendingById, setPendingById] = useState<PendingById>(EMPTY_PENDING_BY_ID);
  const [savedById, setSavedById] = useState<SavedById>(EMPTY_SAVED_BY_ID);
  // Ref — источник истины по черновикам, состояние — его зеркало для рендера.
  // Обработчику события (flush) нужны актуальные черновики прямо сейчас, а звать mutate
  // внутри функционального апдейтера setState нельзя: в StrictMode апдейтер выполняется дважды.
  const pendingRef = useRef<PendingById>(EMPTY_PENDING_BY_ID);
  const debounceTimersRef = useRef(new Map<string, TimerId>());
  const flashTimersRef = useRef(new Map<string, TimerId>());

  const writePending = useCallback((next: PendingById) => {
    pendingRef.current = next;
    setPendingById(next);
  }, []);

  const clearDebounce = useCallback((id: string, field: EditableTextField) => {
    const key = `${id}${PENDING_KEY_SEPARATOR}${field}`;
    const timer = debounceTimersRef.current.get(key);

    if (timer !== undefined) {
      clearTimeout(timer);
      debounceTimersRef.current.delete(key);
    }
  }, []);

  const setDraft = useCallback(
    (id: string, field: EditableTextField, value: string) => {
      const next: Record<string, PendingTextValues> = { ...pendingRef.current };

      next[id] = withDraft(pendingRef.current[id] ?? EMPTY_PENDING_TEXT_VALUES, field, value);
      writePending(next);
    },
    [writePending],
  );

  const dropDraft = useCallback(
    (id: string, field: EditableTextField) => {
      const current = pendingRef.current[id];

      if (current === undefined) {
        return;
      }

      const rest = withoutDraft(current, field);

      if (rest === current) {
        return;
      }

      const next: Record<string, PendingTextValues> = { ...pendingRef.current };

      // Запись без единого черновика убирается из словаря целиком: пустой объект
      // по id — это лишняя ссылка, которая ломала бы memo соседнего аккордеона.
      if (Object.keys(rest).length === 0) {
        delete next[id];
      } else {
        next[id] = rest;
      }

      writePending(next);
    },
    [writePending],
  );

  const flashFields = useCallback((id: string, fields: readonly EditableField[]) => {
    if (fields.length === 0) {
      return;
    }

    setSavedById((previous) => {
      const merged = new Set(previous[id] ?? EMPTY_SAVED_FIELDS);

      for (const field of fields) {
        merged.add(field);
      }

      return { ...previous, [id]: merged };
    });

    const running = flashTimersRef.current.get(id);

    if (running !== undefined) {
      clearTimeout(running);
    }

    const timer = setTimeout(() => {
      flashTimersRef.current.delete(id);
      setSavedById((previous) => {
        const next: Record<string, ReadonlySet<EditableField>> = { ...previous };

        delete next[id];

        return next;
      });
    }, SAVED_FLASH_DURATION_MS);

    flashTimersRef.current.set(id, timer);
  }, []);

  const handleSaved = useCallback(
    ({ id, patch }: UpdateApplicationVariables) => {
      flashFields(id, listPatchedFields(patch));
    },
    [flashFields],
  );

  const handleFailed = useCallback(
    (error: Error) => {
      onError(extractApiErrorMessage(error, SAVE_ERROR_FALLBACK_MESSAGE));
    },
    [onError],
  );

  const { mutate } = useUpdateApplication({ onSaved: handleSaved, onFailed: handleFailed });

  const save = useCallback(
    (id: string, patch: ApplicationUpdate) => {
      mutate({ id, patch });
    },
    [mutate],
  );

  const sendText = useCallback(
    (id: string, field: EditableTextField, value: string, isFinal: boolean) => {
      clearDebounce(id, field);

      const patch = buildTextFieldPatch(field, value);

      if (patch === null) {
        // Пустая «Компания»: на срабатывании дебаунса черновик оставляем, иначе текст
        // отпрыгнул бы назад прямо во время стирания; на blur и сворачивании — убираем,
        // и поле возвращается к сохранённому значению. Недонабранную ссылку не теряем
        // никогда: стирать её было бы вредительством, она сохранится, как только станет
        // валидной.
        if (isFinal && !isUrlTextField(field)) {
          dropDraft(id, field);
        }

        return;
      }

      // Черновик снимаем, только когда отправляется ровно то, что набрано.
      // buildTextFieldPatch тримит, поэтому на паузе после пробела («abc def ») в патч
      // уходит «abc def»: сняв тут черновик, мы перерисовали бы контролируемый input
      // из кэша, съев пробел и уведя каретку в конец строки. Если же патч ничего
      // не меняет («abc» + пробел), запрос вообще не уйдёт — и пробел исчез бы совсем.
      // На blur и сворачивании черновик снимается всегда: поле обязано прийти
      // к сохранённому, то есть тримленному, значению.
      if (isFinal || value === value.trim()) {
        dropDraft(id, field);
      }

      const cached = readApplicationFromCaches(client, id);

      if (cached !== undefined && isNoopPatch(cached, patch)) {
        return;
      }

      save(id, patch);
    },
    [clearDebounce, dropDraft, client, save],
  );

  const changeText = useCallback(
    (id: string, field: EditableTextField, value: string) => {
      const cached = readApplicationFromCaches(client, id);

      // Возврат к сохранённому значению не должен порождать PATCH (§7.3: «только если
      // значение изменилось»), поэтому и черновик, и таймер снимаются.
      if (cached !== undefined && readTextFieldValue(cached, field) === value) {
        clearDebounce(id, field);
        dropDraft(id, field);

        return;
      }

      setDraft(id, field, value);
      clearDebounce(id, field);

      // Таймер замыкает само значение: каждое нажатие перезапускает его с новейшим
      // текстом, поэтому устаревшего замыкания не бывает.
      const key = `${id}${PENDING_KEY_SEPARATOR}${field}`;
      const timer = setTimeout(() => {
        debounceTimersRef.current.delete(key);
        sendText(id, field, value, false);
      }, AUTOSAVE_DEBOUNCE_MS);

      debounceTimersRef.current.set(key, timer);
    },
    [client, clearDebounce, dropDraft, setDraft, sendText],
  );

  const blurText = useCallback(
    (id: string, field: EditableTextField) => {
      const draft = pendingRef.current[id]?.[field];

      if (draft === undefined) {
        return;
      }

      sendText(id, field, draft, true);
    },
    [sendText],
  );

  // Единственная точка, через которую в PATCH попадает result (Select «Результат» §7.2.2
  // и кнопка «Отказ компании» §7.2.1), — здесь и живёт §3.3-дописка закрытия отклика.
  // Патч дополняется ДО проверки на no-op: у записи с терминальным результатом, но
  // статусом «Открыта» (данные, созданные до правила) повторное сохранение обязано уйти
  // на сервер и дочинить статус.
  const commit = useCallback(
    (id: string, patch: ApplicationUpdate) => {
      const effectivePatch = withTerminalResultStatus(patch);
      const cached = readApplicationFromCaches(client, id);

      if (cached !== undefined && isNoopPatch(cached, effectivePatch)) {
        return;
      }

      save(id, effectivePatch);
    },
    [client, save],
  );

  const flush = useCallback(
    (id: string) => {
      const drafts = pendingRef.current[id];

      if (drafts === undefined) {
        return;
      }

      for (const field of EDITABLE_TEXT_FIELDS) {
        const draft = drafts[field];

        if (draft !== undefined) {
          sendText(id, field, draft, true);
        }
      }
    },
    [sendText],
  );

  const flushAll = useCallback(() => {
    for (const id of Object.keys(pendingRef.current)) {
      flush(id);
    }
  }, [flush]);

  // Единственный эффект хука — уборка таймеров при размонтировании. Значения ref-ов
  // снимаются в теле эффекта: читать ref.current прямо в функции очистки нельзя,
  // к моменту её вызова там уже может быть другая Map.
  useEffect(() => {
    const debounceTimers = debounceTimersRef.current;
    const flashTimers = flashTimersRef.current;

    return () => {
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }

      for (const timer of flashTimers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handlers = useMemo<InlineEditHandlers>(
    () => ({ changeText, blurText, commit, flush, flushAll }),
    [changeText, blurText, commit, flush, flushAll],
  );

  return useMemo(() => ({ pendingById, savedById, handlers }), [pendingById, savedById, handlers]);
}
