import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Initialize the native Postgres connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Pass the pool to the Prisma driver adapter
const adapter = new PrismaPg(pool);

// 3. Initialize Prisma Client with the adapter
const prisma = new PrismaClient({ adapter });

export default prisma;