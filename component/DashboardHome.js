"use client";

import React from "react";
import {
  Row,
  Col,
  Card,
  List,
  Progress,
  Tag,
  message,
  Tooltip,
  Button,
  Typography,
  Skeleton,
} from "antd";
import {
  BoxPlotOutlined,
  WarningOutlined,
  DollarCircleOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  ShoppingOutlined,
  UserOutlined,
  BarChartOutlined,
  RocketOutlined,
  CalculatorOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import coreAxios from "@/utils/axiosInstance";

const { Text } = Typography;

// Color schemes for different cards
const cardGradients = {
  green: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
  gold: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  blue: "linear-gradient(135deg, #4299e1 0%, #3182ce 100%)",
  purple: "linear-gradient(135deg, #a78bfa 0%, #7dd3fc 100%)",
  orange: "linear-gradient(135deg, #fdba74 0%, #fb923c 100%)",
  teal: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
  pink: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
};

const DashboardHome = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
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
    productStockValues: [],
    // New profit fields
    dailyProfit: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    recentOrdersWithProfit: [],
  });
  const [loading, setLoading] = useState(true);

  // Function to calculate profit for an order
  const calculateOrderProfit = (order, products) => {
    // Find the product in products array to get unitPrice
    const product = products.find(
      (p) => p._id === order.productId || p.productName === order.productName
    );
    const unitPrice = parseFloat(product?.unitPrice || 0);
    const salePrice = parseFloat(order.salePrice || order.unitPrice || 0);
    const quantity = parseInt(order.quantity || 0);
    const expense = parseFloat(order.expense || 0);

    const revenue = salePrice * quantity;
    const cost = unitPrice * quantity + expense;
    const profit = revenue - cost;

    return {
      profit: profit,
      revenue: revenue,
      cost: cost,
      expense: expense,
      unitPrice: unitPrice,
    };
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch products data
      const productsResponse = await coreAxios.get("/products");
      const products = productsResponse.data?.products || [];

      // Fetch orders data
      const ordersResponse = await coreAxios.get("/productOrders");
      const ordersData = ordersResponse.data;
      const orders = ordersData?.data || ordersData || [];

      // Fetch financial summary
      const financialResponse = await coreAxios.get("/getFinancialSummary");
      const financialData = financialResponse.data || {};

      // Fetch users data
      const usersResponse = await coreAxios.get("/auth/users");
      const users = usersResponse.data?.users || [];

      // Calculate product statistics
      const totalProducts = products.length;

      // Calculate total stock quantity
      const totalStockQuantity = products.reduce((sum, product) => {
        return sum + (parseInt(product.qty) || 0);
      }, 0);

      // Calculate total stock value
      const totalStockValue = products.reduce((sum, product) => {
        const qty = parseInt(product.qty) || 0;
        const unitPrice = parseFloat(product.unitPrice) || 0;
        return sum + qty * unitPrice;
      }, 0);

      const lowStock = products.filter(
        (item) => (item.qty || 0) > 0 && (item.qty || 0) < 10
      ).length;
      const outOfStock = products.filter(
        (item) => (item.qty || 0) === 0
      ).length;

      // Calculate order statistics
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(
        (order) => order.status === "Pending"
      ).length;

      const totalUsers = users.length;

      // Get low stock items with stock value
      const lowStockItems = products
        .filter((item) => (item.qty || 0) > 0 && (item.qty || 0) < 10)
        .slice(0, 5)
        .map((item) => ({
          name: item.productName,
          stock: item.qty || 0,
          unitPrice: item.unitPrice || 0,
          stockValue: (item.qty || 0) * (item.unitPrice || 0),
          threshold: 10,
        }));

      // Get product stock values for display
      const productStockValues = products
        .map((item) => ({
          name: item.productName,
          qty: item.qty || 0,
          unitPrice: item.unitPrice || 0,
          stockValue: (item.qty || 0) * (item.unitPrice || 0),
          category: item.categoryName || "অন্যান্য",
        }))
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, 8);

      // Calculate profit data from orders
      const today = new Date().toDateString();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let dailyProfit = 0;
      let monthlyProfit = 0;
      let yearlyProfit = 0;
      let dailySales = 0;
      let monthlySales = 0;

      // Process orders for profit calculation
      orders.forEach((order) => {
        if (order.status === "Cancelled") return;

        const orderDate = new Date(order.orderDate || order.createdAt);
        const profitData = calculateOrderProfit(order, products);

        // Daily calculations
        if (orderDate.toDateString() === today) {
          dailyProfit += profitData.profit;
          dailySales += profitData.revenue;
        }

        // Monthly calculations
        if (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        ) {
          monthlyProfit += profitData.profit;
          monthlySales += profitData.revenue;
        }

        // Yearly calculations
        if (orderDate.getFullYear() === currentYear) {
          yearlyProfit += profitData.profit;
        }
      });

      // Get recent orders with profit information
      const recentOrdersWithProfit = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((order) => {
          const profitData = calculateOrderProfit(order, products);
          return {
            id: order._id,
            item: order.productName,
            quantity: order.quantity,
            date: new Date(
              order.orderDate || order.createdAt
            ).toLocaleDateString("bn-BD"),
            status: order.status,
            total: order.grandTotal || order.totalAmount || order.total,
            profit: profitData.profit,
            revenue: profitData.revenue,
            cost: profitData.cost,
            expense: profitData.expense,
            unitPrice: profitData.unitPrice,
            salePrice: order.salePrice,
          };
        });

      // Get inventory categories stats with stock quantities and values
      const categoryStats = products.reduce((acc, product) => {
        const category = product.categoryName || "অন্যান্য";
        if (!acc[category]) {
          acc[category] = { count: 0, totalStock: 0, totalValue: 0 };
        }
        acc[category].count++;
        acc[category].totalStock += parseInt(product.qty) || 0;
        acc[category].totalValue +=
          (parseInt(product.qty) || 0) * (parseFloat(product.unitPrice) || 0);
        return acc;
      }, {});

      const inventoryStats = Object.entries(categoryStats)
        .map(([name, data]) => ({
          name,
          count: data.count,
          totalStock: data.totalStock,
          totalValue: data.totalValue,
        }))
        .slice(0, 6);

      setDashboardData({
        totalProducts,
        totalStockQuantity,
        totalStockValue,
        lowStock,
        outOfStock,
        totalOrders,
        pendingOrders,
        dailySales: dailySales || financialData.dailySales || 0,
        monthlySales: monthlySales || financialData.monthlySales || 0,
        totalUsers,
        lowStockItems,
        recentOrders: recentOrdersWithProfit,
        inventoryStats,
        productStockValues,
        // Profit data
        dailyProfit,
        monthlyProfit,
        yearlyProfit,
        recentOrdersWithProfit,
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
              background: cardGradients.gold,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  মোট স্টক মূল্য
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {dashboardData.totalStockValue?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  সকল পণ্যের মূল্য
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <CalculatorOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <DollarCircleOutlined className="text-yellow-300 mr-1" />
              <span className="text-yellow-300 text-sm font-medium">
                {dashboardData.totalStockQuantity?.toLocaleString()} ইউনিট
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
                  {dashboardData.monthlySales?.toLocaleString()} ৳
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
                {dashboardData.totalOrders > 0
                  ? `মোট ${dashboardData.totalOrders} অর্ডার`
                  : "কোন ডেটা নেই"}
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
                  অপেক্ষমাণ অর্ডার
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

      {/* Profit Metrics */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} md={8}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.teal,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  দৈনিক লাভ
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {dashboardData.dailyProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  আজকের মোট লাভ
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <RiseOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <DollarCircleOutlined className="text-green-300 mr-1" />
              <span className="text-green-300 text-sm font-medium">
                বিক্রয়: {dashboardData.dailySales?.toLocaleString()} ৳
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card
            className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-1"
            bodyStyle={{
              background: cardGradients.pink,
              borderRadius: "12px",
              padding: "24px",
              color: "white",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-opacity-80 text-sm font-medium mb-2">
                  মাসিক লাভ
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {dashboardData.monthlyProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  এই মাসের মোট লাভ
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <BarChartOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <DollarCircleOutlined className="text-pink-300 mr-1" />
              <span className="text-pink-300 text-sm font-medium">
                বিক্রয়: {dashboardData.monthlySales?.toLocaleString()} ৳
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
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
                  বার্ষিক লাভ
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {dashboardData.yearlyProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-90 text-xs">
                  এই বছরের মোট লাভ
                </div>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <CalculatorOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <ArrowUpOutlined className="text-orange-300 mr-1" />
              <span className="text-orange-300 text-sm font-medium">
                {new Date().getFullYear()} সালের লাভ
              </span>
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
                  {dashboardData.dailySales?.toLocaleString()} ৳
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
                  মোট স্টক পরিমাণ
                </div>
                <div className="text-2xl font-bold text-cyan-600">
                  {dashboardData.totalStockQuantity?.toLocaleString()}
                </div>
                <div className="text-gray-500 text-xs">সকল পণ্যের স্টক</div>
              </div>
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <BoxPlotOutlined className="text-lg text-cyan-600" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Stock Value Sections */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <CalculatorOutlined className="text-green-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  সর্বোচ্চ স্টক মূল্যের পণ্য
                </span>
              </div>
            }
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            headStyle={{
              borderBottom: "1px solid #f0f0f0",
              padding: "16px 20px",
            }}
            extra={
              <Tooltip title="স্টক মূল্য = পরিমাণ × ইউনিট মূল্য">
                <InfoCircleOutlined className="text-gray-400" />
              </Tooltip>
            }
          >
            <List
              dataSource={dashboardData.productStockValues}
              renderItem={(item, index) => (
                <List.Item className="border-0 !px-0 !py-3">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex-1">
                      <Text strong className="text-gray-800 block">
                        {item.name}
                      </Text>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>পরিমাণ: {item.qty}</span>
                        <span>
                          ইউনিট মূল্য: {item.unitPrice?.toLocaleString()} ৳
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-600">
                        {item.stockValue?.toLocaleString()} ৳
                      </div>
                      <div className="text-xs text-gray-500">স্টক মূল্য</div>
                    </div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "কোন পণ্য ডেটা নেই" }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <WarningOutlined className="text-orange-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  কম স্টক সতর্কতা (স্টক মূল্য সহ)
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
                    <div className="flex-1">
                      <Text strong className="text-gray-800 block">
                        {item.name}
                      </Text>
                      <Text type="warning" className="text-xs block">
                        {item.stock} অবশিষ্ট (সীমা: {item.threshold})
                      </Text>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-orange-600">
                          {item.stockValue?.toLocaleString()} ৳
                        </div>
                        <div className="text-xs text-gray-500">স্টক মূল্য</div>
                      </div>
                      <Progress
                        percent={Math.round(
                          (item.stock / item.threshold) * 100
                        )}
                        size="small"
                        strokeColor="#F59E0B"
                        className="w-16"
                      />
                    </div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: "কোন কম স্টক আইটেম নেই" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Additional Sections */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center">
                <BarChartOutlined className="text-blue-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  পণ্য ক্যাটাগরি ও স্টক মূল্য
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
            <div className="space-y-4">
              {dashboardData.inventoryStats.map((category, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">
                        {category.name}
                      </div>
                      <div className="text-sm opacity-90">
                        {category.count} পণ্য |{" "}
                        {category.totalStock?.toLocaleString()} ইউনিট
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl">
                        {category.totalValue?.toLocaleString()} ৳
                      </div>
                      <div className="text-sm opacity-90">মোট স্টক মূল্য</div>
                    </div>
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
                <ShoppingCartOutlined className="text-green-600 mr-2" />
                <span className="text-lg font-bold text-gray-800">
                  সাম্প্রতিক অর্ডার (লাভ সহ)
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
              dataSource={dashboardData.recentOrdersWithProfit}
              renderItem={(item, index) => (
                <List.Item className="border-0 !px-0 !py-3">
                  <List.Item.Meta
                    avatar={
                      <ShoppingCartOutlined className="text-green-600 text-lg" />
                    }
                    title={
                      <div className="flex justify-between items-center">
                        <span className="text-gray-800">{item.item}</span>
                        <span className="text-green-600 font-semibold">
                          {item.total?.toLocaleString()} ৳
                        </span>
                      </div>
                    }
                    description={
                      <div>
                        <div className="text-gray-600">
                          তারিখ: {item.date} | পরিমাণ: {item.quantity} pcs
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div>
                            <Tag
                              color={
                                item.status === "Delivered" ||
                                item.status === "Completed"
                                  ? "green"
                                  : item.status === "Pending"
                                  ? "orange"
                                  : item.status === "Cancelled"
                                  ? "red"
                                  : "blue"
                              }
                              className="border-0 text-white"
                            >
                              {item.status}
                            </Tag>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold ${
                                item.profit >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              লাভ: {item.profit?.toLocaleString()} ৳
                            </div>
                            <div className="text-xs text-gray-500">
                              ক্রয়: {item.unitPrice?.toLocaleString()} ৳/unit
                            </div>
                          </div>
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
        <Col xs={24}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Button
                icon={<BarChartOutlined />}
                className="w-full h-12 text-lg border-green-500 text-green-500 hover:bg-green-50 transition-all duration-300"
                onClick={() => (window.location.href = "#/reports")}
              >
                স্টক রিপোর্ট
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardHome;
