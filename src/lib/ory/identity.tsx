import { Session } from "@ory/client";
import crypto from "crypto";
import { ory } from "./sdk";

export const getRedirectToLoginUrl = (
  currentURL: string
): { redirectTo: string; hydraLoginState: string } => {
  const state = crypto.randomBytes(48).toString("hex");

  const returnTo = new URL(
    currentURL,
    process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
  );
  returnTo.searchParams.set("hydra_login_state", state);

  const redirectTo = new URL(
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_ORY_TUNNEL_URL + "/self-service/login/api"
      : process.env.NEXT_PUBLIC_ORY_SDK_URL + "/self-service/login/api"
  );
  redirectTo.searchParams.set("refresh", "false");
  redirectTo.searchParams.set("return_to", returnTo.toString());

  return { redirectTo: redirectTo.toString(), hydraLoginState: state };
};

export const getSessionWhoAmI = async (cookies: string): Promise<Session> => {
  try {
    const res = await ory.toSession({
      xSessionToken: undefined,
      cookie: cookies,
    });
    return Promise.resolve(res.data);
  } catch (err) {
    return Promise.reject(err);
  }
};
