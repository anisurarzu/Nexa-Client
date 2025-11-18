"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import coreAxios from "@/utils/axiosInstance";

// Icon components using Unicode characters
const UserIcon = () => <span style={{ fontSize: '20px' }}>👤</span>;
const LockIcon = () => <span style={{ fontSize: '20px' }}>🔒</span>;
const GlobeIcon = () => <span style={{ fontSize: '18px' }}>🌐</span>;
const EyeIcon = () => <span style={{ fontSize: '18px' }}>👁️</span>;
const EyeSlashIcon = () => <span style={{ fontSize: '18px' }}>🙈</span>;
const ChevronRightIcon = () => <span style={{ fontSize: '16px' }}>→</span>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("bn");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ loginID: "", password: "" });
  const [touched, setTouched] = useState({ loginID: false, password: false });
  const [focused, setFocused] = useState({ loginID: false, password: false });
  const router = useRouter();

  const translations = {
    bn: {
      title: "নেক্সা ইনভেন্টরিতে স্বাগতম",
      subtitle: "আপনার সম্পূর্ণ ইনভেন্টরি ম্যানেজমেন্ট সমাধান",
      userID: "ইউজার আইডি",
      password: "পাসওয়ার্ড",
      login: "লগইন করুন",
      loginIDPlaceholder: "FTB-1234",
      passwordPlaceholder: "আপনার পাসওয়ার্ড লিখুন",
      helpText: "আপনার ইউজার আইডি এবং পাসওয়ার্ড ব্যবহার করুন",
      required: "এই ফিল্ডটি প্রয়োজনীয়",
      loggingIn: "লগইন হচ্ছে...",
      signingIn: "Signing in...",
      stockManagement: "স্টক ম্যানেজমেন্ট",
      realTimeData: "রিয়েল-টাইম ডেটা",
      secure: "সুরক্ষিত",
      rememberMe: "আমাকে মনে রাখুন",
      forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
      feature1: "স্বয়ংক্রিয় স্টক ট্র্যাকিং",
      feature2: "ক্লাউড-ভিত্তিক সিস্টেম",
      feature1Desc: "রিয়েল টাইমে আপনার সম্পূর্ণ ইনভেন্টরি পরিচালনা করুন",
      feature2Desc: "যেকোনো জায়গা থেকে, যেকোনো ডিভাইসে অ্যাক্সেস করুন",
      invalidCredentials: "ভুল ইউজার আইডি বা পাসওয়ার্ড",
      networkError: "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন",
      serverError: "সার্ভার সমস্যা। পরে চেষ্টা করুন",
    },
    en: {
      title: "Welcome to Nexa Inventory",
      subtitle: "Your Complete Inventory Management Solution",
      userID: "User ID",
      password: "Password",
      login: "Sign In",
      loginIDPlaceholder: "Enter your user ID",
      passwordPlaceholder: "Enter your password",
      helpText: "Use your user ID and password to login",
      required: "This field is required",
      loggingIn: "লগইন হচ্ছে...",
      signingIn: "Signing in...",
      stockManagement: "Stock Management",
      realTimeData: "Real-time Data",
      secure: "Secure",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      feature1: "Automated Stock Tracking",
      feature2: "Cloud-Native System",
      feature1Desc: "Manage your entire inventory in real-time",
      feature2Desc: "Access anywhere, anytime, any device",
      invalidCredentials: "Invalid user ID or password",
      networkError: "Network error. Please try again",
      serverError: "Server error. Please try again later",
    },
  };

  const t = translations[lang];

  const validateForm = () => {
    return formData.loginID.trim() !== "" && formData.password.trim() !== "";
  };

  // Get location with timeout
  const getLocationData = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Geolocation timeout"));
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          { timeout: 5000, maximumAge: 0 }
        );
      });

      return {
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
      };
    } catch (error) {
      console.log("Geolocation unavailable:", error.message);
      return {
        latitude: "0.0",
        longitude: "0.0",
      };
    }
  };

  // Get public IP with timeout
  const getPublicIP = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const ipResponse = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const ipData = await ipResponse.json();
      return ipData.ip;
    } catch (error) {
      console.log("Could not fetch IP:", error.message);
      return "Unknown";
    }
  };

  // Perform login with proper error handling
  const performLogin = async (loginPayload) => {
    try {
      console.log("🔐 Attempting login...", {
        loginID: loginPayload.loginID,
        latitude: loginPayload.latitude,
        longitude: loginPayload.longitude,
        publicIP: loginPayload.publicIP,
      });

      const response = await coreAxios.post("auth/login", loginPayload);

      console.log("✅ Login response:", response.status, response.data);

      if (response.status === 200 && response.data) {
        if (!response.data.token) {
          throw new Error("No token received from server");
        }

        // Store auth data
        localStorage.setItem("token", response.data.token);
        if (response.data.user) {
          localStorage.setItem("userInfo", JSON.stringify(response.data.user));
        }

        console.log("✅ Login successful, redirecting to dashboard...");
        router.push("/dashboard");
        return true;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("❌ Login error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        fullError: error,
      });

      // Handle specific error types
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401 || status === 403) {
          throw new Error(t.invalidCredentials);
        } else if (status === 500 || status === 502 || status === 503) {
          throw new Error(t.serverError);
        } else if (errorData?.error) {
          throw new Error(errorData.error);
        } else if (errorData?.message) {
          throw new Error(errorData.message);
        } else {
          throw new Error(`Server error (${status})`);
        }
      } else if (error.request) {
        // Request made but no response
        throw new Error(t.networkError);
      } else {
        // Something else happened
        throw new Error(error.message || "Login failed. Please try again.");
      }
    }
  };

  const handleLogin = async () => {
    // Mark fields as touched
    setTouched({ loginID: true, password: true });

    // Validate
    if (!validateForm()) {
      setError(t.required);
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🚀 Starting login process...");

      // Get location and IP in parallel
      const [locationData, publicIP] = await Promise.all([
        getLocationData(),
        getPublicIP(),
      ]);

      console.log("📍 Location data:", locationData);
      console.log("🌐 Public IP:", publicIP);

      const loginPayload = {
        loginID: formData.loginID.trim(),
        password: formData.password,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        publicIP: publicIP,
        loginTime: new Date().toISOString(),
      };

      await performLogin(loginPayload);
    } catch (error) {
      console.error("❌ Login process failed:", error);
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFocused((prev) => ({ ...prev, [field]: false }));
  };

  const handleFocus = (field) => {
    setFocused((prev) => ({ ...prev, [field]: true }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-10"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Top Navigation */}
      <div className="relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight">Nexa Inventory</h1>
            <p className="text-emerald-300 text-xs">Enterprise Management</p>
          </div>
        </div>
        <button
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-white border border-white/20 text-sm"
        >
          <GlobeIcon />
          <span className="font-semibold">{lang === "bn" ? "EN" : "বাংলা"}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-0">
          {/* Left Side - Login Form */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl lg:rounded-r-none shadow-2xl p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">N</span>
                </div>
              </div>

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-4xl font-bold text-slate-900 mb-3">{lang === "bn" ? "স্বাগতম" : "Welcome back"}</h2>
                <p className="text-slate-600 text-lg">{t.helpText}</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between animate-shake">
                  <span className="text-sm font-medium">{error}</span>
                  <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              )}

              {/* Login Form */}
              <div className="space-y-6">
                {/* User ID Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t.userID}
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 ${
                    focused.loginID ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                  }`}>
                    <div className="absolute left-4 text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <UserIcon />
                    </div>
                    <input
                      type="text"
                      value={formData.loginID}
                      onChange={(e) => handleInputChange("loginID", e.target.value)}
                      onFocus={() => handleFocus("loginID")}
                      onBlur={() => handleBlur("loginID")}
                      onKeyPress={handleKeyPress}
                      placeholder={t.loginIDPlaceholder}
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {touched.loginID && !formData.loginID && (
                    <p className="text-red-500 text-sm mt-1">{t.required}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="relative group">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {t.password}
                  </label>
                  <div className={`relative flex items-center transition-all duration-300 ${
                    focused.password ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                  }`}>
                    <div className="absolute left-4 text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <LockIcon />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      onFocus={() => handleFocus("password")}
                      onBlur={() => handleBlur("password")}
                      onKeyPress={handleKeyPress}
                      placeholder={t.passwordPlaceholder}
                      disabled={loading}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-4 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {touched.password && !formData.password && (
                    <p className="text-red-500 text-sm mt-1">{t.required}</p>
                  )}
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                    <span className="ml-2 text-sm text-slate-600 group-hover:text-slate-900">{t.rememberMe}</span>
                  </label>
                  <a href="#" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    {t.forgotPassword}
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="group relative w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <span className="flex items-center justify-center">
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {lang === "bn" ? t.loggingIn : t.signingIn}
                      </>
                    ) : (
                      <>
                        {t.login}
                        <ChevronRightIcon />
                      </>
                    )}
                  </span>
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
                © 2025 DMF Soft. All rights reserved.
              </div>
            </div>
          </div>

          {/* Right Side - Branding */}
          <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-3xl rounded-l-none p-12 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48"></div>
            
            {/* Logo */}
            <div className="relative z-10 w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-8 transform hover:scale-110 transition-transform duration-300">
              <span className="text-emerald-600 text-5xl font-bold">N</span>
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <h3 className="text-white text-5xl font-bold mb-4 tracking-tight">
                Nexa Inventory
              </h3>
              <p className="text-emerald-100 text-xl mb-12 max-w-md leading-relaxed">
                {t.subtitle}
              </p>

              {/* Features */}
              <div className="space-y-4 text-left max-w-md mx-auto">
                {[
                  { title: t.feature1, desc: t.feature1Desc },
                  { title: t.feature2, desc: t.feature2Desc },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-all duration-300">
                    <div className="w-2 h-2 bg-emerald-300 rounded-full mt-2"></div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                      <p className="text-emerald-100 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Company */}
              <div className="mt-12 text-emerald-200 text-sm font-semibold tracking-wider">
                DMF SOFT
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}