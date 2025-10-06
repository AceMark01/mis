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
  ],
  maxValue = 100,
}) => {

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
          const scoreData = [];

          data.table.rows.forEach((row) => {
            // Column D (Target) - index 3
            const target = parseFloat(row.c?.[3]?.v) || 0;
            // Column E (Actual Work Done) - index 4
            const actualWork = parseFloat(row.c?.[4]?.v) || 0;
            
            // Skip if BOTH Target AND Actual Work Done are 0
            if (target === 0 && actualWork === 0) return;

            // Get name from column C (index 2)
            const nameCell = row.c?.[2]?.v;
            let name = "";
            if (typeof nameCell === "string") {
              name = nameCell.trim();
            } else if (nameCell && typeof nameCell === "object") {
              name = nameCell.label || "";
            }
            if (!name) return;

            // Column F (% Work Not Done) - index 5
            const workNotDone = parseFloat(row.c?.[5]?.v) || 0;
            // Column G (% Work Not Done On Time) - index 6
            const workNotDoneOnTime = parseFloat(row.c?.[6]?.v) || 0;
            // Column I (Week Pending) - index 8
            const weekPending = parseFloat(row.c?.[8]?.v) || 0;

            scoreData.push({
              name,
              target,
              actualWork,
              workNotDone,
              workNotDoneOnTime,
              weekPending
            });
          });

          // SORTING LOGIC - Column F me jiska negative me jyada value hai wo worst (lowest score)
          const sorted = scoreData.sort((a, b) => {
            // Step 1: Target vs Actual comparison (incomplete wale pehle)
            const aComplete = a.target === a.actualWork ? 1 : 0;
            const bComplete = b.target === b.actualWork ? 1 : 0;
            if (aComplete !== bComplete) return aComplete - bComplete;

            // Step 2: % Work Not Done - jiska jyada negative hai wo pehle (worst first)
            // Example: -50 is worse than -20, so -50 should come first
            if (a.workNotDone !== b.workNotDone) {
              return a.workNotDone - b.workNotDone; // ascending (more negative first)
            }

            // Step 3: % Work Not Done On Time (HIGHER is worse, so descending)
            if (a.workNotDoneOnTime !== b.workNotDoneOnTime) {
              return b.workNotDoneOnTime - a.workNotDoneOnTime;
            }

            // Step 4: Week Pending (LOWER negative = worse, e.g., -5 worse than -1)
            return b.weekPending - a.weekPending;
          }).slice(0, 5); // Only top 5

          setSortedData(sorted);

          const labels = sorted.map(item => item.name);
          // Create bars where worst performer gets tallest bar
          const values = sorted.map((item, index) => {
            return 100 - (index * 15); // Worst gets 100, next gets 85, etc.
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
              return `${context.label}: ${originalData.workNotDone}% work not done`;
            }
            return `${context.label}`;
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