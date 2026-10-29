import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      name: string;
      email: string;
      role: 'ADMIN' | 'INSTRUCTOR' | 'CUSTOMER';
    };
  }

  interface User {
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'INSTRUCTOR' | 'CUSTOMER';
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'INSTRUCTOR' | 'CUSTOMER';
    id: string;
    firstName: string;
    lastName: string;
    // Absent on tokens issued before this field existed; treated as 0.
    sessionVersion?: number;
  }
}
