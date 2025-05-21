// @>npm i bcryptjs@^2.4.3 jsonwebtoken@^8.5.1 @types/bcryptjs@^3.0.0 @types/jsonwebtoken@^8.5.1
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Replace this with a real user database or data source
const users = new Map<string, string>(); // username -> hashed password
users.set('test', bcrypt.hashSync('password123', 8));

export async function authenticate(username: string, password: string): Promise<string | null> {
    const hashedPassword = users.get(username);
    if (!hashedPassword) return null;

    const match = await bcrypt.compare(password, hashedPassword);
    if (!match) return null;

    // Replace this with a real secret key and expiry time
    const token = jwt.sign({ username }, 'secret-key', { expiresIn: '1h' });
    return token;
}