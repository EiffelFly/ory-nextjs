import { useCallback, useEffect, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { RecoveryFlow, UpdateRecoveryFlowBody } from "@ory/client";
import { AxiosError } from "axios";
import { UserAuthCard } from "@ory/elements";

import { ory, useHandleError } from "@/lib";

const RecoveryPage: NextPage = () => {
  const [flow, setFlow] = useState<RecoveryFlow>();

  // Get flow information from the URL
  const router = useRouter();
  const handleError = useHandleError();

  const flowId = String(router.query.flow || "");
  const returnTo = String(router.query.return_to || "");

  const getRecoveryFlow = useCallback(
    (id: string) =>
      ory
        .getRecoveryFlow({ id })
        .then(({ data }) => {
          setFlow(data);
        })
        .catch((err: AxiosError) => handleError(err))
        .catch((err: AxiosError) => {
          switch (err.response?.status) {
            case 410:
              // Status code 410 means the request has expired - so let's load a fresh flow!
              router.push("/recovery");
              break;
            case 403:
              // Status code 403 implies some other issue (e.g. CSRF) - let's reload!
              router.push("/recovery");
              break;
            default:
              router.push({
                pathname: "/error",
                query: {
                  error: JSON.stringify(err, null, 2),
                  id: err.response?.data.error?.id,
                  flowType: router.pathname,
                },
              });
          }
        }),
    [handleError, router]
  );

  const createRecoveryFlow = useCallback(
    (returnTo: string) =>
      ory
        .createBrowserRecoveryFlow({
          returnTo: returnTo,
        })
        .then(({ data }) => {
          setFlow(data);
          router.push(`/recovery?flow=${data.id}`, undefined, {
            shallow: true,
          });
        })
        .catch((error: AxiosError) => handleError(error))
        .catch((err: AxiosError) => {
          // If the previous handler did not catch the error it's most likely a form validation error
          if (err.response?.status === 400) {
            // Yup, it is!
            setFlow(err.response?.data);
            return;
          }
        }),
    [handleError, router]
  );

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      getRecoveryFlow(flowId).catch(
        (err: AxiosError) =>
          err.response?.status === 410 ?? createRecoveryFlow(returnTo)
      );
      // if the flow is expired, we create a new one
      return;
    }

    // Otherwise we initialize it
    createRecoveryFlow(returnTo);
  }, [flowId, returnTo, getRecoveryFlow, createRecoveryFlow, router.isReady]);

  const submitFlow = (values: UpdateRecoveryFlowBody) =>
    ory
      .updateRecoveryFlow({
        flow: String(flow?.id),
        updateRecoveryFlowBody: values,
      })
      .then(({ data }) => {
        // Form submission was successful, show the message to the user!
        setFlow(data);
      })
      .catch((error: AxiosError) => handleError(error))
      .catch((err: AxiosError) => {
        // If the previous handler did not catch the error it's most likely a form validation error
        if (err.response?.status === 400) {
          // Yup, it is!
          setFlow(err.response?.data);
          return;
        }

        return Promise.reject(err);
      });

  return flow ? (
    // create a recovery form that dynamically renders based on the flow data using Ory Elements
    <UserAuthCard
      cardImage="/instill-ai-logo.png"
      title={"Recovery"}
      // This defines what kind of card we want to render.
      flowType={"recovery"}
      // we always need the flow data which populates the form fields and error messages dynamically
      flow={flow}
      // the registration card should allow the user to go to the registration page and the login page
      additionalProps={{
        loginURL: "/login",
      }}
      // we might need webauthn support which requires additional js
      includeScripts={true}
      // we submit the form data to Ory
      onSubmit={({ body }) => submitFlow(body as UpdateRecoveryFlowBody)}
    />
  ) : null;
};

export default RecoveryPage;
