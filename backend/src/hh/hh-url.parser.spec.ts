import { VACANCY_EXTERNAL_ID_COLUMN_LENGTH } from '../applications/applications.constants';
import { parseHhVacancyId } from './hh-url.parser';

describe('parseHhVacancyId', () => {
  describe('распознаёт ссылки на вакансию', () => {
    it.each([
      ['канонический вид', 'https://hh.ru/vacancy/12345678'],
      ['региональный поддомен и query', 'https://spb.hh.ru/vacancy/12345678?query=node&from=list'],
      ['другой домен зоны и замыкающий слеш', 'https://hh.kz/vacancy/12345678/'],
      ['http и фрагмент', 'http://hh.ru/vacancy/12345678#responses'],
      ['пробелы по краям', '  https://hh.ru/vacancy/12345678  '],
      ['без схемы', 'hh.ru/vacancy/12345678'],
      ['без схемы, с поддоменом и query', 'nn.hh.ru/vacancy/12345678?from=vacancy_search_list'],
      ['верхний регистр в хосте', 'https://HH.RU/vacancy/12345678'],
      ['вложенный поддомен', 'https://jobs.spb.hh.ru/vacancy/12345678'],
    ])('%s', (_case, url) => {
      expect(parseHhVacancyId(url)).toBe('12345678');
    });

    it.each(['hh.ru', 'hh.kz', 'hh.uz', 'hh1.az', 'rabota.by', 'headhunter.ge', 'headhunter.kg'])(
      'принимает домен %s',
      (host) => {
        expect(parseHhVacancyId(`https://${host}/vacancy/87654321`)).toBe('87654321');
      },
    );
  });

  describe('возвращает null', () => {
    it.each([
      ['пустая строка', ''],
      ['одни пробелы', '   '],
      ['null', null],
      ['undefined', undefined],
      ['не URL вовсе', 'просто текст'],
      ['чужой хост', 'https://career.habr.com/vacancies/1000123456'],
      ['чужой хост, похожий на hh', 'https://hh.ru.evil.com/vacancy/12345678'],
      ['хост, заканчивающийся на hh.ru без точки', 'https://nothh.ru/vacancy/12345678'],
      ['путь без /vacancy', 'https://hh.ru/resume/12345678'],
      ['id не из цифр', 'https://hh.ru/vacancy/abc123'],
      ['id отсутствует', 'https://hh.ru/vacancy/'],
      ['лишний сегмент после id', 'https://hh.ru/vacancy/12345678/responses'],
      ['корень сайта', 'https://hh.ru'],
      ['неподдерживаемая схема', 'mailto:hh.ru/vacancy/12345678'],
      ['javascript-схема', 'javascript:alert(1)'],
      ['ftp', 'ftp://hh.ru/vacancy/12345678'],
      ['ссылка на getmatch.ru', 'https://getmatch.ru/vacancies/35683-middle-fullstack'],
    ])('для случая «%s»', (_case, url) => {
      expect(parseHhVacancyId(url)).toBeNull();
    });

    it('для id длиннее колонки vacancy_external_id', () => {
      const tooLongId = '1'.repeat(VACANCY_EXTERNAL_ID_COLUMN_LENGTH + 1);

      expect(parseHhVacancyId(`https://hh.ru/vacancy/${tooLongId}`)).toBeNull();
    });
  });

  it('принимает id ровно по ширине колонки vacancy_external_id', () => {
    const maxLengthId = '1'.repeat(VACANCY_EXTERNAL_ID_COLUMN_LENGTH);

    expect(parseHhVacancyId(`https://hh.ru/vacancy/${maxLengthId}`)).toBe(maxLengthId);
  });
});
