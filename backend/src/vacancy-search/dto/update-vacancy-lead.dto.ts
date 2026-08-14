import { IsBoolean } from 'class-validator';

/**
 * Тело PATCH /api/vacancy-leads/:id (§5.7) — ровно одно поле. forbidNonWhitelisted
 * даёт 400 на любое лишнее поле (§5.6), поэтому DTO не расширяется «на будущее».
 */
export class UpdateVacancyLeadDto {
  @IsBoolean()
  hidden!: boolean;
}
