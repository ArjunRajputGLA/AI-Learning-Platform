import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GitHubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined");

const client = new MongoClient(uri);
const clientPromise = client.connect();

export const authOptions = {
  adapter: null,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        const client = await clientPromise;
        const db = client.db("learning_platform");
        const user = await db.collection("Users").findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return { id: user._id.toString(), email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      async profile(profile, tokens) {
        const nameParts = profile.name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          firstName,
          lastName,
          role: "student",
        };
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      userinfo: {
        params: { fields: "id,name,email,picture" },
      },
      async profile(profile, tokens) {
        const nameParts = profile.name.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || `${profile.id}@facebook-placeholder.com`,
          image: profile.picture?.data?.url || "",
          firstName,
          lastName,
          role: "student",
        };
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: { params: { scope: "read:user user:email" } },
      async profile(profile, tokens) {
        const nameParts = (profile.name || profile.login).split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email || `${profile.id}@github-placeholder.com`,
          image: profile.avatar_url || "",
          firstName,
          lastName,
          role: "student",
        };
      },
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      issuer: "https://www.linkedin.com/oauth",
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      async profile(profile, tokens) {
        const nameParts = (profile.name || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || `${profile.sub}@linkedin-placeholder.com`,
          image: profile.picture || "",
          firstName,
          lastName,
          role: "student",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const client = await clientPromise;
      const db = client.db("learning_platform");

      let dbUser = await db.collection("Users").findOne({ email: user.email });

      if (!dbUser) {
        dbUser = await db.collection("Users").insertOne({
          _id: new ObjectId(),
          email: user.email,
          firstName: user.firstName || user.name?.split(" ")[0] || "User",
          lastName: user.lastName || user.name?.split(" ").slice(1).join(" ") || "",
          role: user.role || "student",
          createdAt: new Date(),
          lastActive: new Date(),
          provider: account?.provider || "credentials",
          providerAccountId: account?.providerAccountId || null,
        });
        user.id = dbUser.insertedId.toString();
      } else {
        await db.collection("Users").updateOne(
          { _id: dbUser._id },
          {
            $set: {
              lastActive: new Date(),
              provider: account?.provider || dbUser.provider || "credentials",
              providerAccountId: account?.providerAccountId || dbUser.providerAccountId,
              firstName: user.firstName || dbUser.firstName,
              lastName: user.lastName || dbUser.lastName,
              role: user.role || dbUser.role,
            },
          }
        );
        user.id = dbUser._id.toString();
      }

      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.role = token.role || "student";
        session.user.email = token.email;
        session.provider = token.provider;
        // Generate JWT for backend
        session.accessToken = jwt.sign(
          { sub: token.sub, email: token.email, role: token.role, provider: token.provider },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '1h' }
        );
      }

      const client = await clientPromise;
      const db = client.db("learning_platform");

      const sessionEntry = {
        userId: session.user.id,
        sessionToken: token.jti,
        expires: new Date(token.exp * 1000),
        createdAt: new Date(),
        provider: session.provider,
      };

      await db.collection("sessions").updateOne(
        { sessionToken: token.jti },
        { $set: sessionEntry },
        { upsert: true }
      );

      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role || "student";
        token.provider = account?.provider;
        token.email = user.email;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes("/auth/signin")) {
        return `${baseUrl}/auth/sign-in`;
      }
      if (url.includes("/auth/error")) {
        return url;
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };