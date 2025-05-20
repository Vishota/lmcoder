interface User {
  username: string;
  email: string;
  passwordHash: string;
  subscriptions?: string[];
}