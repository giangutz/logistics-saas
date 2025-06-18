
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type AuthResponse, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // In a real implementation, you would verify the password hash
    // For now, we'll just check if password is provided
    if (!input.password) {
      throw new Error('Invalid credentials');
    }

    // Generate a simple token (in production, use JWT or similar)
    const token = `token_${user.id}_${Date.now()}`;

    return {
      user: {
        ...user,
        // Convert numeric fields if any exist
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const register = async (input: CreateUserInput): Promise<AuthResponse> => {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }

    // In a real implementation, you would hash the password
    const passwordHash = `hashed_${input.password}`;

    // Create user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        company_name: input.company_name,
        phone: input.phone,
        address: input.address,
        is_active: true
      })
      .returning()
      .execute();

    const user = result[0];

    // Generate a simple token
    const token = `token_${user.id}_${Date.now()}`;

    return {
      user: {
        ...user,
        // Convert numeric fields if any exist
      },
      token
    };
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const getCurrentUser = async (userId: number): Promise<User> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    return {
      ...user,
      // Convert numeric fields if any exist
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
};
