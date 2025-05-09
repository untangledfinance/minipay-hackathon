import { FC, ReactNode } from "react";
import Footer from "./Footer";
import Header from "./Header";

interface Props {
  children: ReactNode;
}
const Layout: FC<Props> = ({ children }) => {
  return (
    <>
      <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
        <Header />
        <div className="py-16 w-80 max-w-9xl mx-auto flex-grow space-y-8 sm:px-6 lg:px-8">
          {children}
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Layout;
