// @>npm i assert@2.0.0
import * as assert from 'assert';
import { IAuthService } from './task1';

describe('IAuthService', () => {
  let authService: IAuthService;

  beforeEach(() => {
    authService = new IAuthService(); // Assuming a default constructor for IAuthService
  });

  it('should sign up a user successfully', async () => {
    const user = { email: 'test@example.com', password: 'password123' };
    await assert.doesNotReject(authService.signUp(user));
  });

  it('should throw an error for duplicate sign up attempts with the same email', async () => {
    const user = { email: 'test@example.com', password: 'password123' };
    await authService.signUp(user);
    await assert.rejects(authService.signUp(user), /User already exists/);
  });

  it('should log in a user successfully with valid credentials', async () => {
    const user = { email: 'test@example.com', password: 'password123' };
    await authService.signUp(user);
    const loggedInUser = await authService.logIn('test@example.com', 'password123');
    assert.deepStrictEqual(loggedInUser, user);
  });

  it('should throw an error for log in attempts with invalid email or password', async () => {
    const user = { email: 'test@example.com', password: 'password123' };
    await authService.signUp(user);
    await assert.rejects(authService.logIn('test@example.com', 'wrong_password'), /Invalid credentials/);
    await assert.rejects(authService.logIn('nonexistent@example.com', 'password123'), /User not found/);
  });
});