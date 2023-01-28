import { Identity } from "@ory/client";

export const getUserName = (identity: Identity) => {
  return identity.traits.username;
};

export const getUserEmail = (identity: Identity) => {
  return identity.traits.email;
};

export const QueryParams = (path: string): URLSearchParams => {
  const [, paramString] = path.split("?");
  // get new flow data based on the flow id in the redirect url
  return new URLSearchParams(paramString);
};
