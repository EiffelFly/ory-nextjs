import { NextApiResponse } from "next";
import { serialize } from "cookie";
import { Nullable } from "@/types";
import { ServerResponse } from "http";

export type SetCookiePayload = {
  res: NextApiResponse | ServerResponse;
  value: string;
  key: string;
  domain: Nullable<string>;
  maxAge: number;
  httpOnly: boolean;
};

export const setCookie = ({
  res,
  value,
  key,
  domain,
  maxAge,
  httpOnly,
}: SetCookiePayload) => {
  const cookie = serialize(key, value, {
    maxAge: maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
    httpOnly: httpOnly,
    secure: process.env.NODE_ENV === "production" ? true : false,
    path: "/",
    sameSite: "lax",
    domain: domain ? domain : undefined,
  });

  res.setHeader("Set-Cookie", cookie);
};

export const removeCookie = (
  res: NextApiResponse | ServerResponse,
  key: string
) => {
  const cookie = serialize(key, "", {
    maxAge: -1,
    path: "/",
  });

  res.setHeader("Set-Cookie", cookie);
};
