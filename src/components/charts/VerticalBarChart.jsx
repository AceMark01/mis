

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const VerticalBarChart = ({
  data,
  title,
  colors = [
    "#EF4444", // Red (for worst performers)
    "#F97316", // Orange
    "#FACC15", // Yellow
    "#8B5CF6", // Violet
    "#3B82F6", // Blue
    "#22C55E", // Green
    "#EC4899"  // Pink (for best performers)
  ],
  maxValue = 100,
}) => {

  // console.log("data",data)
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  });

  


  const [isLoading, setIsLoading] = useState(true);
  const [sortedData, setSortedData] = useState([]);

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
          const performanceData = [];

          data.table.rows.forEach((row) => {
            // Get name from column C (index 2)
            const nameCell = row.c?.[2]?.v;
            let name = "";

            if (typeof nameCell === "string") {
              name = nameCell.trim();
            } else if (nameCell && typeof nameCell === "object") {
              name = nameCell.label || "";
            }

            if (!name) return;

            // Get target from column D (index 3)
            const columnD = row.c?.[3]?.v;
            const target = typeof columnD === "number" ? columnD : parseFloat(columnD) || 0;
            
            // Skip if target is 0
            if (target === 0) return;

            // Get work done from column F (index 5)
            const columnF = row.c?.[5]?.v;
            const workDone = typeof columnF === "number" ? columnF : parseFloat(columnF) || 0;

            // Get column G value (index 6) - for tie-breaking
            const columnG = row.c?.[6]?.v;
            const scoreG = typeof columnG === "number" ? columnG : parseFloat(columnG) || 0;

            // Get pending work from column I (index 8) - for tie-breaking
            const columnI = row.c?.[8]?.v;
            const pendingWork = typeof columnI === "number" ? columnI : parseFloat(columnI) || 0;

            // Get column J value (index 9) - for final tie-breaking
            const columnJ = row.c?.[9]?.v;
            const scoreJ = typeof columnJ === "number" ? columnJ : parseFloat(columnJ) || 0;

            // Calculate performance ratio (work done / target)
            const performanceRatio = workDone / target;

            performanceData.push({
              name,
              target,
              workDone,
              performanceRatio,
              scoreG,
              pendingWork,
              scoreJ,
              displayValue: Math.round(performanceRatio * 100)
            });
          });

          // Sort based on priority logic
          const sorted = performanceData.sort((a, b) => {
            // Primary: Compare performance ratio (ascending - worse performers first)
            if (a.performanceRatio !== b.performanceRatio) {
              return a.performanceRatio - b.performanceRatio;
            }

            // Tie-breaker 1: Column G - more negative score goes higher
            if (a.scoreG !== b.scoreG) {
              return a.scoreG - b.scoreG;
            }

            // Tie-breaker 2: Column I - more pending work goes higher
            if (a.pendingWork !== b.pendingWork) {
              return b.pendingWork - a.pendingWork;
            }

            // Tie-breaker 3: Column J - lower value goes higher
            return a.scoreJ - b.scoreJ;
          }).slice(0, 7);

          setSortedData(sorted);

          const labels = sorted.map(item => item.name);
          // Create bars where worst performer gets tallest bar
          const values = sorted.map((item, index) => {
            return 100 - (index * 10); // Worst gets 100, next gets 90, etc.
          });

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
              data: [50],
              backgroundColor: [colors[0]],
              borderWidth: 0,
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [colors]);

  const options = {
    indexAxis: "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "600",
          family: "'Inter', sans-serif",
        },
        color: "#1F2937",
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const originalData = sortedData[context.dataIndex];
            if (originalData) {
              return `${context.label}: ${originalData.displayValue}% completion (Rank: ${context.dataIndex + 1})`;
            }
            return `${context.label}: Rank ${context.dataIndex + 1}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          color: "#64748B",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          color: "#64748B",
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  return (
    <div className="relative bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <div className="h-64">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </div>
  );
};

VerticalBarChart.propTypes = {
  title: PropTypes.string,
  colors: PropTypes.arrayOf(PropTypes.string),
  maxValue: PropTypes.number,
};

export default VerticalBarChart;