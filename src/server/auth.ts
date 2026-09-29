import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import type { Provider } from "next-auth/providers";
import { env, features } from "@/lib/env";
import { prisma } from "@/server/db";
import { emailLayout, sendEmail } from "@/server/notifications/email";

const isAdminEmail = (email?: string | null) =>
  Boolean(email && env().ADMIN_EMAILS.includes(email.toLowerCase()));

function providers(): Provider[] {
  const list: Provider[] = [];
  if (features.email()) {
    list.push(
      Nodemailer({
        server: env().EMAIL_SERVER,
        from: env().EMAIL_FROM,
        maxAge: 30 * 60,
        async sendVerificationRequest({ identifier, url }) {
          const sent = await sendEmail({
            to: identifier,
            subject: "Votre lien de connexion PronoFoot",
            text: `Cliquez sur ce lien pour vous connecter à PronoFoot (valable 30 minutes) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
            html: emailLayout({
              title: "Votre lien de connexion",
              body: "<p>Cliquez sur le bouton ci-dessous pour vous connecter. Le lien est valable 30 minutes et ne fonctionne qu'une fois.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>",
              cta: { label: "Me connecter", url },
            }),
          });
          if (!sent) throw new Error("Envoi d'e-mail non configuré (EMAIL_SERVER).");
        },
      }),
    );
  }
  if (features.google()) {
    list.push(
      Google({
        clientId: env().AUTH_GOOGLE_ID,
        clientSecret: env().AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  return list;
}

export const authConfig = (): NextAuthConfig => ({
  adapter: PrismaAdapter(prisma),
  secret: env().AUTH_SECRET,
  trustHost: true,
  session: { strategy: "database", maxAge: 60 * 24 * 3600, updateAge: 24 * 3600 },
  providers: providers(),
  pages: { signIn: "/connexion", verifyRequest: "/connexion/verification", error: "/connexion/erreur" },
  callbacks: {
    async signIn({ user }) {
      // Comptes désactivés par un admin : connexion refusée (y compris l'envoi du lien).
      const address = user.email;
      if (!address) return true;
      const existing = await prisma.user.findUnique({
        where: { email: address.toLowerCase() },
        select: { disabledAt: true },
      });
      return !existing?.disabledAt;
    },
    session({ session, user: adapterUser }) {
      // L'adaptateur Prisma renvoie la ligne complète de la table User.
      const user = adapterUser as typeof adapterUser & {
        role: Role;
        username: string | null;
        avatarUrl: string | null;
        onboardedAt: Date | null;
      };
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.username = user.username;
      session.user.avatarUrl = user.avatarUrl;
      session.user.onboarded = Boolean(user.onboardedAt);
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id && isAdminEmail(user.email)) {
        await prisma.user.updateMany({ where: { id: user.id, role: "USER" }, data: { role: "ADMIN" } });
      }
    },
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth(() => authConfig());
