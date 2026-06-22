import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/expenses";

  if (session?.user) redirect(callbackUrl);

  return (
    <div className="hero min-h-[calc(100vh-4rem)]">
      <div className="hero-content w-full max-w-md flex-col">
        <div className="card bg-base-200 w-full shadow-xl">
          <div className="card-body items-center text-center">
            <h1 className="card-title text-3xl">Welcome to home</h1>
            <p className="opacity-70">Sign in to track your household expenses.</p>

            {params.error === "AccessDenied" && (
              <div role="alert" className="alert alert-error mt-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>This Google account is not authorized to use this app.</span>
              </div>
            )}

            <form
              className="mt-6 w-full"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackUrl });
              }}
            >
              <button type="submit" className="btn btn-block bg-white text-black hover:bg-gray-100 border-base-300">
                <GoogleLogo />
                Continue with Google
              </button>
            </form>

            <p className="mt-4 text-xs opacity-50">
              Only authorized accounts can sign in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
