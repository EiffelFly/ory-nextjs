import { AcceptOAuth2LoginRequest } from "@ory/client";
import crypto from "crypto";
import { oauth } from "./sdk";
import {
  AccessToken,
  AuthorizationCode,
  AuthorizationTokenConfig,
  ModuleOptions,
} from "simple-oauth2";

export const getRedirectToOAuth2LoginUrl = (): string => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const state = crypto.randomBytes(24).toString("hex");

  const redirectTo = new URL(
    "/oauth2/auth",
    process.env.NEXT_PUBLIC_ORY_SDK_URL || ""
  );

  redirectTo.searchParams.set("audience", process.env.OAUTH_AUDIENCE || "");
  redirectTo.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID || "");
  redirectTo.searchParams.set("max_age", "0");
  redirectTo.searchParams.set("nonce", nonce);

  const redirectUri = new URL(
    "/callback",
    process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
  );

  redirectTo.searchParams.set("redirect_uri", redirectUri.toString());

  redirectTo.searchParams.set("response_type", "code");
  redirectTo.searchParams.set("scope", process.env.OAUTH_CLIENT_SCOPE || "");
  redirectTo.searchParams.set("state", state);

  return redirectTo.toString();
};

export const getOAuth2LoginRequest = async (loginChallenge: string) => {
  try {
    const oAuthLoginRequestResponse = await oauth.getOAuth2LoginRequest({
      loginChallenge,
    });
    return Promise.resolve(oAuthLoginRequestResponse);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const acceptOAuth2LoginRequest = async (
  loginChallenge: string,
  acceptOAuth2LoginRequest: AcceptOAuth2LoginRequest
) => {
  try {
    const res = await oauth.acceptOAuth2LoginRequest({
      loginChallenge,
      acceptOAuth2LoginRequest,
    });
    return Promise.resolve(res);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const getOAuth2ConsentRequest = async (consentChallenge: string) => {
  try {
    const res = await oauth.getOAuth2ConsentRequest({ consentChallenge });
    return Promise.resolve(res);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const acceptOAuth2ConsentRequest = async (
  consentChallenge: string,
  grantScope: string[],
  requestedAccessTokenAudience: string[],
  remember: boolean,
  rememberFor: number,
  context: any
) => {
  try {
    const res = oauth.acceptOAuth2ConsentRequest({
      consentChallenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: grantScope,
        // ORY Hydra checks if requested audiences are allowed by the client, so we can
        // simply echo this.
        grant_access_token_audience: requestedAccessTokenAudience,
        // This tells hydra to remember this consent request and allow the same client to
        // request the same scopes from the same user, without showing the UI, in the future.
        remember: remember,
        remember_for: rememberFor,

        // You can uncomment username to embed the username into token
        session: {
          id_token: {
            email: context ? context.identity?.traits?.email : undefined,
            // username: context.identity?.traits?.username,
          },
          // access_token: {
          //   username: context.identity?.traits?.username,
          // },
        },
      },
    });
    return Promise.resolve(res);
  } catch (err) {
    return Promise.reject(err);
  }
};

export const initOauthClinet = (): AuthorizationCode => {
  if (!process.env.OAUTH_CLIENT_SECRET) {
    throw new Error("Env var OAUTH_CLIENT_SECRET is missing");
  }

  if (!process.env.OAUTH_CLIENT_ID) {
    throw new Error("Env var OAUTH_CLIENT_ID is missing");
  }

  const config: ModuleOptions = {
    client: {
      id: process.env.OAUTH_CLIENT_ID,
      secret: process.env.OAUTH_CLIENT_SECRET,
    },
    auth: {
      tokenHost: process.env.NEXT_PUBLIC_ORY_SDK_URL || "",
      tokenPath: "/oauth2/token",
    },
    http: {
      json: "true",
    },
  };

  console.log(config);

  return new AuthorizationCode(config);
};

export const exchangeAccessToken = async (
  code: string,
  scope: string[] | string
): Promise<AccessToken> => {
  const client = initOauthClinet();

  const tokenParams: AuthorizationTokenConfig = {
    code: code,
    redirect_uri: new URL(
      "/callback",
      process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
    ).toString(),
    scope: scope,
  };

  try {
    const accessToken = await client.getToken(tokenParams);
    return Promise.resolve(accessToken);
  } catch (error) {
    return Promise.reject(error);
  }
};
