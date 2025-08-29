import React, { useEffect, useState } from "react";

const PendingWiseChart = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingData, setPendingData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY/gviz/tq?tqx=out:json&sheet=Data"
        );
        const text = await response.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        const jsonData = text.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonData);

        if (data?.table?.rows) {
          const processedData = [];
          
          data.table.rows.forEach((row) => {
            const name = row.c?.[4]?.v;
            const pendingValue = row.c?.[10]?.v;
            
            if (name && pendingValue) {
              let numericValue = 0;
              if (typeof pendingValue === 'number') {
                numericValue = pendingValue;
              } else if (typeof pendingValue === 'string') {
                numericValue = parseFloat(pendingValue.replace(/[^\d.-]/g, ""));
              }
              
              if (!isNaN(numericValue)) {
                processedData.push({
                  name: String(name).trim().toUpperCase(),
                  pending: Math.round(numericValue)
                });
              }
            }
          });

          processedData.sort((a, b) => b.pending - a.pending);
          setPendingData(processedData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const maxPending = Math.max(...pendingData.map(item => item.pending), 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full overflow-hidden">
      {/* Header with highlighted title */}
      
      <div className="flex flex-col h-full">
        <div 
          className="overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100"
          style={{ height: '400px' }}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider w-3/4">
                  Pending
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingData.map((item, index) => {
                const barColor = item.pending > 75 
                  ? 'bg-red-500' 
                  : item.pending > 50 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500';
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-3.5">
                          <div 
                            className={`${barColor} h-3.5 rounded-full transition-all duration-300`}
                            style={{ width: `${(item.pending / maxPending) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                          {item.pending}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Extra spacing at bottom to ensure last item is fully visible */}
              {pendingData.length > 0 && (
                <tr>
                  <td colSpan="2" className="h-4"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Status messages and count - moved outside scroll container */}
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!isLoading && pendingData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No pending data available
          </div>
        )}

        {!isLoading && pendingData.length > 0 && (
          <div className="mt-2 text-sm text-gray-500 text-right px-6 pb-2 bg-gray-50 border-t">
            Showing {pendingData.length} items
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingWiseChart;