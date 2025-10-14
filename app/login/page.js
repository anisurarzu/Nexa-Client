"use client";

import { useState } from "react";
import { Form, Input, Button, Typography, Alert, Switch, Card } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import coreAxios from "@/utils/axiosInstance";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState("bn");
  const router = useRouter();

  const translations = {
    bn: {
      title: "নেক্সা ইনভেন্টরিতে স্বাগতম",
      subtitle: "আপনার সম্পূর্ণ ইনভেন্টরি ম্যানেজমেন্ট সমাধান",
      userID: "ইউজার আইডি",
      password: "পাসওয়ার্ড",
      login: "লগইন",
      loginIDPlaceholder: "FTB-1234",
      passwordPlaceholder: "আপনার পাসওয়ার্ড লিখুন",
    },
    en: {
      title: "Welcome to Nexa Inventory",
      subtitle: "Your Complete Inventory Management Solution",
      userID: "User ID",
      password: "Password",
      login: "Login",
      loginIDPlaceholder: "FTB-1234",
      passwordPlaceholder: "Enter your password",
    },
  };

  const t = translations[lang];

  const onFinish = async (values) => {
    setLoading(true);
    setError("");

    try {
      // Get user's location and IP
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
        ...values,
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

      // Handle different types of errors
      if (error.name === "GeolocationPositionError") {
        // If geolocation fails, try login without location data
        await loginWithoutLocation(values);
      } else {
        setError(
          error.response?.data?.error || "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-r from-[#f0f9f0] to-[#FFFFFF] text-black">
      {/* Left Section with Branding */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="relative flex w-full md:w-1/2 bg-gradient-to-br from-[#2e7d32] to-[#4caf50] items-center justify-center p-6 md:p-0"
      >
        <div className="absolute inset-0 bg-white/10 z-0"></div>
        <div className="z-10 text-center px-6 md:px-12 space-y-4">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="https://i.ibb.co.com/czmdyzp/dmf-soft.png"
              alt="Nexa Inventory Logo"
              width={120}
              height={120}
              className="rounded-lg bg-white p-2"
            />
          </div>
          <Title
            level={1}
            className="text-5xl font-extrabold text-white drop-shadow-lg mb-4"
          >
            Nexa Inventory
          </Title>
          <Text className="text-2xl font-semibold text-white/90 drop-shadow-md">
            {t.subtitle}
          </Text>
        </div>
      </motion.div>

      {/* Right Section - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="flex flex-col justify-center items-center w-full md:w-1/2 py-12 px-8 md:px-16"
      >
        <Card
          className="w-full max-w-md shadow-2xl border-[#2e7d32]/20"
          styles={{
            body: {
              padding: "32px",
            },
          }}
        >
          {/* Language Switch */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center space-x-2">
              <Text className="text-gray-600">EN</Text>
              <Switch
                checked={lang === "bn"}
                onChange={(checked) => setLang(checked ? "bn" : "en")}
                size="small"
                style={{
                  backgroundColor: lang === "bn" ? "#2e7d32" : "#d9d9d9",
                }}
              />
              <Text className="text-gray-600">BN</Text>
            </div>
          </div>

          <Title level={2} className="text-center text-[#2e7d32] mb-6">
            {t.login}
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError("")}
              className="mb-4"
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label={
                <span className="text-gray-700 font-medium">{t.userID}</span>
              }
              name="loginID"
              rules={[
                {
                  required: true,
                  message: `Please input your ${t.userID.toLowerCase()}!`,
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#2e7d32" }} />}
                placeholder={t.loginIDPlaceholder}
                size="large"
                className="p-3 rounded-lg border-[#2e7d32]/30 hover:border-[#2e7d32]/50 focus:border-[#2e7d32] focus:shadow-[0_0_0_2px_rgba(46,125,50,0.2)]"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-gray-700 font-medium">{t.password}</span>
              }
              name="password"
              rules={[
                {
                  required: true,
                  message: `Please input your ${t.password.toLowerCase()}!`,
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#2e7d32" }} />}
                placeholder={t.passwordPlaceholder}
                size="large"
                className="p-3 rounded-lg border-[#2e7d32]/30 hover:border-[#2e7d32]/50 focus:border-[#2e7d32] focus:shadow-[0_0_0_2px_rgba(46,125,50,0.2)]"
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  className="h-12 bg-gradient-to-r from-[#2e7d32] to-[#4caf50] hover:from-[#1b5e20] hover:to-[#2e7d32] border-none text-white text-lg rounded-lg transition-all shadow-lg font-semibold"
                >
                  {t.login}
                </Button>
              </motion.div>
            </Form.Item>
          </Form>

          <Text className="block text-center text-gray-500 mt-4">
            Use your FTB-XXXX ID and password to login
          </Text>
        </Card>
      </motion.div>
    </div>
  );
}
