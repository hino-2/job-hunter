import { ValidateIf } from 'class-validator';

/**
 * Пропускает валидацию только когда поле вообще не пришло в теле запроса.
 *
 * Отличается от @IsOptional(), который пропускает и null, и undefined.
 * Нужен для non-nullable полей, опциональных в PATCH (company, status, result):
 * отсутствие ключа — законное «не трогать поле», а явный null — ошибка 400,
 * а не попытка записать null в NOT NULL колонку (иначе получили бы 500).
 */
export function SkipIfUndefined(): PropertyDecorator {
  return ValidateIf((_object: unknown, value: unknown) => value !== undefined);
}
