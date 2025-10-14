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
          {/* <Title level={2} className="text-gray-800 mb-2">
            ড্যাশবোর্ড ওভারভিউ
          </Title> */}
          <Text className="text-gray-600">
            সিস্টেমের সামগ্রিক পরিসংখ্যান এবং কার্যক্রম
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={refreshData}
          className="flex items-center"
        >
          রিফ্রেশ
        </Button>
      </div>

      {/* Main Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="মোট পণ্য"
              value={dashboardData.totalProducts}
              prefix={<BoxPlotOutlined className="text-green-600" />}
              valueStyle={{ color: "#1B5E20" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="কম স্টক"
              value={dashboardData.lowStock}
              prefix={<WarningOutlined className="text-orange-500" />}
              valueStyle={{ color: "#F57C00" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="মাসিক বিক্রয়"
              value={dashboardData.monthlySales}
              prefix={<DollarCircleOutlined className="text-blue-600" />}
              valueStyle={{ color: "#388E3C" }}
              suffix="৳"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="মুলতুবি অর্ডার"
              value={dashboardData.pendingOrders}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
              valueStyle={{ color: "#0288D1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Additional Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="দৈনিক বিক্রয়"
              value={dashboardData.dailySales}
              prefix={<DollarCircleOutlined className="text-green-500" />}
              valueStyle={{ color: "#2E7D32" }}
              suffix="৳"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="স্টক নেই"
              value={dashboardData.outOfStock}
              prefix={<InboxOutlined className="text-red-500" />}
              valueStyle={{ color: "#D32F2F" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="মোট অর্ডার"
              value={dashboardData.totalOrders}
              prefix={<ShoppingOutlined className="text-purple-500" />}
              valueStyle={{ color: "#7B1FA2" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-0">
            <Statistic
              title="ব্যবহারকারী"
              value={dashboardData.totalUsers}
              prefix={<UserOutlined className="text-cyan-500" />}
              valueStyle={{ color: "#0097A7" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Additional Sections */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="কম স্টক সতর্কতা"
            className="shadow-md border-0"
            headStyle={{ borderBottom: "1px solid #f0f0f0", color: "#F57C00" }}
            extra={
              <Tag color="orange">
                {dashboardData.lowStockItems.length} আইটেম
              </Tag>
            }
          >
            <List
              dataSource={dashboardData.lowStockItems}
              renderItem={(item, index) => (
                <List.Item>
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <Text strong>{item.name}</Text>
                      <br />
                      <Text type="warning" className="text-xs">
                        {item.stock} অবশিষ্ট (সীমা: {item.threshold})
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round((item.stock / item.threshold) * 100)}
                      size="small"
                      strokeColor="#F57C00"
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
            title="সাম্প্রতিক অর্ডার"
            className="shadow-md border-0"
            headStyle={{ borderBottom: "1px solid #f0f0f0", color: "#388E3C" }}
            extra={
              <Tag color="green">
                {dashboardData.recentOrders.length} অর্ডার
              </Tag>
            }
          >
            <List
              dataSource={dashboardData.recentOrders}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<ShoppingCartOutlined className="text-green-600" />}
                    title={`${item.item}`}
                    description={
                      <div>
                        <div>তারিখ: {item.date}</div>
                        <div>
                          <Tag
                            color={
                              item.status === "Delivered"
                                ? "green"
                                : item.status === "Pending"
                                ? "orange"
                                : "blue"
                            }
                            size="small"
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

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title="পণ্য ক্যাটাগরি"
            className="shadow-md border-0"
            headStyle={{ borderBottom: "1px solid #f0f0f0", color: "#1B5E20" }}
            extra={
              <Tag color="green">
                {dashboardData.inventoryStats.length} ক্যাটাগরি
              </Tag>
            }
          >
            <div className="flex flex-wrap gap-2">
              {dashboardData.inventoryStats.map((category, index) => (
                <Tag
                  key={index}
                  color="green"
                  className="text-white border-none px-3 py-1"
                >
                  {category.name} ({category.count})
                </Tag>
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
            title="দ্রুত কর্ম"
            className="shadow-md border-0"
            headStyle={{ borderBottom: "1px solid #f0f0f0", color: "#0288D1" }}
          >
            <div className="space-y-3">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="w-full bg-green-600 border-green-600"
                onClick={() => (window.location.href = "#/inventory")}
              >
                নতুন পণ্য যোগ করুন
              </Button>
              <Button
                icon={<ShoppingCartOutlined />}
                className="w-full border-blue-500 text-blue-500"
                onClick={() => (window.location.href = "#/orders")}
              >
                অর্ডার দেখুন
              </Button>
              <Button
                icon={<UserOutlined />}
                className="w-full border-purple-500 text-purple-500"
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
  <Card className="border-0 shadow-lg">
    <Title level={3}>অর্ডার ড্যাশবোর্ড</Title>
    <Text>অর্ডার ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে</Text>
  </Card>
);

const InventoryManagement = () => (
  <Card className="border-0 shadow-lg">
    <Title level={3}>ইনভেন্টরি ব্যবস্থাপনা</Title>
    <Text>ইনভেন্টরি ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে</Text>
  </Card>
);

const ExpenseManagement = () => (
  <Card className="border-0 shadow-lg">
    <Title level={3}>খরচ ব্যবস্থাপনা</Title>
    <Text>খরচ ট্র্যাকিং বিষয়বস্তু এখানে থাকবে</Text>
  </Card>
);

const UserManagement = () => (
  <Card className="border-0 shadow-lg">
    <Title level={3}>ব্যবহারকারী ব্যবস্থাপনা</Title>
    <Text>ব্যবহারকারী ব্যবস্থাপনা বিষয়বস্তু এখানে থাকবে</Text>
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
