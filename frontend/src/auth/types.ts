export type AuthUser = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
};

export type AuthProvider = {
  signIn(): Promise<AuthUser>;
  signOut(): void;
};
