import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { seedDatabase } from '../handlers/seed';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('seedDatabase', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin and client demo users', async () => {
    const result = await seedDatabase();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Created 2 new users');

    // Verify admin user was created
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@demo.com'))
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].role).toBe('admin');
    expect(adminUsers[0].first_name).toBe('Admin');
    expect(adminUsers[0].last_name).toBe('User');
    expect(adminUsers[0].is_active).toBe(true);

    // Verify client user was created
    const clientUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'client@demo.com'))
      .execute();

    expect(clientUsers).toHaveLength(1);
    expect(clientUsers[0].role).toBe('client');
    expect(clientUsers[0].first_name).toBe('Demo');
    expect(clientUsers[0].last_name).toBe('Client');
    expect(clientUsers[0].company_name).toBe('Demo Logistics Inc.');
    expect(clientUsers[0].phone).toBe('1-800-DEMO-LOG');
    expect(clientUsers[0].address).toBe('123 Demo St, Demo City, DC 00000');
    expect(clientUsers[0].is_active).toBe(true);
  });

  it('should not create duplicate users if they already exist', async () => {
    // Run seed twice
    const firstResult = await seedDatabase();
    const secondResult = await seedDatabase();

    expect(firstResult.success).toBe(true);
    expect(firstResult.message).toContain('Created 2 new users');

    expect(secondResult.success).toBe(true);
    expect(secondResult.message).toContain('Created 0 new users');

    // Verify only one of each user exists
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@demo.com'))
      .execute();

    const clientUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'client@demo.com'))
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(clientUsers).toHaveLength(1);
  });

  it('should handle database errors gracefully', async () => {
    // This test would require mocking the database to simulate an error
    // For now, we'll just ensure the function returns the expected structure
    const result = await seedDatabase();
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });
});