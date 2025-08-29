import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const VerticalBarChart = ({ title = "Vertical Bar Chart" }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY/gviz/tq?tqx=out:json&sheet=Department Score Graph"
        );
        const text = await response.text();

        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        const jsonData = text.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonData);

        if (data?.table?.rows) {
          for (const row of data.table.rows) {
            const cell = row.c?.[12]; // Column M
            if (!cell) continue;

            const formula = cell.f || "";
            const value = cell.v || "";

            if (formula.includes("IMAGE(")) {
              const urlMatch = formula.match(/IMAGE\(["']?([^"')]+)/);
              if (urlMatch && urlMatch[1]) {
                setImageUrl(urlMatch[1].replace(/^["']|["']$/g, ""));
                return;
              }
            } else if (
              typeof value === "string" &&
              value.match(/^https?:\/\//)
            ) {
              setImageUrl(value);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading)
    return <div className="p-4 text-center">Loading chart data...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="relative bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      {imageUrl ? (
        <div className="mb-4">
          <img
            src={imageUrl}
            alt="Department Score Chart"
            className="w-full max-h-96 object-contain rounded"
            onError={(e) => {
              e.target.style.display = "none";
              setError("Chart image failed to load");
            }}
          />
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          No chart image found in the spreadsheet
        </div>
      )}
      {/* ---------------------------vchshcs-------------------------- */}
    </div>
  );
};

VerticalBarChart.propTypes = {
  title: PropTypes.string,
};

export default VerticalBarChart;
