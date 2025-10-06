
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
    // Replace the entire useEffect's fetchData function with this:

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

          // Sort logic:
          // 1. Target aur Actual Work Done compare (jo complete hai wo pehle)
          // 2. % Work Not Done (kam value = better)
          // 3. % Work Not Done On Time (kam value = better)
          // 4. Week Pending (kam negative value = better, mtlb jiska time kam bacha hai)

          const sortedData = scoreData.sort((a, b) => {
            // Step 1: Target vs Actual comparison
            const aComplete = a.target === a.actualWork ? 1 : 0;
            const bComplete = b.target === b.actualWork ? 1 : 0;
            if (aComplete !== bComplete) return bComplete - aComplete;

            // Step 2: % Work Not Done comparison (lower is better)
            if (a.workNotDone !== b.workNotDone) {
  return b.workNotDone - a.workNotDone;
}

            // Step 3: % Work Not Done On Time (lower is better)
            if (a.workNotDoneOnTime !== b.workNotDoneOnTime) {
              return b.workNotDoneOnTime - a.workNotDoneOnTime;
            }

            // Step 4: Week Pending (kam negative = better, e.g., -1 better than -5)
            return b.weekPending - a.weekPending;
          }).slice(0, 5);
window.chartSortedData = sortedData;
          // Create labels and values for chart
          const labels = sortedData.map(item => item.name);
         const values = sortedData.map(item => Math.round(item.workNotDone));

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
      const index = context.dataIndex;
      const item = window.chartSortedData?.[index];
      if (item) {
        return `${item.name}: ${item.workNotDone}`;
      }
      return `${context.label}: ${context.parsed}`;
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