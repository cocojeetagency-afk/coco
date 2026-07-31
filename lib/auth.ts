import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "coco_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export function validUsers(): { username: string; password: string }[] {
  const users = [];
  for (const i of [1, 2]) {
    const username = process.env[`APP_USER_${i}`];
    const password = process.env[`APP_PASS_${i}`];
    if (username && password) users.push({ username, password });
  }
  return users;
}

export async function createSession(username: string) {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<{ username: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;
