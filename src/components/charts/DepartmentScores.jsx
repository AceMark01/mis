import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const DepartmentScores = () => {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [graphImage, setGraphImage] = useState(null); // ✅ NEW STATE

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbytIRV-DZXklx1lhpszAvIEWd1rmNjN9U5M1UmAfK8r2XiDi646W2fVYLS__3DS2aa8_w/exec";

  const processChartData = (rawData) => {
    if (!rawData || rawData.length < 2) return [];
    const headers = rawData[0];
    const rows = rawData.slice(1);

    return rows.map((row) => {
      const item = { department: row[0] || "Unknown" };
      headers.slice(1).forEach((header, index) => {
        const value = row[index + 1];
        if (typeof value === "number") {
          item[header] = value;
        } else if (typeof value === "string") {
          const cleanValue = value.replace("%", "").replace(",", "");
          const numericValue = parseFloat(cleanValue);
          item[header] = isNaN(numericValue) ? 0 : numericValue;
        } else {
          item[header] = 0;
        }
      });
      return item;
    });
  };

  const fetchWithJSONP = () => {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonp_callback_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 5)}`;
      let timeoutId;
      let scriptLoaded = false;

      const cleanup = () => {
        delete window[callbackName];
        const script = document.getElementById(callbackName);
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
        if (timeoutId) clearTimeout(timeoutId);
      };

      window[callbackName] = (response) => {
        scriptLoaded = true;
        cleanup();
        if (response?.status === "success" && response?.rawData) {
          resolve(response);
        } else {
          reject(new Error(response?.error || "Invalid response from server"));
        }
      };

      const script = document.createElement("script");
      script.id = callbackName;
      script.src = `${GOOGLE_SCRIPT_URL}?action=getGraphImage&callback=${callbackName}&timestamp=${Date.now()}`;
      script.async = true;

      script.onerror = () => {
        cleanup();
        reject(new Error("Failed to load Google Apps Script"));
      };

      timeoutId = setTimeout(() => {
        if (!scriptLoaded) {
          cleanup();
          reject(new Error("Request timed out"));
        }
      }, 15000);

      document.head.appendChild(script);
    });
  };

  const processSuccessfulData = (data) => {
    try {
      const [headerRow, ...dataRows] = data.rawData;
      setHeaders(headerRow);
      setTableData(dataRows);
      setChartData(processChartData(data.rawData));
      setStatus(`✅ Loaded ${dataRows.length} departments`);
      setError(null);

      // ✅ HANDLE BASE64 IMAGE
      if (data.departmentScoreGraphImage) {
        setGraphImage(`data:image/png;base64,${data.departmentScoreGraphImage}`);
      } else {
        console.warn("Department Score Graph image not available");
      }
    } catch (err) {
      setError(`Processing error: ${err.message}`);
      setStatus("❌ Failed to process data");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setStatus("🔄 Fetching data...");
    setError(null);
    try {
      const response = await fetchWithJSONP();
      processSuccessfulData(response);
    } catch (err) {
      setError(err.message || "Unknown error");
      setStatus("❌ Failed to fetch data");
      setHeaders([]);
      setTableData([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setTableData([]);
    setHeaders([]);
    setChartData([]);
    setGraphImage(null); // Reset image
    setError(null);
    setStatus("");
    fetchData();
  };

  const renderChartBars = () => {
    if (!headers || headers.length < 2) return null;
    const colors = ["#ffc107", "#f44336", "#2196f3", "#4caf50", "#9c27b0", "#00bcd4", "#ff5722", "#607d8b"];
    return headers.slice(1).map((header, index) => (
      <Bar
        key={`${header}-${index}`}
        dataKey={header}
        fill={colors[index % colors.length]}
        name={header}
      />
    ));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-3 border rounded shadow text-sm text-gray-700">
          <p className="font-semibold">{`Department: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Department Scores Dashboard
        </h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
        <p className="text-sm text-gray-600 mt-2">{status}</p>
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Department Scores Visualization
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="department"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {renderChartBars()}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ IMAGE BLOCK */}
          {graphImage && (
            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Department Graph Image
              </h3>
              <img
                id="departmentScoreGraph"
                src={graphImage}
                alt="Department Score Graph"
                className="max-w-full mx-auto border border-gray-200 rounded shadow"
              />
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Department Data Table</h3>
        {loading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600">Loading department scores...</div>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : tableData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  {headers.map((header, i) => (
                    <th
                      key={i}
                      className="py-3 px-4 border-b border-gray-200 text-left font-semibold text-gray-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {row.map((cell, i) => (
                      <td key={i} className="py-3 px-4 border-b border-gray-200 text-gray-600">
                        {typeof cell === "number" ? cell.toFixed(2) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            <div className="text-lg mb-2">No data available</div>
            <p className="text-sm">Click "Refresh Data" to load department scores</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentScores;
