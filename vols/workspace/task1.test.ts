// @npm i jsonwebtoken@8.5.1 bcryptjs@2.4.3
import assert from 'assert';
import { authenticate } from './task1';
import * as bcrypt from 'bcryptjs';

describe('authenticate', () => {
  it('should return a JWT token for valid credentials', async () => {
    const username = 'testUser';
    const password = 'password123';
    await registerUser(username, password); // assuming this function is used to create a user with bcrypt-hashed password in the database

    const token = await authenticate(username, password);
    assert.ok(token);
  });

  it('should return null for invalid credentials', async () => {
    const username = 'testUser';
    const password = 'password123';
    await registerUser(username, password); // assuming this function is used to create a user with bcrypt-hashed password in the database

    const token = await authenticate(username, 'wrongPassword');
    assert.equal(token, null);
  });

  it('should return null for non-existent users', async () => {
    const username = 'nonexistentUser';
    const password = 'password123';

    const token = await authenticate(username, password);
    assert.equal(token, null);
  });
});

// assuming this function is used to create a user with bcrypt-hashed password in the database
async function registerUser(username: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  // save username and hashedPassword to the database
}