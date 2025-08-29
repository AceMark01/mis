"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, User, Lock, AlertCircle, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Footer from "../components/Footer";

// Image processing utilities
const getDriveImageUrls = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") return [];
  const fileIdMatch = originalUrl.match(/\/file\/d\/([^/]+)|id=([^&]+)|\/d\/([^/]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] : null;
  if (!fileId) return [originalUrl];
  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
    `https://lh3.googleusercontent.com/d/${fileId}=w400`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    originalUrl,
  ];
};

const processImageUrl = (rawImageData) => {
  if (!rawImageData || typeof rawImageData !== "string") return null;
  
  const cleanedData = rawImageData.replace(/^"|"$/g, "").trim();
  
  let imageUrl = "";
  if (cleanedData.includes(",")) {
    const parts = cleanedData.split(/,(.+)/);
    imageUrl = parts[0]?.trim() || "";
  } else if (cleanedData.startsWith("http")) {
    imageUrl = cleanedData;
  } else {
    return null;
  }
  
  if (!imageUrl || imageUrl === "Link") return null;
  
  const urls = getDriveImageUrls(imageUrl);
  return urls[0];
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      const user = JSON.parse(localStorage.getItem("user"));
      const redirectPath = user?.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate]);

 const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch authentication data from Master sheet
      const sheetId = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";
      const sheetName = "Master";
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch authentication data");

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) throw new Error("Invalid authentication data format");

      const extractValue = (row, index) => (row.c && row.c[index]?.v?.toString().trim()) || "";

      let matchedUser = null;
      
      // Search for matching user credentials
      for (const row of data.table.rows) {
        const sheetUsername = extractValue(row, 0); // Column A: Name
        const sheetDesignation = extractValue(row, 5); // Column F: Designation
        const sheetPassword = extractValue(row, 3); // Column D: Password
        const sheetRole = extractValue(row, 4).toLowerCase(); // Column E: Role
        const sheetDesignations = extractValue(row, 5); // Column F: Designations
        console.log(sheetDesignations)
        localStorage.setItem("kpi_selected_designation", sheetDesignations);

        if (sheetUsername.toLowerCase() === username.toLowerCase() && sheetPassword === password) {
          matchedUser = {
            username: sheetUsername,
            name: sheetUsername,
            designation: sheetDesignation, // Changed from department to designation
            role: sheetRole || "user",
            designations: sheetDesignations ? sheetDesignations.split(',').map(d => d.trim()) : [],
          };
          break;
        }
      }

      console.log("matchedUser", matchedUser)
      if (matchedUser) {
        // 2. Fetch performance data from For Records sheet
        let performanceData = null;
        let processedImageUrl = null;
        
        try {
          const perfSheetId = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";
          const perfUrl = `https://docs.google.com/spreadsheets/d/${perfSheetId}/gviz/tq?tqx=out:json&sheet=For%20Records`;
          
          const perfResponse = await fetch(perfUrl);
          const perfText = await perfResponse.text();
          const perfJsonString = perfText.substring(
            perfText.indexOf("{"),
            perfText.lastIndexOf("}") + 1
          );
          const perfData = JSON.parse(perfJsonString);
          
          // Find user in performance data
          for (const row of perfData.table.rows) {
            const nameInRow = (row.c && row.c[2]?.v?.toString().trim()) || "";
            
            if (nameInRow.toLowerCase() === matchedUser.name.toLowerCase()) {
              performanceData = {
                name: nameInRow,
                target: (row.c && row.c[3]?.v?.toString()) || "",
                actualWorkDone: (row.c && row.c[4]?.v?.toString()) || "",
                workNotDone: (row.c && row.c[5]?.v?.toString()) || "",
                workNotDoneOnTime: (row.c && row.c[6]?.v?.toString()) || "",
                totalWorkDone: (row.c && row.c[7]?.v?.toString()) || "",
                weekPending: (row.c && row.c[8]?.v?.toString()) || "",
                allPendingTillDate: (row.c && row.c[9]?.v?.toString()) || "",
                plannedWorkNotDone: (row.c && row.c[10]?.v?.toString()) || "",
                plannedNotDoneTillDate: (row.c && row.c[11]?.v?.toString()) || "",
              };
              
              // Process image data (Column N)
              const rawImageData = (row.c && row.c[13]?.v?.toString()) || "";
              if (rawImageData && rawImageData !== "Link" && rawImageData.trim() !== "") {
                processedImageUrl = processImageUrl(rawImageData);
              }
              break;
            }
          }
        } catch (perfError) {
          console.error("Performance fetch error:", perfError);
        }
        
        // 3. Create complete user object
        const completeUserData = {
          ...matchedUser,
          image: processedImageUrl || null,
          performance: performanceData,
          hasPerformanceData: !!performanceData,
        };

        // 4. Login and redirect
        login(completeUserData);
        const redirectPath = matchedUser.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
        navigate(redirectPath);
        
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const staggerChildren = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-pink-300 opacity-20 blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 left-1/4 w-72 h-72 rounded-full bg-purple-300 opacity-20 blur-3xl"></div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
        className="relative z-10 w-full max-w-2xl min-h-[500px] bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden p-8 md:p-12"
      >
        <motion.div variants={fadeIn} className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-600 text-sm mt-1">Please sign in to your account</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md flex items-start"
              >
                <AlertCircle size={18} className="mr-2 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/80 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white/80 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center py-3 px-4 text-white font-medium rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <div className="mt-12">
          <Footer />
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;