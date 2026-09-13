import { redirect } from "next/navigation";
import { auth, signIn, devAuthEnabled } from "@/auth";
import "../login.css";

export const metadata = { title: "Entrar · Mr Tasty Operaciones" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="login">
      <section className="login-card">
        <img src="/brand/logo.png" alt="Mr. Tasty" width={168} height={78} />
        <span className="login-eyebrow">CENTRO DE OPERACIONES</span>
        <h1>Balbín y Perón</h1>
        <p>
          Pedidos, facturas, resultados y equipo de los dos locales de San
          Miguel, en un solo lugar.
        </p>

        {error && (
          <p className="login-error">
            Esa cuenta no tiene acceso. Entrá con un correo autorizado o pedile
            a Juan que sume el tuyo.
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="primary login-button" type="submit">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.2a7.2 7.2 0 0 1 0-4.6V6.5H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1c.9-2.9 3.6-4.8 6.7-4.8Z"
              />
            </svg>
            Entrar con Google
          </button>
        </form>

        {devAuthEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("dev", { redirectTo: "/" });
            }}
          >
            <button className="secondary login-button login-dev" type="submit">
              Entrar en modo desarrollo
            </button>
          </form>
        )}

        <small>Acceso restringido al equipo de Mr Tasty San Miguel.</small>
      </section>
    </main>
  );
}
