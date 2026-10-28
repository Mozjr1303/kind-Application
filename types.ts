export enum UserRole {
  ADMIN = 'ADMIN',
  PROVIDER = 'PROVIDER',
  CLIENT = 'CLIENT',
}

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
}

export const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (typeof user.id === 'string' || typeof user.id === 'number') &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    Object.values(UserRole).includes(user.role as UserRole) &&
    (user.status === undefined || typeof user.status === 'string');
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

export interface Job {
  id: string;
  title: string;
  clientName: string;
  date: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  price: number;
  location: string;
}

export interface Service {
  id: string;
  title: string;
  category: string;
  rating: number;
  reviews: number;
  priceStart: number;
  image: string;
  providerName: string;
}

export interface Log {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error';
}
