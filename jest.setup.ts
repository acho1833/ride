import { initMockDb } from '@/lib/mock-db';

beforeAll(async () => {
  await initMockDb();
});
