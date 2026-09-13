import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/**
 * Acceso a la app.
 *
 * Entra quien tenga una cuenta de Google incluida en ALLOWED_EMAILS. Si la
 * variable no está cargada no entra nadie: preferimos dejar a todos afuera
 * antes que abrir los números de los locales por un descuido de configuración.
 */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Atajo para trabajar en la máquina propia sin dar de alta un cliente OAuth.
 *
 * Tiene dos candados independientes y hacen falta los dos: que la app no esté
 * compilada para producción y que la variable esté puesta a mano. Vercel
 * compila siempre con NODE_ENV=production, así que este proveedor no existe
 * en el sitio publicado ni aunque alguien cargue la variable por error.
 */
export const devAuthEnabled =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    ...(devAuthEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Modo desarrollo",
            credentials: {},
            authorize: () => ({
              id: "dev-local",
              name: "Desarrollo local",
              email: allowedEmails()[0] ?? "dev@local",
            }),
          }),
        ]
      : []),
  ],
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ account, profile }) {
      if (devAuthEnabled && account?.provider === "dev") return true;

      const email = profile?.email?.toLowerCase();
      const allowed = allowedEmails();
      if (!email || allowed.length === 0) return false;
      return allowed.includes(email);
    },
  },
});
