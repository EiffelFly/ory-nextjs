import "@/styles/globals.css";
import type { AppProps } from "next/app";
/* eslint-disable-next-line import/no-unresolved */
import "@ory/elements/style.css";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
