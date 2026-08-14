import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApplicationsModule } from './applications/applications.module';
import { ENV_FILE_PATHS } from './config/config.constants';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { VacancySearchModule } from './vacancy-search/vacancy-search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ENV_FILE_PATHS,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    ApplicationsModule,
    HealthModule,
    SchedulerModule,
    VacanciesModule,
    VacancySearchModule,
  ],
})
export class AppModule {}
