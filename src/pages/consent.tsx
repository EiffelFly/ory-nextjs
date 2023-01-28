import { acceptOAuth2ConsentRequest, getOAuth2ConsentRequest } from "@/lib";
import { handle } from "@/utils";
import axios, { AxiosError } from "axios";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  let consentChallenge =
    context.query.consent_challenge || context.query.challenge;

  if (!consentChallenge) {
    return {
      redirect: {
        destination: "/oauth",
        permanent: false,
      },
    };
  }

  console.log("consent");

  const [getOAuth2ConsentRequestErr, getOAuth2ConsentRequestResult] =
    await handle(getOAuth2ConsentRequest(consentChallenge.toString()));

  if (getOAuth2ConsentRequestErr || !getOAuth2ConsentRequestResult) {
    console.error(
      "Something went wrong when try to get Hydra consent request",
      getOAuth2ConsentRequestErr.response.status
    );

    if (getOAuth2ConsentRequestErr.response.status === 410) {
      return {
        redirect: {
          destination: getOAuth2ConsentRequestErr.response.data.redirect_to,
          permanent: false,
        },
      };
    }

    console.log(
      "consent issue",
      process.env.ORY_API_KEY,
      (getOAuth2ConsentRequestErr as AxiosError).response
    );

    return {
      redirect: {
        destination: "oauth",
        permanent: false,
      },
    };
  }

  if (
    getOAuth2ConsentRequestResult.data.skip ||
    getOAuth2ConsentRequestResult.data.client?.client_name ===
      "Instill Cloud" ||
    getOAuth2ConsentRequestResult.data.client?.client_name === "Instill CLI"
  ) {
    console.log(getOAuth2ConsentRequestResult.data.context);

    const [acceptOAuth2ConsentErr, acceptOAuth2ConsentResult] = await handle(
      acceptOAuth2ConsentRequest(
        consentChallenge.toString(),
        getOAuth2ConsentRequestResult.data.requested_scope || [],
        getOAuth2ConsentRequestResult.data.requested_access_token_audience ||
          [],
        true,
        3000,
        getOAuth2ConsentRequestResult.data.context
      )
    );

    if (acceptOAuth2ConsentErr || !acceptOAuth2ConsentResult) {
      console.log(
        acceptOAuth2ConsentErr,
        (acceptOAuth2ConsentErr as AxiosError).response?.data
      );
      return {
        redirect: {
          destination: "/oauth",
          permanent: false,
        },
      };
    }

    return {
      redirect: {
        destination: acceptOAuth2ConsentResult.data.redirect_to,
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

const ConsentPage = () => {
  return <div />;
};

export default ConsentPage;
