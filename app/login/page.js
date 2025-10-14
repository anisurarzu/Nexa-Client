"use client";
import { useState } from "react";
import {
  UserOutlined,
  LockOutlined,
  GlobalOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import coreAxios from "@/utils/axiosInstance";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("bn");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ loginID: "", password: "" });
  const [touched, setTouched] = useState({ loginID: false, password: false });
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
      signingIn: "Signing in..",
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
    },
  };

  const t = translations[lang];

  const validateForm = () => {
    return formData.loginID.trim() !== "" && formData.password.trim() !== "";
  };

  const loginWithoutLocation = async (values) => {
    try {
      const loginPayload = {
        ...values,
        latitude: "0.0",
        longitude: "0.0",
        publicIP: "Unknown",
        loginTime: new Date().toISOString(),
      };

      const response = await coreAxios.post(`auth/login`, loginPayload);

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userInfo", JSON.stringify(response.data.user));
        router.push("/dashboard");
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      setError(
        error.response?.data?.error || "Login failed. Please try again."
      );
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ loginID: true, password: true });

    if (!validateForm()) {
      setError(t.required);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get user's location and IP - EXACTLY like your first code
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const latitude = position.coords.latitude.toString();
      const longitude = position.coords.longitude.toString();

      // Get public IP
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const publicIP = ipData.ip;

      const loginTime = new Date().toISOString();

      const loginPayload = {
        ...formData,
        latitude,
        longitude,
        publicIP,
        loginTime,
      };

      const response = await coreAxios.post(`auth/login`, loginPayload);

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userInfo", JSON.stringify(response.data.user));
        router.push("/dashboard");
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle different types of errors - EXACTLY like your first code
      if (error.name === "GeolocationPositionError") {
        // If geolocation fails, try login without location data
        await loginWithoutLocation(formData);
      } else {
        setError(
          error.response?.data?.error || "Login failed. Please try again."
        );
      }
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
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
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .slide-in-left {
          animation: slideInLeft 0.6s ease-out;
        }
        .slide-in-right {
          animation: slideInRight 0.6s ease-out;
        }
      `}</style>

      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Section - Branding */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 space-y-6 slide-in-left">
          <div className="animate-float">
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-600 to-green-500 rounded-3xl shadow-2xl flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-300">
              <img
                src="https://i.ibb.co.com/czmdyzp/dmf-soft.png"
                alt="Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
              Nexa Inventory
            </h1>
            <p className="text-xl text-gray-600 font-medium">{t.subtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              {
                icon: "📦",
                label: lang === "bn" ? "স্টক ম্যানেজমেন্ট" : "Stock Management",
              },
              {
                icon: "📊",
                label: lang === "bn" ? "রিয়েল-টাইম ডেটা" : "Real-time Data",
              },
              { icon: "🔒", label: lang === "bn" ? "সুরক্ষিত" : "Secure" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg text-center hover:scale-105 transition-transform"
              >
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="text-sm text-gray-700 font-medium">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="slide-in-right">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-emerald-100">
            {/* Language Toggle */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setLang(lang === "bn" ? "en" : "bn")}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors text-emerald-700 font-medium"
              >
                <GlobalOutlined />
                <span>{lang === "bn" ? "EN" : "BN"}</span>
              </button>
            </div>

            {/* Logo for Mobile */}
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-green-500 rounded-2xl shadow-xl flex items-center justify-center">
                <img
                  src="https://i.ibb.co.com/czmdyzp/dmf-soft.png"
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {t.login}
              </h2>
              <p className="text-gray-500">{t.helpText}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-6">
              {/* User ID Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.userID}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                    <UserOutlined className="text-lg" />
                  </div>
                  <input
                    type="text"
                    value={formData.loginID}
                    onChange={(e) =>
                      handleInputChange("loginID", e.target.value)
                    }
                    onBlur={() => handleBlur("loginID")}
                    placeholder={t.loginIDPlaceholder}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 font-medium"
                  />
                </div>
                {touched.loginID && !formData.loginID && (
                  <p className="text-red-500 text-sm mt-1">{t.required}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.password}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                    <LockOutlined className="text-lg" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    onBlur={() => handleBlur("password")}
                    placeholder={t.passwordPlaceholder}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeInvisibleOutlined className="text-lg" />
                    ) : (
                      <EyeOutlined className="text-lg" />
                    )}
                  </button>
                </div>
                {touched.password && !formData.password && (
                  <p className="text-red-500 text-sm mt-1">{t.required}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{lang === "bn" ? t.loggingIn : t.signingIn}</span>
                  </div>
                ) : (
                  <span className="text-lg">{t.login}</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-500 text-sm">
                Use your userID and password to login
              </p>
              <p className="text-gray-400 text-xs mt-2">
                © 2025 DMF Soft. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
