export enum UserRole {
  ADMIN = 'ADMIN',
  PROVIDER = 'PROVIDER',
  CLIENT = 'CLIENT',
}

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
