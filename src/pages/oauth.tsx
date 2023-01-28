import * as cookie from "cookie";
import {
  setCookie,
  SetCookiePayload,
  acceptOAuth2LoginRequest,
  getOAuth2LoginRequest,
  getRedirectToOAuth2LoginUrl,
  getRedirectToLoginUrl,
  getSessionWhoAmI,
} from "@/lib";
import { GetServerSideProps } from "next";
import { AcceptOAuth2LoginRequest } from "@ory/client";
import { handle, isString } from "@/utils";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const allCookies = context.req.headers.cookie;
  let cookieList: { [key: string]: string } = {};

  if (allCookies) {
    cookieList = cookie.parse(allCookies);
  }

  const loginChallenge = context.query.login_challenge;

  if (!loginChallenge) {
    // This is the first time request oauth page, we don't have necessary info, we need to
    // ask hydra give us login challenge

    const redirectUrl = getRedirectToOAuth2LoginUrl();

    return {
      redirect: {
        destination: redirectUrl,
        permanent: false,
      },
    };
  }

  // Once we have login_challenge, we can ask hydra to init the login flow
  // It will give us csrf_token, which we have to pass to Hydra when we submit the flow

  const [getOAuthLoginRequestErr, getOAuthLoginRequestResult] = await handle(
    getOAuth2LoginRequest(loginChallenge.toString())
  );

  if (getOAuthLoginRequestErr) {
    console.error(
      "Something went wrong when try to get OAuth login request",
      getOAuthLoginRequestErr
    );
    // TODO-20211117: Need better error redirect method
  }

  // If hydra was already able to authenticate the user, skip will be true and we do not
  // need to re-authenticate the user.

  if (getOAuthLoginRequestResult && getOAuthLoginRequestResult.data.skip) {
    const acceptLoginRequest = {} as AcceptOAuth2LoginRequest;
    acceptLoginRequest.subject =
      getOAuthLoginRequestResult.data.subject.toString();
    acceptLoginRequest.remember = true;
    acceptLoginRequest.remember_for = 3600;

    // Here is the final frontier, we can setup additional login here to stop
    // evil login our service. We can also apply some logic here, for example
    // update the number of times the user logged in...

    const [acceptHydraLoginErr, acceptHydraLoginRes] = await handle(
      acceptOAuth2LoginRequest(loginChallenge.toString(), acceptLoginRequest)
    );

    if (acceptHydraLoginErr || !acceptHydraLoginRes) {
      console.error(
        "Something went wrong when try to get Hydra login after skip",
        acceptHydraLoginErr
      );
      // TODO-20211117: Need better error redirect method
      return {
        redirect: {
          destination: "/error",
          permanent: false,
        },
      };
    }

    return {
      redirect: {
        destination: acceptHydraLoginRes.data.redirect_to.toString(),
        permanent: false,
      },
    };
  }

  console.log("accept hydra login");

  const hydraLoginState = context.query.hydra_login_state;

  // Here we setup additional security layer with the cost to redirect user again
  // We setup the cookie ourselves, then check it at final part of the auth process,
  // If the query parameter is not matching cookie, we make user re-init the process.

  if (!hydraLoginState || !isString(hydraLoginState)) {
    const currentUrl = new URL(
      context.req.url || "",
      process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
    );

    const { redirectTo, hydraLoginState } = getRedirectToLoginUrl(
      currentUrl.toString()
    );

    const setHydraCookiepayload: SetCookiePayload = {
      res: context.res,
      key: "hydra_login_state",
      value: hydraLoginState,
      domain: context.req.headers.origin
        ? new URL(context.req.headers.origin).hostname
        : null,
      maxAge: 60 * 5,
      httpOnly: process.env.NODE_ENV === "production" ? true : false,
    };

    // The cookie only live 5 minutes
    setCookie(setHydraCookiepayload);

    return {
      redirect: {
        destination: redirectTo,
        permanent: false,
      },
    };
  }

  console.log("get hydra cookie");

  const hydraLoginStateCookie = cookieList.hydra_login_state;

  if (hydraLoginState !== hydraLoginStateCookie) {
    const currentUrl = new URL(
      context.req.url || "",
      process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
    );
    const { redirectTo } = getRedirectToLoginUrl(currentUrl.toString());
    return {
      redirect: {
        destination: redirectTo,
        permanent: false,
      },
    };
  }

  const kratosSessionCookie = cookieList.ory_kratos_session;

  if (!kratosSessionCookie) {
    const currentUrl = new URL(
      context.req.url || "",
      process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
    );
    const { redirectTo } = getRedirectToLoginUrl(currentUrl.toString());
    return {
      redirect: {
        destination: redirectTo,
        permanent: false,
      },
    };
  }

  console.log("get kratos session");

  const [getKratosSessionErr, getKratosSessionRes] = await handle(
    getSessionWhoAmI(kratosSessionCookie)
  );

  if (getKratosSessionErr || !getKratosSessionRes) {
    console.error(
      "Something went wrong when try to get Kratos session whoami",
      getKratosSessionErr
    );
    const currentUrl = new URL(
      context.req.url || "",
      process.env.NEXT_PUBLIC_CONSOLE_BASE_URL
    );
    const { redirectTo } = getRedirectToLoginUrl(currentUrl.toString());
    return {
      redirect: {
        destination: redirectTo,
        permanent: false,
      },
    };
  }

  // Here is the final frontier, we can setup additional login here to stop
  // evil login our service. We can also apply some logic here, for example
  // update the number of times the user logged in...

  let acceptOAuth2LoginRequestRequest: AcceptOAuth2LoginRequest =
    {} as AcceptOAuth2LoginRequest;
  acceptOAuth2LoginRequestRequest.subject = getKratosSessionRes.identity.id;
  acceptOAuth2LoginRequestRequest.context = getKratosSessionRes;
  acceptOAuth2LoginRequestRequest.remember = true;
  acceptOAuth2LoginRequestRequest.remember_for = 3600;

  const [acceptOAuth2LoginErr, acceptOAuth2LoginRes] = await handle(
    acceptOAuth2LoginRequest(
      loginChallenge.toString(),
      acceptOAuth2LoginRequestRequest
    )
  );

  if (acceptOAuth2LoginErr || !acceptOAuth2LoginRes) {
    switch (acceptOAuth2LoginErr.response.status) {
      case 409: {
        // User duplicate the login session, but the login process get interrupt,
        // We have to consider whether to restart the whole process
        console.error(
          "User had duplicated the login process",
          acceptOAuth2LoginErr.response
        );
        break;
      }
      default: {
        console.error(
          "Something went wrong when try to get Hydra login after checking Kratos session",
          acceptOAuth2LoginErr
        );
      }
    }

    return {
      redirect: {
        destination: "/error",
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: acceptOAuth2LoginRes.data.redirect_to,
      permanent: false,
    },
  };
};

const OAuthPage = () => {
  return <div />;
};

export default OAuthPage;
