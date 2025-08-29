
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const HalfCircleChart = ({
  colors = ["#4DA9A6", "#418FBC", "#8C6EC6", "#CC855C", "#CC6B7C"]
}) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  });

  const [isLoading, setIsLoading] = useState(true);

  const columnHeaders = {
    D: "Target",
    F: "Initial Score",
    G: "Secondary Score",
    I: "Tertiary Score",
    J: "Final Score"
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY/gviz/tq?tqx=out:json&sheet=For Records"
        );
        const text = await response.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        const jsonData = text.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonData);

        if (data?.table?.rows) {
          const scoreMap = new Map();

          // Helper function to get column index from letter (A=0, B=1, etc.)
          const getColumnIndex = (letter) => letter.charCodeAt(0) - 65;

          data.table.rows.forEach((row) => {
            // Skip if column D (Target) is 0 or empty (index 3)
            const columnD = parseFloat(row.c?.[3]?.v) || 0;
            if (columnD === 0) return;

            // Get name from column C (index 2)
            const nameCell = row.c?.[2]?.v;
            let name = "";

            if (typeof nameCell === "string") {
              name = nameCell.trim();
            } else if (nameCell && typeof nameCell === "object") {
              name = nameCell.label || "";
            }

            if (!name) return;

            // Priority order: F -> G -> I -> J
            let score = 0;
            let scoreSource = "";
            let originalValue = null;

            // Check column F (index 5)
            const columnF = parseFloat(row.c?.[5]?.v) || 0;
            if (columnF > 0) {
              score = columnF;
              scoreSource = "F";
              originalValue = row.c?.[5]?.v;
            }

            // If column F has same value as others, check column G (index 6)
            if (score === 0 || hasSameValue(scoreMap, score, 'F')) {
              const columnG = parseFloat(row.c?.[6]?.v) || 0;
              if (columnG > 0) {
                score = columnG;
                scoreSource = "G";
                originalValue = row.c?.[6]?.v;
              }
            }

            // If column G has same value or still 0, check column I (index 8)
            if (score === 0 || hasSameValue(scoreMap, score, 'G')) {
              const columnI = parseFloat(row.c?.[8]?.v) || 0;
              if (columnI > 0) {
                score = columnI;
                scoreSource = "I";
                originalValue = row.c?.[8]?.v;
              }
            }

            // Final fallback to column J (index 9)
            if (score === 0 || hasSameValue(scoreMap, score, 'I')) {
              const columnJ = parseFloat(row.c?.[9]?.v) || 0;
              if (columnJ > 0) {
                score = columnJ;
                scoreSource = "J";
                originalValue = row.c?.[9]?.v;
              }
            }

            if (score > 0) {
              // Store score with source information
              scoreMap.set(name, {
                value: score,
                source: scoreSource,
                originalValue: originalValue
              });
            }
          });

          // Get top 5 entries sorted by score
          const sortedData = Array.from(scoreMap.entries())
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, 5);

          const labels = sortedData.map(([name, data]) => 
            `${name} (${columnHeaders[data.source]})`
          );
          const values = sortedData.map(([, data]) => Math.round(data.value));

          setChartData({
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors.slice(0, values.length),
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
              },
            ],
          });
        }
      } catch (err) {
        console.error("Error:", err);
        setChartData({
          labels: ["Error loading data"],
          datasets: [
            {
              data: [100],
              backgroundColor: [colors[0]],
              borderWidth: 0,
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Helper function to check if score already exists in the map
    const hasSameValue = (map, value, source) => {
      for (const [, data] of map) {
        if (data.value === value && data.source === source) {
          return true;
        }
      }
      return false;
    };

    fetchData();
  }, [colors]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    circumference: 180,
    rotation: -90,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: "Arial, sans-serif",
            size: 12,
          },
          color: "#333",
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: label,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                lineWidth: 0,
                strokeStyle: "rgba(0,0,0,0)",
                pointStyle: "circle",
              }));
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  return (
    <div className="relative w-full h-full">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      ) : (
        <div className="h-64">
          <Doughnut data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

HalfCircleChart.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
};

export default HalfCircleChart;