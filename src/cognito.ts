// src/cognito.ts — AWS Cognito auth (signup, confirm, login, password reset)
// Requires: AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET

import { createHmac } from "crypto";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "./config";

const client = new CognitoIdentityProviderClient({ region: config.cognito.region });

export class CognitoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

function requireConfig() {
  if (!config.cognito.clientId || !config.cognito.userPoolId) {
    throw new CognitoError(
      "Cognito is not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.",
      "NotConfigured",
      503,
    );
  }
}

/** Cognito SECRET_HASH when the app client has a client secret. */
function secretHash(username: string): string | undefined {
  const secret = config.cognito.clientSecret;
  if (!secret) return undefined;
  return createHmac("sha256", secret)
    .update(username + config.cognito.clientId)
    .digest("base64");
}

function withSecretHash(username: string, extra: Record<string, string> = {}) {
  const hash = secretHash(username);
  return hash ? { ...extra, SECRET_HASH: hash } : extra;
}

function mapAwsError(e: unknown): never {
  const err = e as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const code = err.name || "CognitoError";
  const raw = err.message || "Authentication failed";

  switch (code) {
    case "UsernameExistsException":
      throw new CognitoError("An account with this email already exists", code, 409);
    case "UserNotFoundException":
      throw new CognitoError("Invalid email or password", code, 401);
    case "NotAuthorizedException":
      if (/not\s+confirmed|confirm/i.test(raw)) {
        throw new CognitoError("Please verify your email before signing in", "UserNotConfirmedException", 403);
      }
      throw new CognitoError("Invalid email or password", code, 401);
    case "UserNotConfirmedException":
      throw new CognitoError("Please verify your email before signing in", code, 403);
    case "CodeMismatchException":
      throw new CognitoError("Invalid verification code", code, 400);
    case "ExpiredCodeException":
      throw new CognitoError("This code has expired — request a new one", code, 400);
    case "InvalidPasswordException":
      throw new CognitoError(raw || "Password does not meet requirements", code, 400);
    case "InvalidParameterException":
      throw new CognitoError(raw || "Invalid request", code, 400);
    case "LimitExceededException":
    case "TooManyRequestsException":
      throw new CognitoError("Too many attempts — try again later", code, 429);
    case "CodeDeliveryFailureException":
      throw new CognitoError("Could not send verification email — try again later", code, 502);
    default:
      console.error("[Cognito]", code, raw);
      throw new CognitoError(raw, code, err.$metadata?.httpStatusCode || 500);
  }
}

export async function cognitoSignUp(email: string, password: string, name: string) {
  requireConfig();
  try {
    const hash = secretHash(email);
    const out = await client.send(new SignUpCommand({
      ClientId: config.cognito.clientId,
      Username: email,
      Password: password,
      SecretHash: hash,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
      ],
    }));
    return {
      userSub: out.UserSub || "",
      userConfirmed: !!out.UserConfirmed,
    };
  } catch (e) {
    mapAwsError(e);
  }
}

export async function cognitoConfirmSignUp(email: string, code: string) {
  requireConfig();
  try {
    await client.send(new ConfirmSignUpCommand({
      ClientId: config.cognito.clientId,
      Username: email,
      ConfirmationCode: code.trim(),
      SecretHash: secretHash(email),
    }));
  } catch (e) {
    mapAwsError(e);
  }
}

export async function cognitoResendConfirmationCode(email: string) {
  requireConfig();
  try {
    await client.send(new ResendConfirmationCodeCommand({
      ClientId: config.cognito.clientId,
      Username: email,
      SecretHash: secretHash(email),
    }));
  } catch (e) {
    mapAwsError(e);
  }
}

export interface CognitoAuthResult {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  sub: string;
  email: string;
  name: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) return {};
  const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export async function cognitoInitiateAuth(email: string, password: string): Promise<CognitoAuthResult> {
  requireConfig();
  try {
    const out = await client.send(new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: config.cognito.clientId,
      AuthParameters: withSecretHash(email, {
        USERNAME: email,
        PASSWORD: password,
      }),
    }));

    const result = out.AuthenticationResult;
    if (!result?.AccessToken || !result.IdToken) {
      throw new CognitoError("Authentication incomplete — additional challenge required", "ChallengeRequired", 401);
    }

    const claims = decodeJwtPayload(result.IdToken);
    const sub = String(claims.sub || "");
    const claimEmail = String(claims.email || email).toLowerCase();
    const name = String(claims.name || claims["cognito:username"] || claimEmail);

    return {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      sub,
      email: claimEmail,
      name,
    };
  } catch (e) {
    if (e instanceof CognitoError) throw e;
    mapAwsError(e);
  }
}

export async function cognitoForgotPassword(email: string) {
  requireConfig();
  try {
    await client.send(new ForgotPasswordCommand({
      ClientId: config.cognito.clientId,
      Username: email,
      SecretHash: secretHash(email),
    }));
  } catch (e) {
    // Avoid account enumeration — swallow UserNotFoundException
    const name = (e as { name?: string }).name;
    if (name === "UserNotFoundException") return;
    mapAwsError(e);
  }
}

export async function cognitoConfirmForgotPassword(email: string, code: string, newPassword: string) {
  requireConfig();
  try {
    await client.send(new ConfirmForgotPasswordCommand({
      ClientId: config.cognito.clientId,
      Username: email,
      ConfirmationCode: code.trim(),
      Password: newPassword,
      SecretHash: secretHash(email),
    }));
  } catch (e) {
    mapAwsError(e);
  }
}

/** True when UsernameExistsException likely means unconfirmed (resend succeeded). */
export async function cognitoTryResendForExisting(email: string): Promise<"unconfirmed" | "exists"> {
  try {
    await cognitoResendConfirmationCode(email);
    return "unconfirmed";
  } catch (e) {
    if (e instanceof CognitoError &&
      (e.code === "InvalidParameterException" || e.code === "NotAuthorizedException")) {
      return "exists";
    }
    // Resend failed for other reasons — treat as existing confirmed account
    return "exists";
  }
}
