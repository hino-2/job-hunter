import { readFileSync } from 'node:fs';

const EMPLOYERS = [
  ['01.tech', /01\.tech|1win/gi],
  ['Optimacros', /Optimacros/gi],
  ['Fastdev AB', /Fastdev/gi],
  ['КАРИ', /КАРИ/gi],
  ['Почта России', /Почт[аеы] России/gi],
  ['Банк Нейва', /Нейв[аеы]/gi],
];
const FORBIDDEN = [
  'Next.js',
  'Hono',
  'Drizzle',
  'ClickHouse',
  'Kubernetes',
  'K8S',
  'мультитенант',
  'unit-тест',
  'e2e',
  'Python',
];
const REQUIRED = [
  'TypeScript',
  'React',
  'Node.js',
  'PostgreSQL',
  'Redis',
  'Docker',
  'Kafka',
  'Claude Code',
];

function audit(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const mixed = [];

  for (const sentence of sentences) {
    const hits = EMPLOYERS.filter(([, re]) => {
      re.lastIndex = 0;
      return re.test(sentence);
    }).map(([n]) => n);

    if (hits.length > 1) {
      mixed.push(`[${hits.join(' + ')}] ${sentence.trim().slice(0, 160)}`);
    }
  }

  const forbiddenAsExperience = FORBIDDEN.filter((t) => text.includes(t));
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const company = (text.match(/Clear Mind/gi) ?? []).length;

  const missing = REQUIRED.filter((t) => !text.toLowerCase().includes(t.toLowerCase()));
  const FILLER = [
    'идеальную среду',
    'идеальная среда',
    'дальнейшего роста',
    'качественный и востребованный',
    'помогут вам создать',
    'помогу вам создать',
    'новым вызовом',
    'ваш подход мне близок',
    'будет полезен вашей',
    'на новом уровне',
    'стать частью вашей команды',
    'внести свой вклад',
    'внести пользу',
    'привлекает меня своей ориентацией',
    'заинтересовала меня своей идеей',
    'идеально подходит под ваши требования',
    'спасибо за внимание',
    'продукт будущего',
    'интересные задачи',
    'развиваться вместе',
  ];
  const filler = FILLER.filter((f) => text.toLowerCase().includes(f));
  const OWNERSHIP = [
    /возглавил/gi,
    /веду[щш]им разработчиком/gi,
    /руководил/gi,
    /вёл команду/gi,
    /был архитектором/gi,
    /отвечал за весь проект/gi,
    /выстроил всю/gi,
    /внедрил целую/gi,
    /под моим руководством/gi,
  ];
  const ownership = OWNERSHIP.filter((re) => {
    re.lastIndex = 0;
    return re.test(text);
  }).map((re) => re.source);
  const YEARS =
    /(\d+|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать)\s+(лет|год[аы]?)/gi;
  const years = (text.match(YEARS) ?? []).filter((m) => !/^(11|одиннадцать|15)\s/i.test(m));
  const CLICHE = [
    'богатый опыт',
    'глубокие знания',
    'широкий спектр',
    'успешный опыт',
    'внести значительный вклад',
    'внести вклад в развитие',
    'яркий пример',
    'данный подход',
    'является',
    'осуществлял',
    'позволило значительно повысить',
    'готов поделиться своим опытом',
  ];
  const cliches = CLICHE.filter((c) => text.toLowerCase().includes(c));
  const WORDING = [
    /модел[ьи]s+Claude Code/gi,
    /нейросет[ьи]s+Claude Code/gi,
    /ИИs+Claude Code/gi,
    /совместно с ним/gi,
    /мы с Claude Code/gi,
    /(модель|инструмент) помога/gi,
    /KARI/g,
    /Kari/g,
    /AI-first/gi,
    /AI-driven/gi,
    /AI-powered/gi,
  ];
  const wording = WORDING.filter((re) => {
    re.lastIndex = 0;
    return re.test(text);
  }).map((re) => re.source);

  return {
    words,
    company,
    mixed,
    forbiddenAsExperience,
    missing,
    wording,
    cliches,
    filler,
    ownership,
    years,
  };
}

for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  const r = audit(text);

  console.log('########## ' + file.split(/[\/]/).pop() + ' ##########');
  console.log('слов:', r.words, '| Clear Mind:', r.company);
  console.log('СКЛЕЙКА РАБОТОДАТЕЛЕЙ:', r.mixed.length ? r.mixed.join(' || ') : 'НЕТ');
  console.log(
    'пропущены обязательные:',
    r.missing.length ? r.missing.join(', ') : 'нет, все на месте',
  );
  console.log('вода:', r.filler.length ? r.filler.join(', ') : 'нет');
  console.log('штампы:', r.cliches.length ? r.cliches.join(', ') : 'нет');
  console.log('присвоение роли:', r.ownership.length ? r.ownership.join(', ') : 'нет');
  console.log('подозрительный срок:', r.years.length ? r.years.join(', ') : 'нет');
  console.log('запрещённые написания:', r.wording.length ? r.wording.join(', ') : 'корректны');
  console.log(
    'термины не из резюме:',
    r.forbiddenAsExperience.length ? r.forbiddenAsExperience.join(', ') : 'нет',
  );
  console.log('');
}
