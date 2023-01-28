import { Configuration, FrontendApi, OAuth2Api } from "@ory/client";
import axiosFactory from "axios";

/**
 * We use a custom axios instance here to add custom error messages on the response.
 * This is not required, but it helps debug issues with the Ory SDK and Ory CLI tunnel.
 * Do not use this in production! Instead, handle the errors according to your application business logic!
 */
const axios = axiosFactory.create({
  withCredentials: true,
});

// Create a new Ory API client
// This will default to the Ory playground project if no environment variable is set.
// Set the `NEXT_PUBLIC_ORY_SDK_URL` to your Ory CLI tunnel e.g. http://localhost:4000
// or on production to the custom domain you have added to your Ory project.
const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || "",
  }),
  "",
  axios
);

const oauth = new OAuth2Api(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || "",
    accessToken: process.env.ORY_API_KEY,
  }),
  "",
  axios
);

export { ory, oauth };
