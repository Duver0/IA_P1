export type UserRole = "admin" | "employee" | "medico";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
