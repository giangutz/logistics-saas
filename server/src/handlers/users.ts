
import { type User, type CreateUserInput, type UpdateUserInput } from '../schema';

export declare function createUser(input: CreateUserInput): Promise<User>;
export declare function getUsers(): Promise<User[]>;
export declare function getUserById(id: number): Promise<User>;
export declare function updateUser(input: UpdateUserInput): Promise<User>;
export declare function deleteUser(id: number): Promise<void>;
export declare function getClientUsers(): Promise<User[]>;
