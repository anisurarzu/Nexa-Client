"use client";

import React from "react";
import {
  Layout,
  Menu,
  Button,
  Skeleton,
  Drawer,
  Avatar,
  Typography,
  Row,
  Col,
  Card,
  Divider,
  Statistic,
  List,
  Progress,
  Tag,
  message,
} from "antd";
import {
  DashboardOutlined,
  UsergroupAddOutlined,
  InfoCircleOutlined,
  MenuOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  DollarCircleOutlined,
  WarningOutlined,
  ShopOutlined,
  UserOutlined,
  ShoppingOutlined,
  InboxOutlined,
  MoneyCollectOutlined,
  BarChartOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  StarOutlined,
  TrophyOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { BoxPlotOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import InventoryPage from "@/component/InventoryPage";
import AgentInformation from "@/component/AgentInformation";
import CategoryPage from "@/component/CategoryPage";
import coreAxios from "@/utils/axiosInstance";
import ExpenseInfo from "@/component/ExpenseInfo";
import OrderEntry from "@/component/OrderEntry";
import QRCodePage from "@/component/QRCodePage";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

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
      label: "ইনভেন্টরি",
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
      label: "ইনভেন্টরি",
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
      label: "ইনভেন্টরি",
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
      label: "ইনভেন্টরি",
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

// Color schemes for different cards
const cardGradients = {
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  success: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  warning: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  info: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  purple: "linear-gradient(135deg, #a78bfa 0%, #7dd3fc 100%)",
  orange: "linear-gradient(135deg, #fdba74 0%, #fb923c 100%)",
  teal: "linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%)",
  rose: "linear-gradient(135deg, #fb7185 0%, #f472b6 100%)",
  green: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
  blue: "linear-gradient(135deg, #4299e1 0%, #3182ce 100%)",
};

// Simple Dashboard Content Component with Real Data
const DashboardContent = ({ userInfo }) => {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    dailySales: 0,
    monthlySales: 0,
    totalUsers: 0,
    lowStockItems: [],
    recentOrders: [],
    inventoryStats: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch products data
      const productsResponse = await coreAxios.get("/products");
      const products = productsResponse.data?.products || [];

      // Fetch orders data
      const ordersResponse = await coreAxios.get("/orders");
      const orders = ordersResponse.data || [];

      // Fetch financial summary
      const financialResponse = await coreAxios.get("/getFinancialSummary");
      const financialData = financialResponse.data || {};

      // Fetch users data
      const usersResponse = await coreAxios.get("/auth/users");
      const users = usersResponse.data?.users || [];

      // Calculate statistics
      const totalProducts = products.length;
      console.log("Total Products:", totalProducts);
      const lowStock = products.filter(
        (item) => item.qty > 0 && item.qty < 10
      ).length;
      const outOfStock = products.filter((item) => item.qty === 0).length;

      const totalOrders = orders.length;
      const pendingOrders = orders.filter(
        (order) => order.status === "Pending"
      ).length;

      const totalUsers = users.length;

      // Get low stock items
      const lowStockItems = products
        .filter((item) => item.qty > 0 && item.qty < 10)
        .slice(0, 5)
        .map((item) => ({
          name: item.productName,
          stock: item.qty,
          threshold: 10,
        }));

      // Get recent orders
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((order) => ({
          item: order.productName,
          quantity: 1,
          date: new Date(order.createdAt).toLocaleDateString("bn-BD"),
          status: order.status,
        }));

      // Get inventory categories stats
      const categoryStats = products.reduce((acc, product) => {
        const category = product.category || "অন্যান্য";
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category]++;
        return acc;
      }, {});

      const inventoryStats = Object.entries(categoryStats)
        .map(([name, count]) => ({ name, count }))
        .slice(0, 6);

      setDashboardData({
        totalProducts,
        lowStock,
        outOfStock,
        totalOrders,
        pendingOrders,
        dailySales: financialData.dailySales || 0,
        monthlySales: financialData.monthlySales || 0,
        totalUsers,
        lowStockItems,
        recentOrders,
        inventoryStats,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      message.error("ডেটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const refreshData = () => {
    fetchDashboardData();
    message.success("ডেটা রিফ্রেশ করা হয়েছে!");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton active paragraph={{ rows: 1 }} className="max-w-md" />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((item) => (
            <Col xs={24} sm={12} md={6} key={item}>
              <Card className="shadow-lg rounded-xl border-0">
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <Text className="text-gray-600 text-lg">
            সিস্টেমের সামগ্রিক পরিসংখ্যান এবং কার্যক্রম
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={refreshData}
          className="flex items-center bg-gradient-to-r from-green-500 to-blue-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-6"
        >
          রিফ্রেশ ডেটা
        </Button>
      </div>

      {/* Main Metrics */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.green,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  মোট পণ্য
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {dashboardData.totalProducts}
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  সকল পণ্য
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <BoxPlotOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <ArrowUpOutlined className="text-green-300 mr-1" />
              <span className="text-green-300 text-sm font-medium">
                +15% এই মাসে
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.orange,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  কম স্টক
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {dashboardData.lowStock}
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  মনিটরিং প্রয়োজন
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <WarningOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <ArrowUpOutlined className="text-orange-300 mr-1" />
              <span className="text-orange-300 text-sm font-medium">
                নজর রাখুন
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.blue,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  মাসিক বিক্রয়
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {(dashboardData.monthlySales / 100000).toFixed(1)}L
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  মাসিক রাজস্ব
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <DollarCircleOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <ArrowUpOutlined className="text-green-300 mr-1" />
              <span className="text-green-300 text-sm font-medium">
                +18% গত মাস থেকে
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.purple,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  মুলতুবি অর্ডার
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {dashboardData.pendingOrders}
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  প্রক্রিয়াধীন
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <ShoppingCartOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <Progress
                percent={
                  Math.round(
                    (dashboardData.pendingOrders / dashboardData.totalOrders) *
                      100
                  ) || 0
                }
                size="small"
                strokeColor="#ffffff"
                trailColor="rgba(255,255,255,0.3)"
                showInfo={false}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Metrics */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-1">
                  দৈনিক বিক্রয়
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.dailySales}
                </div>
                <div className="text-gray-500 text-xs">আজকের বিক্রয়</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarCircleOutlined className="text-lg text-green-600" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-1">
                  স্টক নেই
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.outOfStock}
                </div>
                <div className="text-gray-500 text-xs">পুনঃস্থাপন প্রয়োজন</div>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <InboxOutlined className="text-lg text-red-600" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-1">
                  মোট অর্ডার
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.totalOrders}
                </div>
                <div className="text-gray-500 text-xs">সকল অর্ডার</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <ShoppingOutlined className="text-lg text-purple-600" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white"
            bodyStyle={{ padding: "20px" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-1">
                  ব্যবহারকারী
                </div>
                <div className="text-2xl font-bold text-cyan-600">
                  {dashboardData.totalUsers}
                </div>
                <div className="text-gray-500 text-xs">সক্রিয় ব্যবহারকারী</div>
              </div>
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <UserOutlined className="text-lg text-cyan-600" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Additional Sections */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <WarningOutlined className="text-orange-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  কম স্টক সতর্কতা
                </span>
              </div>
            }
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            headStyle={{
              borderBottom: "1px solid #f0f0f0",
              padding: "16px 20px",
            }}
            extra={
              <Tag color="orange" className="border-0">
                {dashboardData.lowStockItems.length} আইটেম
              </Tag>
            }
          >
            <List
              dataSource={dashboardData.lowStockItems}
              renderItem={(item, index) => (
                <List.Item className="border-0 !px-0 !py-3">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <Text strong className="text-gray-800">
                        {item.name}
                      </Text>
                      <br />
                      <Text type="warning" className="text-xs">
                        {item.stock} অবশিষ্ট (সীমা: {item.threshold})
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round((item.stock / item.threshold) * 100)}
                      size="small"
                      strokeColor="#F59E0B"
                      className="w-24"
                    />
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "কোন কম স্টক আইটেম নেই" }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <ShoppingCartOutlined className="text-green-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  সাম্প্রতিক অর্ডার
                </span>
              </div>
            }
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            headStyle={{
              borderBottom: "1px solid #f0f0f0",
              padding: "16px 20px",
            }}
            extra={
              <Tag color="green" className="border-0">
                {dashboardData.recentOrders.length} অর্ডার
              </Tag>
            }
          >
            <List
              dataSource={dashboardData.recentOrders}
              renderItem={(item, index) => (
                <List.Item className="border-0 !px-0 !py-3">
                  <List.Item.Meta
                    avatar={
                      <ShoppingCartOutlined className="text-green-600 text-lg" />
                    }
                    title={<span className="text-gray-800">{item.item}</span>}
                    description={
                      <div>
                        <div className="text-gray-600">তারিখ: {item.date}</div>
                        <div>
                          <Tag
                            color={
                              item.status === "Delivered"
                                ? "green"
                                : item.status === "Pending"
                                ? "orange"
                                : "blue"
                            }
                            className="border-0 text-white"
                          >
                            {item.status}
                          </Tag>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "কোন সাম্প্রতিক অর্ডার নেই" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <BarChartOutlined className="text-blue-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  পণ্য ক্যাটাগরি
                </span>
              </div>
            }
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            headStyle={{
              borderBottom: "1px solid #f0f0f0",
              padding: "16px 20px",
            }}
            extra={
              <Tag color="blue" className="border-0">
                {dashboardData.inventoryStats.length} ক্যাটাগরি
              </Tag>
            }
          >
            <div className="flex flex-wrap gap-3">
              {dashboardData.inventoryStats.map((category, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <div className="font-semibold">{category.name}</div>
                  <div className="text-sm opacity-90">
                    {category.count} পণ্য
                  </div>
                </div>
              ))}
            </div>
            {dashboardData.inventoryStats.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                কোন ক্যাটাগরি ডেটা পাওয়া যায়নি
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <RocketOutlined className="text-purple-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  দ্রুত কর্ম
                </span>
              </div>
            }
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            headStyle={{
              borderBottom: "1px solid #f0f0f0",
              padding: "16px 20px",
            }}
          >
            <div className="space-y-4">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="w-full h-12 text-lg bg-gradient-to-r from-green-500 to-blue-500 border-0 shadow-md hover:shadow-lg transition-all duration-300"
                onClick={() => (window.location.href = "#/inventory")}
              >
                নতুন পণ্য যোগ করুন
              </Button>
              <Button
                icon={<ShoppingCartOutlined />}
                className="w-full h-12 text-lg border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-300"
                onClick={() => (window.location.href = "#/orders")}
              >
                অর্ডার দেখুন
              </Button>
              <Button
                icon={<UserOutlined />}
                className="w-full h-12 text-lg border-purple-500 text-purple-500 hover:bg-purple-50 transition-all duration-300"
                onClick={() => (window.location.href = "#/users")}
              >
                ব্যবহারকারী ব্যবস্থাপনা
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Simple placeholder components for other menu items
const OrderDashboard = () => (
  <Card className="border-0 shadow-2xl rounded-2xl">
    <div className="text-center py-8">
      <ShoppingCartOutlined className="text-6xl text-blue-500 mb-4" />
      <Title level={3} className="text-gray-800">
        অর্ডার ড্যাশবোর্ড
      </Title>
      <Text className="text-gray-600 text-lg">
        অর্ডার ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে
      </Text>
    </div>
  </Card>
);

const InventoryManagement = () => (
  <Card className="border-0 shadow-2xl rounded-2xl">
    <div className="text-center py-8">
      <InboxOutlined className="text-6xl text-green-500 mb-4" />
      <Title level={3} className="text-gray-800">
        ইনভেন্টরি ব্যবস্থাপনা
      </Title>
      <Text className="text-gray-600 text-lg">
        ইনভেন্টরি ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে
      </Text>
    </div>
  </Card>
);

const ExpenseManagement = () => (
  <Card className="border-0 shadow-2xl rounded-2xl">
    <div className="text-center py-8">
      <MoneyCollectOutlined className="text-6xl text-orange-500 mb-4" />
      <Title level={3} className="text-gray-800">
        খরচ ব্যবস্থাপনা
      </Title>
      <Text className="text-gray-600 text-lg">
        খরচ ট্র্যাকিং বিষয়বস্তু এখানে থাকবে
      </Text>
    </div>
  </Card>
);

const UserManagement = () => (
  <Card className="border-0 shadow-2xl rounded-2xl">
    <div className="text-center py-8">
      <UserOutlined className="text-6xl text-purple-500 mb-4" />
      <Title level={3} className="text-gray-800">
        ব্যবহারকারী ব্যবস্থাপনা
      </Title>
      <Text className="text-gray-600 text-lg">
        ব্যবহারকারী ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে
      </Text>
    </div>
  </Card>
);

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
      return (
        <div className="space-y-6">
          <Skeleton active paragraph={{ rows: 1 }} className="max-w-md" />
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item}>
                <Card className="shadow-lg rounded-xl border-0">
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Card>
              </Col>
            ))}
          </Row>
          <Divider />
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      );
    }

    if (!userInfo) return null;

    // Render content based on selected menu
    switch (selectedMenu) {
      case "1":
        return <DashboardContent userInfo={userInfo} />;
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
                <div className="text-xs text-gray-600 -mt-1">ইনভেন্টরি</div>
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
              <div className="text-xs text-gray-200 -mt-1">ইনভেন্টরি</div>
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
