import { NextPage } from "next";
import { useEffect } from "react";
import { useLogoutLink } from "@/lib";

const LogoutPage: NextPage = () => {
  const onLogout = useLogoutLink();

  useEffect(() => {
    onLogout();
  }, [onLogout]);

  return <div />;
};

export default LogoutPage;
