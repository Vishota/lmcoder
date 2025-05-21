// @>npm i bcryptjs@2.4.3 jsonwebtoken@8.5.1
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

interface User {
  id: string;
  email: string;
  password: string;
}

class AuthService implements IAuthService {
  private users: User[] = [];
  private secretKey: string = 'your-secret-key'; // replace with your actual secret key

  async signUp(user: User): Promise<void> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    this.users.push({ ...user, password: hashedPassword });
  }

  async logIn(email: string, password: string): Promise<User> {
    const user = this.users.find((u) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.id }, this.secretKey, { expiresIn: '1h' });
    console.log(`User ${user.email} logged in successfully. Token: ${token}`);

    return user;
  }
}

export default AuthService;