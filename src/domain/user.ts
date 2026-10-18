export type UserRole = "customer" | "admin";

/** Default delivery address saved on the account. */
export interface SavedAddress {
  addressLine: string;
  area: string;
  city: string;
  postalCode: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: SavedAddress | null;
  role: UserRole;
  dateOfBirth: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export type NewUser = Omit<UserWithPassword, "id" | "createdAt" | "updatedAt">;
export type UserUpdate = Partial<Pick<User, "name" | "phone" | "role" | "address">>;

export const MIN_AGE = 18;

export function ageOn(dateOfBirth: Date, today: Date = new Date()) {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const beforeBirthday =
    today.getMonth() < dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() < dateOfBirth.getDate());
  if (beforeBirthday) age--;
  return age;
}
