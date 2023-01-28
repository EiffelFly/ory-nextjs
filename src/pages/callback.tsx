import { GetServerSideProps } from "next";
import { FC } from "react";
import { removeCookie, setCookie, SetCookiePayload } from "../lib/cookie";
import { exchangeAccessToken } from "@/lib";
import { handle } from "@/utils";

interface Props {
  status: string;
  error: string;
}

const CallbackPage: FC<Props> = () => {
  return <div />;
};

export default CallbackPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  // When scope and code not in query param, most of the case it is due to we have some
  // error within hydra and hydra send us error query param. The most likely case is user
  // login but forget to accept consent, when it exceed consent life span, the hydra endpoint
  // will response 401 and redirect us to /callback?error=

  console.log("callback", context.query);

  if (!context.query.scope) {
    return {
      redirect: {
        destination: "/oauth",
        permanent: false,
      },
    };
  }

  const scope = context.query.scope.toString();

  if (!context.query.code) {
    return {
      redirect: {
        destination: "/oauth",
        permanent: false,
      },
    };
  }

  const code = context.query.code.toString();

  if (!scope) {
    console.error("It doesn't have necessary scope list in query param");
    return {
      props: {
        error: "It doesn't have necessary scope list in query param",
      },
    };
  }

  if (!code) {
    console.error("It doesn't have necessary code in query param");
    return {
      props: {
        error: "It doesn't have necessary code in query param",
      },
    };
  }

  const scopeList = scope.toString().split(/\s+/);

  const [exchangeTokenError, exchangeTokenResult] = await handle(
    exchangeAccessToken(code, scopeList)
  );

  // The reason we need to stringify and parse JSON this is due to the return props under development
  // env need to get through strict check, sometime it just failed. In case we will face some weird
  // error in the future, we do some additional effort here.
  // https://github.com/vercel/next.js/issues/11993#issuecomment-617937409

  console.log(exchangeTokenError);

  if (exchangeTokenResult) {
    // If there already have instill_token_set cookie, we have to delete it.
    removeCookie(context.res, "instill_token_set");

    console.log("callback, result", exchangeTokenResult);

    const setInstillTokenPayload: SetCookiePayload = {
      res: context.res,
      key: "instill_token_set",
      value: JSON.stringify(exchangeTokenResult),
      domain: context.req.headers.origin
        ? new URL(context.req.headers.origin).hostname
        : null,
      maxAge: 60 * 60 * 8,
      httpOnly: process.env.NODE_ENV === "production" ? true : false,
    };

    setCookie(setInstillTokenPayload);
  }

  return {
    props: {
      status: "success",
    },
  };
};
