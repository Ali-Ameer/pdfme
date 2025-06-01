import { Routes, Route, useSearchParams } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import Designer from "./routes/Designer";
import FormAndViewer from "./routes/FormAndViewer";
import MultiPageDesigner from "./routes/MultiPageDesigner";
import Header from "./components/Header";

export default function App() {
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "true";

  return (
    <div className="min-h-screen flex flex-col">
      {!isEmbedded && <Header />}      <Routes>
        <Route path={"/"} element={<Designer />} />
        <Route path={"/designer"} element={<Designer />} />
        <Route path="/form-viewer" element={<FormAndViewer />} />
        <Route path="/multi-page-designer" element={<MultiPageDesigner />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}
