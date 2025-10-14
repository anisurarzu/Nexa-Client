import React, { useState } from "react";
import { Card, Switch, Select, Button } from "antd";
import {
  BulbOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  BellOutlined,
  LockOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState("blue");
  const [fontStyle, setFontStyle] = useState("Arial");
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState("Public");
  const [language, setLanguage] = useState("English");

  return (
    <div
      className={`min-h-screen p-6 transition-all ${
        darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}>
      <h2 className="text-3xl font-bold text-center mb-6">Settings</h2>
      <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-2">
        {/* Dark Mode Toggle */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <BulbOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Dark Mode</h3>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </Card>
        </motion.div>

        {/* Theme Color Change */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <BgColorsOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Theme Color</h3>
            <Select
              value={themeColor}
              onChange={setThemeColor}
              className="w-full">
              <Select.Option value="blue">Blue</Select.Option>
              <Select.Option value="green">Green</Select.Option>
              <Select.Option value="red">Red</Select.Option>
            </Select>
          </Card>
        </motion.div>

        {/* Font Style Change */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <FontSizeOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Font Style</h3>
            <Select
              value={fontStyle}
              onChange={setFontStyle}
              className="w-full">
              <Select.Option value="Arial">Arial</Select.Option>
              <Select.Option value="Times New Roman">
                Times New Roman
              </Select.Option>
              <Select.Option value="Courier New">Courier New</Select.Option>
            </Select>
          </Card>
        </motion.div>

        {/* Enable Notifications */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <BellOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Notifications</h3>
            <Switch
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </Card>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <LockOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Privacy Settings</h3>
            <Select value={privacy} onChange={setPrivacy} className="w-full">
              <Select.Option value="Public">Public</Select.Option>
              <Select.Option value="Private">Private</Select.Option>
            </Select>
          </Card>
        </motion.div>

        {/* Language Selection */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card className="shadow-md p-4">
            <GlobalOutlined className="text-2xl mb-2" />
            <h3 className="text-lg font-semibold">Language</h3>
            <Select value={language} onChange={setLanguage} className="w-full">
              <Select.Option value="English">English</Select.Option>
              <Select.Option value="Spanish">Spanish</Select.Option>
              <Select.Option value="French">French</Select.Option>
            </Select>
          </Card>
        </motion.div>
      </div>
      <div className="mt-6 text-center">
        <Button type="primary" size="large">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
