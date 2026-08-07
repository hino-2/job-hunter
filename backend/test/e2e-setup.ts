import { applyTestEnvironment } from './test-environment';

/**
 * Jest setupFiles: выполняется в каждом воркере ДО импорта модулей спеки,
 * то есть до того, как AppModule и ConfigModule прочитают process.env.
 */
applyTestEnvironment();
