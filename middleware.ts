import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/sign-in",
  },
});

export const config = {
  matcher: [
    "/((?!auth/sign-in|auth/sign-up|/api/:path*|forms/to-do|auth/register|auth/forget-password|auth/reset-password|auth/validate-reset-token|api|_next/static|_next/image|favicon.ico).*)",
  ],
};