
import { type LoginInput, type AuthResponse, type CreateUserInput, type User } from '../schema';

export declare function login(input: LoginInput): Promise<AuthResponse>;
export declare function register(input: CreateUserInput): Promise<AuthResponse>;
export declare function getCurrentUser(userId: number): Promise<User>;
