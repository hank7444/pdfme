import { Routes, Route, useSearchParams } from "react-router-dom";
import Designer from "./Designer";
import WidgetGroupList from "./WigetGroupList";
import WidgetGroupDesigner from "./WidgetGroupDesigner";
import WidgetDesigner from "./WidgetDesigner";
import FormAndViewer from "./FormAndViewer";
import Templates from "./Templates";
import Header from "./Header";

function App() {
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "true";

  return (
    <div className="min-h-screen flex flex-col">
      {!isEmbedded && <Header />}
      <Routes>
        <Route path="/" element={<Designer />} />
        <Route path="/widget-group-list" element={<WidgetGroupList />} />
        <Route path="/widget-group-designer" element={<WidgetGroupDesigner />} />
        <Route path="/widget-designer" element={<WidgetDesigner />} />
        <Route path="/new-designer" element={<WidgetDesigner />} />
        <Route path="/form-viewer" element={<FormAndViewer />} />
        <Route path="/templates" element={<Templates isEmbedded={isEmbedded} />} />
      </Routes>
    </div>
  );
}

export default App;