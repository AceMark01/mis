

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Briefcase, CheckSquare, Target, Users, MessageSquare, Database, Link, AlertCircle, PlayCircle } from "lucide-react";

const KpikraTable = ({ designation, isAdmin = false, isEmpty = false }) => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Update with your new spreadsheet ID and sheet name
  const SPREADSHEET_ID = "1etr8qZJ1kombkuemFHF59FNqqKUzVgzffg39bXkZTSA";
  const SHEET_NAME = "Dashboard"; // Fixed sheet name - change this to your actual sheet name

  const fetchPendingData = useCallback(async (designationToFetch) => {
    if (!designationToFetch) {
      setPendingTasks([]);
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);
      
      // Fetch from Dashboard sheet instead of designation sheet
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const json = JSON.parse(text.substring(jsonStart, jsonEnd));

      const items = json.table.rows.map((row, rowIndex) => {
        const itemObj = { 
          _id: `${rowIndex}-${Math.random().toString(36).substr(2, 9)}`,
          _rowIndex: rowIndex + 1
        };
        if (row.c) {
          row.c.forEach((cell, i) => {
            itemObj[`col${i}`] = cell?.v ?? cell?.f ?? "";
          });
        }
        return itemObj;
      });

      // Filter data based on designation if needed
      // If you need to filter by designation, uncomment and modify this:
      // const filteredItems = items.filter(item => 
      //   item.col0 === designationToFetch || // Adjust column index as needed
      //   item.col1 === designationToFetch    // Check multiple columns if needed
      // );
      
      setPendingTasks(items);
    } catch (err) {
      if (err.name !== 'AbortError') {
        let errorMessage = err.message;
        
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - please check your internet connection';
        } else if (err.message.includes('404')) {
          errorMessage = 'Data not found for your designation';
        } else if (err.message.includes('403')) {
          errorMessage = 'You do not have permission to view this data';
        }
        
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isEmpty || !designation) {
      setPendingTasks([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    fetchPendingData(designation);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [designation, fetchPendingData, isEmpty]);

  const { firstRowData, row6Data, tableData } = useMemo(() => ({
    firstRowData: pendingTasks[0] || {},
    row6Data: pendingTasks[5] || {},
    tableData: pendingTasks.slice(3) || []
  }), [pendingTasks]);

  // FIXED: Safe string conversion and split for communication team
  const communicationTeam = useMemo(() => {
    const col1Value = row6Data.col1;
    if (!col1Value) return [];
    
    // Convert to string safely and split
    return String(col1Value).split(",").map(item => item.trim()).filter(item => item.length > 0);
  }, [row6Data]);

  const howToCommunicate = row6Data.col2 || "No data available";
  const keyPerson = row6Data.col0 || "No data available";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800">Error Loading Data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button 
              onClick={() => fetchPendingData(designation)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Information Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Role Details</h2>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h3 className="text-sm font-medium text-blue-600 mb-2">Actual Role</h3>
            <p className="text-gray-800">{firstRowData.col1 || "No data available"}</p>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-800">Task Overview</h2>
          </div>
          <div className="bg-white rounded-lg p-6 border border-emerald-100 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-600">{firstRowData.col3 || "0"}</p>
              <p className="text-sm text-gray-600 mt-1">Total Tasks</p>
            </div>
          </div>
        </div>

        {/* Performance Scoring Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-100 p-6 transform transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">Performance Scoring</h2>
          </div>
          <div className="space-y-4">
            {firstRowData.col4 && (
              <a
                href={firstRowData.col4}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-purple-600">How Scoring Works</span>
                </div>
              </a>
            )}
            {firstRowData.col5 && (
              <a
                href={firstRowData.col5}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-purple-600">How To Score Better</span>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Communication Section */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Communication Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">Team Communication</h2>
            </div>
            <div className="bg-white rounded-lg p-4 border border-amber-100">
              <h3 className="text-sm font-medium text-amber-600 mb-3">Communication Team</h3>
              {communicationTeam.length > 0 ? (
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
              ) : (
                <p className="text-gray-500">No team members available</p>
              )}
            </div>
          </div>

          {/* Communication Process Card */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-sm border border-cyan-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-cyan-600" />
              <h2 className="text-lg font-semibold text-gray-800">Communication Process</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-cyan-100">
                <h3 className="text-sm font-medium text-cyan-600 mb-2">How to Communicate</h3>
                <p className="text-gray-700">{howToCommunicate}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-cyan-100">
                <h3 className="text-sm font-medium text-cyan-600 mb-2">Key Person</h3>
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

        {/* Systems Table */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Systems and Resources</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Links
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tableData.length > 0 ? (
                  tableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{row.col0 || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">{row.col1 || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">{row.col2 || "N/A"}</div>
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
                              <span className="text-sm font-medium">System</span>
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
                              <span className="text-sm font-medium">Dashboard</span>
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
                              <span className="text-sm font-medium">Training</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                      No data available
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

export default React.memo(KpikraTable);