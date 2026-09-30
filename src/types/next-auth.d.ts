import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      username: string | null;
      avatarUrl: string | null;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}
