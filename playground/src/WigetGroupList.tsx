import { useEffect, useState } from "react";
import { WidgetGroup } from "./WidgetGroupDesigner/types"




const WidgetGroupList = () => {

  const [widgetGroups, setWidgetGroups] = useState<WidgetGroup[]>([]);

  useEffect(() => {

    try {
      const widgetGroupsFromLocal = localStorage.getItem("widgetGroups");

      if (widgetGroupsFromLocal) {
        const widgetGroups = JSON.parse(widgetGroupsFromLocal);
        setWidgetGroups(widgetGroups);
      }
    } catch {
      localStorage.removeItem("widgetGroups");
    }

  }, [])

  return (
    <div className="container mx-auto p-4">
      {/* "Create Widget Group" 按鈕 */}
      <div className="flex justify-end mb-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => {
          location.href = './widget-group-designer';
        }}>
          Create Widget Group
        </button>
      </div>

      {/* List View */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {widgetGroups.map((widgetGroup) => (
              <tr key={widgetGroup.id} className="border-b">
                <td className="px-4 py-2">{widgetGroup.name}</td>
                <td className="px-4 py-2">
                  <a
                    href={`/widget-designer?widgetGroupId=${widgetGroup.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 inline-block"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M17.75 2.75a2.75 2.75 0 00-3.125-.625l-9.5 9.5a2.75 2.75 0 00-.625 3.125l1.125 1.125a2.75 2.75 0 003.125-.625l9.5-9.5a2.75 2.75 0 00-.625-3.125L17.75 2.75z" />
                      <path d="M15.65 4.35a.75.75 0 011.06 1.06l-1.5 1.5a.75.75 0 01-1.06-1.06l1.5-1.5z" />
                    </svg>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WidgetGroupList;