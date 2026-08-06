import { config as loadEnvFile } from 'dotenv';
import { DataSource } from 'typeorm';

import { buildDataSourceOptions } from './typeorm-options.factory';

// Точка входа для TypeORM CLI (migration:generate / migration:run / migration:revert).
// Приложение сюда не заходит — оно конфигурируется через DatabaseModule.
// .env лежит в корне монорепо, а CLI запускается из backend/, отсюда путь ../.env.
// quiet — чтобы в Docker, где .env-файла нет вовсе, dotenv не шумел в логах.
loadEnvFile({ path: '../.env', quiet: true });
loadEnvFile({ path: '.env', quiet: true });

// Ровно ОДИН export DataSource на файл — TypeORM 1.x иначе падает с
// "Given data source file must contain only one export of DataSource instance".
const dataSource = new DataSource(buildDataSourceOptions(process.env));

export default dataSource;
