import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth } from "../lib/firebase";

export async function registerWithEmail(
  fullName: string,
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  await updateProfile(credential.user, {
    displayName: fullName.trim(),
  });

  await sendEmailVerification(credential.user);

  return credential.user;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  return credential.user;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  if (user.emailVerified) {
    throw new Error("This email address is already verified.");
  }

  await sendEmailVerification(user);
}

export async function sendPasswordReset(
  email: string,
): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function getFreshIdToken(): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  return user.getIdToken(true);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
