export const getServerSession = jest.fn();

// Mock NextAuth options for compatibility
export const authOptions = {
  providers: [],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    jwt: jest.fn(),
    session: jest.fn(),
  },
};
