import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDbOptions } from '../config/typeorm.config.js';

export default new DataSource({
  ...buildDbOptions(process.env),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
});
