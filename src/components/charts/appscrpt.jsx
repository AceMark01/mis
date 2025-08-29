import React, { useEffect, useState } from "react";
import {
  Video,
  Users,
  MessageSquare,
  Target,
  Briefcase,
  CheckSquare,
  Users2,
  Database,
  Link,
  PlayCircle,
} from "lucide-react";

const STATICKHEADERS = [
  "System Name",
  "Task Name",
  "Desciption",
  "Training Video Link",
];

const AppScript = () => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const SPREADSHEET_ID = "1etr8qZJ1kombkuemFHF59FNqqKUzVgzffg39bXkZTSA";

  const fetchPendingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Dashboard`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Invalid response format");
      }

      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      if (!data.table || !data.table.rows) {
        throw new Error("No table data found");
      }

      const items = data.table.rows.map((row, rowIndex) => {
        const itemObj = {
          _id: `${rowIndex}-${Math.random().toString(36).substr(2, 9)}`,
          _rowIndex: rowIndex + 1,
        };

        if (row.c) {
          row.c.forEach((cell, i) => {
            itemObj[`col${i}`] = cell?.v ?? cell?.f ?? "";
          });
        }

        return itemObj;
      });

      setPendingTasks(items);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  // Add this new useEffect to log row 6 data
  useEffect(() => {
    if (pendingTasks.length >= 6) {
      const row6 = pendingTasks[5];
    }
  }, [pendingTasks]);

  // Get row 6 data (index 5 because arrays are 0-indexed)
  const row6Data = pendingTasks.length > 2 ? pendingTasks[2] : {};
  // Get first row data
  const firstRowData = pendingTasks.length > 0 ? pendingTasks[0] : {};
  // For communication team - assuming column B (col1) contains team members
  const communicationTeam = row6Data.col1
    ? row6Data.col1.split(",").map((item) => item.trim())
    : ["No data available"];

  const tableData = pendingTasks.length > 4 ? pendingTasks.slice(4) : [];
  // For communication process - assuming column C (col2) contains instructions
  const howToCommunicate = row6Data.col2 || "No data available";

  // For key person - assuming column A (col0) contains the name
  const keyPerson = row6Data.col0 || "No data available";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Information Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Role Details
            </h2>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-medium text-blue-600 mb-2">
              Actual Role
            </h3>
            <p className="text-gray-800">
              {firstRowData.col1 || "No data available"}
            </p>
          </div>
        </div>
        {/* Tasks Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Task Overview
            </h2>
          </div>
          <div className="bg-white rounded-lg p-6 border border-emerald-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-600">
                {firstRowData.col3 || "0"}
              </p>
            </div>
          </div>
        </div>
        {/* Scoring Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Performance Scoring
            </h2>
          </div>
          <div className="space-y-4">
            <a
              href={firstRowData.col4 || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-purple-600">
                  How Scoring Works
                </span>
              </div>
            </a>
            <a
              href={firstRowData.col5 || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-purple-600">
                  How To Score Better
                </span>
              </div>
            </a>
          </div>
        </div>
        {/* Communication Section - Full Width */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Communication Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users2 className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Team Communication
              </h2>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-amber-100">
                <h3 className="text-sm font-medium text-amber-600 mb-3">
                  Communication Team
                </h3>
                <ul className="space-y-2">
                  {communicationTeam.map((member, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <Users className="w-4 h-4 text-amber-500" />
                      <span className="text-gray-700">{member}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Communication Process Card */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-sm border border-cyan-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Communication Process
              </h2>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-cyan-100">
                <h3 className="text-sm font-medium text-cyan-600 mb-2">
                  How to Communicate
                </h3>
                <p className="text-gray-700">{howToCommunicate}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-cyan-100">
                <h3 className="text-sm font-medium text-cyan-600 mb-2">
                  Key Person
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <p className="text-gray-700">{keyPerson}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Systems Table - Full Width */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                Systems and Resources
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {STATICKHEADERS.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tableData.length > 0 ? (
                  tableData.map((row, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {row.col0 || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {row.col1 || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {row.col2 || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {row.col3 && (
                            <a
                              href={row.col3}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Link className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                System
                              </span>
                            </a>
                          )}
                          {row.col4 && (
                            <a
                              href={row.col4}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                              <Database className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Dashboard
                              </span>
                            </a>
                          )}
                          {row.col5 && (
                            <a
                              href={row.col5}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Training
                              </span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={STATICKHEADERS.length}
                      className="px-6 py-4 text-center"
                    >
                      <div className="text-sm text-gray-500">
                        {isLoading ? "Loading data..." : "No data available"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppScript;
