import type { DataSourceOptions } from 'typeorm';

const required = (env: NodeJS.ProcessEnv, key: string): string => {
  const value = env[key];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${key}`);
  }
  return value;
};

export const buildDbOptions = (env: NodeJS.ProcessEnv): DataSourceOptions => ({
  type: 'postgres',
  host: required(env, 'DB_HOST'),
  port: Number(required(env, 'DB_PORT')),
  username: required(env, 'DB_USER'),
  password: required(env, 'DB_PASSWORD'),
  database: required(env, 'DB_NAME'),
  synchronize: false,
});
