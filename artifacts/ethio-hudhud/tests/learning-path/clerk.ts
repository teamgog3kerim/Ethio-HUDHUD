// The only substituted UI dependency. Authentication itself is not under test.
export const useAuth = () => ({ isSignedIn: false });
export const useClerk = () => ({ signOut: async () => {} });
