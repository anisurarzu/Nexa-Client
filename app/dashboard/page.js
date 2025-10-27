"use client";

import React from "react";
import { Layout, Menu, Button, Drawer, Avatar, Typography } from "antd";
import {
  DashboardOutlined,
  UsergroupAddOutlined,
  MenuOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  InboxOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import InventoryPage from "@/component/InventoryPage";
import AgentInformation from "@/component/AgentInformation";
import CategoryPage from "@/component/CategoryPage";
import ExpenseInfo from "@/component/ExpenseInfo";
import OrderEntry from "@/component/OrderEntry";
import QRCodePage from "@/component/QRCodePage";
import DashboardHome from "@/component/DashboardHome"; // Import the new component

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const rolePermissions = {
  superadmin: [
    {
      key: "1",
      label: "ড্যাশবোর্ড",
      icon: <DashboardOutlined />,
    },
    {
      key: "6",
      label: "অর্ডার ড্যাশবোর্ড",
      icon: <ShoppingOutlined />,
    },
    {
      key: "10",
      label: "ক্যাটাগরি ",
      icon: <UsergroupAddOutlined />,
    },
    {
      key: "7",
      label: "নতুন পণ্য",
      icon: <InboxOutlined />,
    },
    {
      key: "9",
      label: "খরচ",
      icon: <MoneyCollectOutlined />,
    },
    {
      key: "2",
      label: "ব্যবহারকারী",
      icon: <UsergroupAddOutlined />,
    },
    {
      key: "11",
      label: "QR কোড জেনারেটর",
      icon: <UsergroupAddOutlined />,
    },
  ],
  moderator: [
    {
      key: "1",
      label: "ড্যাশবোর্ড",
      icon: <DashboardOutlined />,
    },
    {
      key: "6",
      label: "অর্ডার ড্যাশবোর্ড",
      icon: <ShoppingOutlined />,
    },
    {
      key: "7",
      label: "নতুন পণ্য",
      icon: <InboxOutlined />,
    },
    {
      key: "9",
      label: "খরচ",
      icon: <MoneyCollectOutlined />,
    },
    {
      key: "2",
      label: "ব্যবহারকারী",
      icon: <UsergroupAddOutlined />,
    },
  ],
  deliveryincharge: [
    {
      key: "1",
      label: "ড্যাশবোর্ড",
      icon: <DashboardOutlined />,
    },
    {
      key: "6",
      label: "অর্ডার ড্যাশবোর্ড",
      icon: <ShoppingOutlined />,
    },
    {
      key: "7",
      label: "নতুন পণ্য",
      icon: <InboxOutlined />,
    },
    {
      key: "9",
      label: "খরচ",
      icon: <MoneyCollectOutlined />,
    },
    {
      key: "2",
      label: "ব্যবহারকারী",
      icon: <UsergroupAddOutlined />,
    },
  ],
  shopsupport: [
    {
      key: "1",
      label: "ড্যাশবোর্ড",
      icon: <DashboardOutlined />,
    },
    {
      key: "6",
      label: "অর্ডার ড্যাশবোর্ড",
      icon: <ShoppingOutlined />,
    },
    {
      key: "7",
      label: "নতুন পণ্য",
      icon: <InboxOutlined />,
    },
    {
      key: "9",
      label: "খরচ",
      icon: <MoneyCollectOutlined />,
    },
    {
      key: "2",
      label: "ব্যবহারকারী",
      icon: <UsergroupAddOutlined />,
    },
  ],
};

const Dashboard = () => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("1");
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUserInfo = localStorage.getItem("userInfo");
    if (storedUserInfo) {
      try {
        setUserInfo(JSON.parse(storedUserInfo));
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }

    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [router, selectedMenu]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    router.push("/login");
  };

  const showDrawer = () => setVisible(true);
  const onClose = () => setVisible(false);

  const renderContent = () => {
    if (loading) {
      return <div>লোড হচ্ছে...</div>;
    }

    if (!userInfo) return null;

    // Render content based on selected menu
    switch (selectedMenu) {
      case "1":
        return <DashboardHome />; // Use the separated DashboardHome component
      case "6":
        return <OrderEntry />;
      case "7":
        return <InventoryPage />;
      case "9":
        return <ExpenseInfo />;
      case "2":
        return <AgentInformation />;
      case "10":
        return <CategoryPage />;
      case "11":
        return <QRCodePage />;
      default:
        return <div>অনুমতি নেই</div>;
    }
  };

  const renderMenuItems = () => {
    if (!userInfo) return null;

    const userRole = userInfo?.role?.value;
    const allowedPages = rolePermissions[userRole] || [];

    return (
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[selectedMenu]}
        onClick={(e) => setSelectedMenu(e.key)}
        className="bg-white border-r-0"
      >
        {allowedPages.map((page) => (
          <Menu.Item
            key={page.key}
            icon={page.icon}
            className="!bg-white hover:!bg-[#2e7d32] !text-gray-600 hover:!text-white [&.ant-menu-item-selected]:!bg-[#2e7d32] [&.ant-menu-item-selected]:!text-white !h-12 !flex !items-center !text-base"
          >
            <span className="font-medium">{page.label}</span>
          </Menu.Item>
        ))}
      </Menu>
    );
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      {/* Sidebar for Desktop */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="hidden lg:block bg-white shadow-lg"
        width={220}
        breakpoint="lg"
        trigger={null}
      >
        <div className="logo-container my-6 flex items-center justify-center">
          <div className={`flex items-center ${collapsed ? "px-2" : "px-4"}`}>
            <img
              src="https://i.ibb.co.com/czmdyzp/dmf-soft.png"
              alt="Nexa Inventory Logo"
              className={`rounded-lg bg-white p-1 ${
                collapsed ? "w-14" : "w-16"
              }`}
            />
            {!collapsed && (
              <div className="ml-3">
                <div className="text-lg font-bold text-[#2e7d32]">Nexa</div>
                <div className="text-xs text-gray-600 -mt-1">নতুন পণ্য</div>
              </div>
            )}
          </div>
        </div>

        {renderMenuItems()}
      </Sider>

      {/* Drawer for Mobile */}
      <Drawer
        title={
          <div className="flex items-center">
            <img
              src="https://i.ibb.co.com/czmdyzp/dmf-soft.png"
              alt="Nexa Inventory Logo"
              className="w-14 rounded-lg bg-white p-1 mr-3"
            />
            <div>
              <div className="text-lg font-bold text-white">Nexa</div>
              <div className="text-xs text-gray-200 -mt-1">নতুন পণ্য</div>
            </div>
          </div>
        }
        placement="left"
        onClose={onClose}
        open={visible}
        width="70vw"
        bodyStyle={{ padding: 0 }}
        headerStyle={{ background: "#2e7d32", color: "white" }}
      >
        {renderMenuItems()}
      </Drawer>

      <Layout className="site-layout">
        <Header
          style={{
            background: "white",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
          className="flex justify-between items-center px-6 py-4"
        >
          <div className="flex items-center">
            <Button
              icon={<MenuOutlined />}
              className="lg:hidden text-[#2e7d32] border-none mr-4"
              onClick={showDrawer}
            />
            <div className="hidden lg:block">
              <Title level={4} className="mb-0 text-gray-800">
                {
                  rolePermissions[userInfo?.role?.value]?.find(
                    (item) => item.key === selectedMenu
                  )?.label
                }
              </Title>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {userInfo && (
              <div className="flex items-center space-x-3">
                <Avatar
                  src={
                    userInfo?.imageUrl
                      ? `data:image/jpeg;base64,${userInfo.imageUrl}`
                      : null
                  }
                  alt={userInfo.username || "User"}
                  size={40}
                  className="border-2 border-[#2e7d32]"
                >
                  {!userInfo?.imageUrl &&
                    (userInfo.username || "User").charAt(0).toUpperCase()}
                </Avatar>
                <div className="hidden md:flex flex-col">
                  <span className="font-medium text-gray-800 leading-5">
                    {userInfo.username || "User"}
                  </span>
                  <span className="text-xs text-gray-500 leading-4 mt-0.5">
                    {userInfo?.role?.value || "role"}
                  </span>
                </div>
              </div>
            )}
            <Button
              icon={<LogoutOutlined />}
              type="text"
              className="text-gray-600 hover:text-[#2e7d32]"
              onClick={handleLogout}
            />
          </div>
        </Header>

        <Content className="m-4 lg:m-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
