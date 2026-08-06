import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { buildDataSourceOptions } from './typeorm-options.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(process.env),
    }),
  ],
})
export class DatabaseModule {}
