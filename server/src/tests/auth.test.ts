
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { login, register, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test data
const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'client',
  company_name: 'Test Company',
  phone: '+1234567890',
  address: '123 Test St'
};

const testAdminInput: CreateUserInput = {
  email: 'admin@example.com',
  password: 'adminpass123',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  company_name: null,
  phone: null,
  address: null
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new client user', async () => {
    const result = await register(testUserInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^token_\d+_\d+$/);

    // Verify user data
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.first_name).toBe('John');
    expect(result.user.last_name).toBe('Doe');
    expect(result.user.role).toBe('client');
    expect(result.user.company_name).toBe('Test Company');
    expect(result.user.phone).toBe('+1234567890');
    expect(result.user.address).toBe('123 Test St');
    expect(result.user.is_active).toBe(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
  });

  it('should register a new admin user', async () => {
    const result = await register(testAdminInput);

    expect(result.user.email).toBe('admin@example.com');
    expect(result.user.first_name).toBe('Admin');
    expect(result.user.last_name).toBe('User');
    expect(result.user.role).toBe('admin');
    expect(result.user.company_name).toBeNull();
    expect(result.user.phone).toBeNull();
    expect(result.user.address).toBeNull();
    expect(result.user.is_active).toBe(true);
  });

  it('should save user to database with hashed password', async () => {
    const result = await register(testUserInput);

    // Verify user was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.password_hash).toBe('hashed_password123');
    expect(savedUser.first_name).toBe('John');
    expect(savedUser.role).toBe('client');
    expect(savedUser.is_active).toBe(true);
  });

  it('should throw error when user already exists', async () => {
    // Create first user
    await register(testUserInput);

    // Try to create same user again
    await expect(register(testUserInput)).rejects.toThrow(/user already exists/i);
  });
});

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login existing user', async () => {
    // First register a user
    await register(testUserInput);

    // Then login
    const result = await login(testLoginInput);

    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^token_\d+_\d+$/);

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.first_name).toBe('John');
    expect(result.user.last_name).toBe('Doe');
    expect(result.user.role).toBe('client');
    expect(result.user.is_active).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const invalidLogin: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(login(invalidLogin)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for empty password', async () => {
    // Register user first
    await register(testUserInput);

    const invalidLogin: LoginInput = {
      email: 'test@example.com',
      password: ''
    };

    await expect(login(invalidLogin)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for inactive user', async () => {
    // Register user first
    const registerResult = await register(testUserInput);

    // Deactivate user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, registerResult.user.id))
      .execute();

    // Try to login
    await expect(login(testLoginInput)).rejects.toThrow(/account is deactivated/i);
  });
});

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by id', async () => {
    // Register user first
    const registerResult = await register(testUserInput);
    const userId = registerResult.user.id;

    // Get current user
    const result = await getCurrentUser(userId);

    expect(result.id).toBe(userId);
    expect(result.email).toBe('test@example.com');
    expect(result.first_name).toBe('John');
    expect(result.last_name).toBe('Doe');
    expect(result.role).toBe('client');
    expect(result.company_name).toBe('Test Company');
    expect(result.phone).toBe('+1234567890');
    expect(result.address).toBe('123 Test St');
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999;

    await expect(getCurrentUser(nonExistentUserId)).rejects.toThrow(/user not found/i);
  });

  it('should return inactive user', async () => {
    // Register user first
    const registerResult = await register(testUserInput);
    const userId = registerResult.user.id;

    // Deactivate user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, userId))
      .execute();

    // Get current user should still work
    const result = await getCurrentUser(userId);

    expect(result.id).toBe(userId);
    expect(result.is_active).toBe(false);
  });
});
