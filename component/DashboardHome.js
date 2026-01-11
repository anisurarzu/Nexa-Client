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
  Modal,
  Tabs,
  Select,
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
  LineChartOutlined,
  AreaChartOutlined,
  MoneyCollectOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  TrophyOutlined,
  CalendarOutlined,
  WalletOutlined,
  BankOutlined,
  FileTextOutlined,
  StockOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import coreAxios from "@/utils/axiosInstance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// Solid color schemes for different cards
const cardColors = {
  green: "#10b981", // Emerald
  gold: "#f59e0b", // Amber
  blue: "#3b82f6", // Blue
  purple: "#8b5cf6", // Violet
  orange: "#f97316", // Orange
  teal: "#14b8a6", // Teal
  pink: "#ec4899", // Pink
  indigo: "#6366f1", // Indigo
  cyan: "#06b6d4", // Cyan
  lime: "#84cc16", // Lime
  rose: "#f43f5e", // Rose
  sky: "#0ea5e9", // Sky
  red: "#ef4444", // Red for expenses
};

// Solid background colors for category cards
const categoryColors = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f43f5e", // Rose
  "#6366f1", // Indigo
];

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
    // Profit fields
    dailyProfit: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    // Expense fields
    dailyExpenses: 0,
    monthlyExpenses: 0,
    yearlyExpenses: 0,
    // Net Profit (Profit - Expenses)
    dailyNetProfit: 0,
    monthlyNetProfit: 0,
    yearlyNetProfit: 0,
    recentOrdersWithProfit: [],
    // Chart data
    salesProfitData: {
      daily: [],
      monthly: [],
      yearly: [],
    },
    expenseData: {
      daily: [],
      monthly: [],
      yearly: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartType, setChartType] = useState("line");
  const [activeChartTab, setActiveChartTab] = useState("daily");

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

  // Function to calculate expenses for a period
  const calculateExpenses = (expenses, period) => {
    const now = new Date();
    let totalExpenses = 0;

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.expenseDate || expense.createdAt);
      
      if (period === "daily") {
        if (expenseDate.toDateString() === now.toDateString()) {
          totalExpenses += parseFloat(expense.amount || 0);
        }
      } else if (period === "monthly") {
        if (
          expenseDate.getMonth() === now.getMonth() &&
          expenseDate.getFullYear() === now.getFullYear()
        ) {
          totalExpenses += parseFloat(expense.amount || 0);
        }
      } else if (period === "yearly") {
        if (expenseDate.getFullYear() === now.getFullYear()) {
          totalExpenses += parseFloat(expense.amount || 0);
        }
      }
    });

    return totalExpenses;
  };

  // Generate chart data with expenses
  const generateChartData = (orders, products, expenses, period) => {
    const data = [];
    const now = new Date();

    if (period === "daily") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("bn-BD", {
          day: "numeric",
          month: "short",
        });

        let dailySales = 0;
        let dailyProfit = 0;
        let dailyExpenses = 0;

        // Calculate sales and profit from orders
        orders.forEach((order) => {
          if (order.status === "Cancelled") return;

          const orderDate = new Date(order.orderDate || order.createdAt);
          if (orderDate.toDateString() === date.toDateString()) {
            const profitData = calculateOrderProfit(order, products);
            dailySales += profitData.revenue;
            dailyProfit += profitData.profit;
          }
        });

        // Calculate expenses for the day
        expenses.forEach((expense) => {
          const expenseDate = new Date(expense.expenseDate || expense.createdAt);
          if (expenseDate.toDateString() === date.toDateString()) {
            dailyExpenses += parseFloat(expense.amount || 0);
          }
        });

        const dailyNetProfit = dailyProfit - dailyExpenses;

        data.push({
          name: dateStr,
          sales: dailySales,
          profit: dailyProfit,
          expenses: dailyExpenses,
          netProfit: dailyNetProfit,
          revenue: dailySales,
        });
      }
    } else if (period === "monthly") {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleDateString("bn-BD", {
          month: "short",
          year: "numeric",
        });

        let monthlySales = 0;
        let monthlyProfit = 0;
        let monthlyExpenses = 0;

        // Calculate sales and profit from orders
        orders.forEach((order) => {
          if (order.status === "Cancelled") return;

          const orderDate = new Date(order.orderDate || order.createdAt);
          if (
            orderDate.getMonth() === date.getMonth() &&
            orderDate.getFullYear() === date.getFullYear()
          ) {
            const profitData = calculateOrderProfit(order, products);
            monthlySales += profitData.revenue;
            monthlyProfit += profitData.profit;
          }
        });

        // Calculate expenses for the month
        expenses.forEach((expense) => {
          const expenseDate = new Date(expense.expenseDate || expense.createdAt);
          if (
            expenseDate.getMonth() === date.getMonth() &&
            expenseDate.getFullYear() === date.getFullYear()
          ) {
            monthlyExpenses += parseFloat(expense.amount || 0);
          }
        });

        const monthlyNetProfit = monthlyProfit - monthlyExpenses;

        data.push({
          name: monthStr,
          sales: monthlySales,
          profit: monthlyProfit,
          expenses: monthlyExpenses,
          netProfit: monthlyNetProfit,
          revenue: monthlySales,
        });
      }
    } else if (period === "yearly") {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearStr = year.toString();

        let yearlySales = 0;
        let yearlyProfit = 0;
        let yearlyExpenses = 0;

        // Calculate sales and profit from orders
        orders.forEach((order) => {
          if (order.status === "Cancelled") return;

          const orderDate = new Date(order.orderDate || order.createdAt);
          if (orderDate.getFullYear() === year) {
            const profitData = calculateOrderProfit(order, products);
            yearlySales += profitData.revenue;
            yearlyProfit += profitData.profit;
          }
        });

        // Calculate expenses for the year
        expenses.forEach((expense) => {
          const expenseDate = new Date(expense.expenseDate || expense.createdAt);
          if (expenseDate.getFullYear() === year) {
            yearlyExpenses += parseFloat(expense.amount || 0);
          }
        });

        const yearlyNetProfit = yearlyProfit - yearlyExpenses;

        data.push({
          name: yearStr,
          sales: yearlySales,
          profit: yearlyProfit,
          expenses: yearlyExpenses,
          netProfit: yearlyNetProfit,
          revenue: yearlySales,
        });
      }
    }

    return data;
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

      // Fetch expenses data
      const expensesResponse = await coreAxios.get("/expense");
      const expensesData = expensesResponse.data;
      const expenses = expensesData?.expenses || expensesData || [];

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

      // Calculate expenses
      const dailyExpenses = calculateExpenses(expenses, "daily");
      const monthlyExpenses = calculateExpenses(expenses, "monthly");
      const yearlyExpenses = calculateExpenses(expenses, "yearly");

      // Calculate net profit (profit - expenses)
      const dailyNetProfit = dailyProfit - dailyExpenses;
      const monthlyNetProfit = monthlyProfit - monthlyExpenses;
      const yearlyNetProfit = yearlyProfit - yearlyExpenses;

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

      // Generate chart data with expenses
      const salesProfitData = {
        daily: generateChartData(orders, products, expenses, "daily"),
        monthly: generateChartData(orders, products, expenses, "monthly"),
        yearly: generateChartData(orders, products, expenses, "yearly"),
      };

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
        // Expense data
        dailyExpenses,
        monthlyExpenses,
        yearlyExpenses,
        // Net profit data
        dailyNetProfit,
        monthlyNetProfit,
        yearlyNetProfit,
        recentOrdersWithProfit,
        // Chart data
        salesProfitData,
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

  const showChartModal = () => {
    setChartModalVisible(true);
  };

  const handleChartModalCancel = () => {
    setChartModalVisible(false);
  };

  // Render chart based on type and period
  const renderChart = (data, period) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          এই সময়ের জন্য কোন ডেটা পাওয়া যায়নি
        </div>
      );
    }

    const chartHeight = 400;

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <YAxis
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <RechartsTooltip
              formatter={(value, name) => [
                `${parseFloat(value).toLocaleString()} ৳`,
                name === "sales"
                  ? "বিক্রয়"
                  : name === "profit"
                  ? "মোট লাভ"
                  : name === "expenses"
                  ? "খরচ"
                  : name === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব",
              ]}
              labelFormatter={(label) => `সময়: ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === "sales"
                  ? "বিক্রয়"
                  : value === "profit"
                  ? "মোট লাভ"
                  : value === "expenses"
                  ? "খরচ"
                  : value === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব"
              }
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
              name="sales"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2 }}
              name="profit"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#ef4444", strokeWidth: 2 }}
              name="expenses"
            />
            <Line
              type="monotone"
              dataKey="netProfit"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
              name="netProfit"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <YAxis
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <RechartsTooltip
              formatter={(value, name) => [
                `${parseFloat(value).toLocaleString()} ৳`,
                name === "sales"
                  ? "বিক্রয়"
                  : name === "profit"
                  ? "মোট লাভ"
                  : name === "expenses"
                  ? "খরচ"
                  : name === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব",
              ]}
              labelFormatter={(label) => `সময়: ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === "sales"
                  ? "বিক্রয়"
                  : value === "profit"
                  ? "মোট লাভ"
                  : value === "expenses"
                  ? "খরচ"
                  : value === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব"
              }
            />
            <Area
              type="monotone"
              dataKey="sales"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2}
              name="sales"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stackId="2"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.6}
              strokeWidth={2}
              name="profit"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stackId="3"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
              strokeWidth={2}
              name="expenses"
            />
            <Area
              type="monotone"
              dataKey="netProfit"
              stackId="4"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
              strokeWidth={2}
              name="netProfit"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
            />
            <YAxis
              tick={{ fill: "#666" }}
              axisLine={{ stroke: "#ddd" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <RechartsTooltip
              formatter={(value, name) => [
                `${parseFloat(value).toLocaleString()} ৳`,
                name === "sales"
                  ? "বিক্রয়"
                  : name === "profit"
                  ? "মোট লাভ"
                  : name === "expenses"
                  ? "খরচ"
                  : name === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব",
              ]}
              labelFormatter={(label) => `সময়: ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === "sales"
                  ? "বিক্রয়"
                  : value === "profit"
                  ? "মোট লাভ"
                  : value === "expenses"
                  ? "খরচ"
                  : value === "netProfit"
                  ? "নিট লাভ"
                  : "রাজস্ব"
              }
            />
            <Bar
              dataKey="sales"
              fill="#3b82f6"
              name="sales"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="profit"
              fill="#f59e0b"
              name="profit"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              fill="#ef4444"
              name="expenses"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="netProfit"
              fill="#10b981"
              name="netProfit"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
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
          {/* <Text className="text-gray-600 text-lg">
            সিস্টেমের সামগ্রিক পরিসংখ্যান এবং কার্যক্রম
          </Text> */}
        </div>
        <div className="flex gap-2">
          <Button
            icon={<LineChartOutlined />}
            onClick={showChartModal}
            className="flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-black border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-6"
          >
            বিক্রয় ও লাভ চার্ট
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={refreshData}
            className="flex items-center bg-gradient-to-r from-green-500 to-blue-500 text-black border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-6"
          >
            রিফ্রেশ ডেটা
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.green} 0%, #059669 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  মোট পণ্য
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">
                  {dashboardData.totalProducts}
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  সকল পণ্য
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <AppstoreOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 pt-3 border-t border-white border-opacity-20">
              <ArrowUpOutlined className="text-green-200 mr-2 text-sm" />
              <span className="text-white text-xs font-medium">
                +15% এই মাসে
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.gold} 0%, #d97706 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  মোট স্টক মূল্য
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.totalStockValue?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  সকল পণ্যের মূল্য
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <DatabaseOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 pt-3 border-t border-white border-opacity-20">
              <DollarCircleOutlined className="text-yellow-200 mr-2 text-sm" />
              <span className="text-white text-xs font-medium">
                {dashboardData.totalStockQuantity?.toLocaleString()} ইউনিট
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.blue} 0%, #2563eb 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  মাসিক বিক্রয়
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.monthlySales?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  মাসিক রাজস্ব
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <TrophyOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 pt-3 border-t border-white border-opacity-20">
              <ArrowUpOutlined className="text-blue-200 mr-2 text-sm" />
              <span className="text-white text-xs font-medium">
                {dashboardData.totalOrders > 0
                  ? `মোট ${dashboardData.totalOrders} অর্ডার`
                  : "কোন ডেটা নেই"}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} lg={6} xl={6}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.purple} 0%, #7c3aed 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  অপেক্ষমাণ অর্ডার
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">
                  {dashboardData.pendingOrders}
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  প্রক্রিয়াধীন
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <ShoppingCartOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-4 pt-3 border-t border-white border-opacity-20">
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
                className="w-full"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Net Profit Metrics (Profit - Expenses) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.teal} 0%, #0d9488 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  দৈনিক নিট লাভ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.dailyNetProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  (লাভ - খরচ)
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <ThunderboltOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-green-300">
                লাভ: {dashboardData.dailyProfit?.toLocaleString()} ৳
              </span>
              <span className="text-red-300">
                খরচ: {dashboardData.dailyExpenses?.toLocaleString()} ৳
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.pink} 0%, #db2777 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  মাসিক নিট লাভ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.monthlyNetProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  (লাভ - খরচ)
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <BarChartOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-green-300">
                লাভ: {dashboardData.monthlyProfit?.toLocaleString()} ৳
              </span>
              <span className="text-red-300">
                খরচ: {dashboardData.monthlyExpenses?.toLocaleString()} ৳
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.orange} 0%, #ea580c 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  বার্ষিক নিট লাভ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.yearlyNetProfit?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  (লাভ - খরচ)
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <CalendarOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-green-300">
                লাভ: {dashboardData.yearlyProfit?.toLocaleString()} ৳
              </span>
              <span className="text-red-300">
                খরচ: {dashboardData.yearlyExpenses?.toLocaleString()} ৳
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Expense Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.red} 0%, #dc2626 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  দৈনিক খরচ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.dailyExpenses?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  আজকের মোট খরচ
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <WalletOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <FallOutlined className="text-red-300 mr-1" />
              <span className="text-red-300 text-sm font-medium">
                ব্যবসায়িক খরচ
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.rose} 0%, #e11d48 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  মাসিক খরচ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.monthlyExpenses?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  এই মাসের মোট খরচ
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <BankOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <FallOutlined className="text-red-300 mr-1" />
              <span className="text-red-300 text-sm font-medium">
                মাসিক ব্যবসায়িক খরচ
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <Card
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full"
            bodyStyle={{
              background: `linear-gradient(135deg, ${cardColors.indigo} 0%, #4f46e5 100%)`,
              borderRadius: "16px",
              padding: "24px",
              color: "white",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-white text-opacity-90 text-xs font-semibold mb-2 uppercase tracking-wide">
                  বার্ষিক খরচ
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {dashboardData.yearlyExpenses?.toLocaleString()} ৳
                </div>
                <div className="text-white text-opacity-80 text-xs font-medium">
                  এই বছরের মোট খরচ
                </div>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-xl flex items-center justify-center shadow-lg ml-3 flex-shrink-0">
                <FileTextOutlined className="text-2xl text-white" />
              </div>
            </div>
            <div className="flex items-center mt-3">
              <FallOutlined className="text-indigo-300 mr-1" />
              <span className="text-indigo-300 text-sm font-medium">
                বার্ষিক ব্যবসায়িক খরচ
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
                  style={{
                    backgroundColor:
                      categoryColors[index % categoryColors.length],
                  }}
                  className="text-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
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
                  <div className="flex items-start w-full">
                    <div className="mr-3 mt-1">
                      <ShoppingCartOutlined className="text-green-600 text-lg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-800 font-medium">
                          {item.item}
                        </span>
                        <span className="text-green-600 font-semibold">
                          {item.total?.toLocaleString()} ৳
                        </span>
                      </div>
                      <div className="text-gray-600 text-sm mb-2">
                        তারিখ: {item.date} | পরিমাণ: {item.quantity} pcs
                      </div>
                      <div className="flex justify-between items-center">
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
                  </div>
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
                icon={<MoneyCollectOutlined />}
                className="w-full h-12 text-lg border-red-500 text-red-500 hover:bg-red-50 transition-all duration-300"
                onClick={() => (window.location.href = "#/expenses")}
              >
                খরচ ব্যবস্থাপনা
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart Modal */}
      <Modal
        title={
          <div className="flex items-center">
            <LineChartOutlined className="text-purple-600 mr-2" />
            <span className="text-xl font-bold">বিক্রয়, লাভ ও খরচ বিশ্লেষণ</span>
          </div>
        }
        open={chartModalVisible}
        onCancel={handleChartModalCancel}
        footer={null}
        width="90%"
        style={{ maxWidth: 1200 }}
        bodyStyle={{ padding: "20px" }}
      >
        <div className="space-y-4">
          {/* Chart Controls */}
          <div className="flex flex-wrap gap-4 justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="font-medium">চার্ট ধরন:</span>
              <Select
                value={chartType}
                onChange={setChartType}
                style={{ width: 120 }}
              >
                <Option value="line">লাইন চার্ট</Option>
                <Option value="area">এরিয়া চার্ট</Option>
                <Option value="bar">বার চার্ট</Option>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-medium">সময়কাল:</span>
              <Select
                value={activeChartTab}
                onChange={setActiveChartTab}
                style={{ width: 120 }}
              >
                <Option value="daily">দৈনিক</Option>
                <Option value="monthly">মাসিক</Option>
                <Option value="yearly">বার্ষিক</Option>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Card className="text-center border-0 shadow-md">
                <div className="text-blue-600 font-bold text-2xl">
                  {dashboardData.dailySales?.toLocaleString()} ৳
                </div>
                <div className="text-gray-600">দৈনিক বিক্রয়</div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card className="text-center border-0 shadow-md">
                <div className="text-green-600 font-bold text-2xl">
                  {dashboardData.dailyNetProfit?.toLocaleString()} ৳
                </div>
                <div className="text-gray-600">দৈনিক নিট লাভ</div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card className="text-center border-0 shadow-md">
                <div className="text-red-600 font-bold text-2xl">
                  {dashboardData.dailyExpenses?.toLocaleString()} ৳
                </div>
                <div className="text-gray-600">দৈনিক খরচ</div>
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card className="text-center border-0 shadow-md">
                <div className="text-purple-600 font-bold text-2xl">
                  {Math.round(
                    (dashboardData.monthlyNetProfit / dashboardData.monthlySales) *
                      100
                  ) || 0}%
                </div>
                <div className="text-gray-600">নিট লাভের হার</div>
              </Card>
            </Col>
          </Row>

          {/* Chart Tabs */}
          <Tabs
            activeKey={activeChartTab}
            onChange={setActiveChartTab}
            type="card"
            size="large"
          >
            <TabPane
              tab={
                <span>
                  <RiseOutlined />
                  দৈনিক বিশ্লেষণ
                </span>
              }
              key="daily"
            >
              {renderChart(dashboardData.salesProfitData.daily, "daily")}
            </TabPane>

            <TabPane
              tab={
                <span>
                  <BarChartOutlined />
                  মাসিক বিশ্লেষণ
                </span>
              }
              key="monthly"
            >
              {renderChart(dashboardData.salesProfitData.monthly, "monthly")}
            </TabPane>

            <TabPane
              tab={
                <span>
                  <AreaChartOutlined />
                  বার্ষিক বিশ্লেষণ
                </span>
              }
              key="yearly"
            >
              {renderChart(dashboardData.salesProfitData.yearly, "yearly")}
            </TabPane>
          </Tabs>

          {/* Data Summary */}
          <Card title="ডেটা সারসংক্ষেপ" className="border-0 shadow-md">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={6}>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 font-bold text-lg">
                    {dashboardData.totalOrders}
                  </div>
                  <div className="text-gray-600">মোট অর্ডার</div>
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-green-600 font-bold text-lg">
                    {dashboardData.totalProducts}
                  </div>
                  <div className="text-gray-600">মোট পণ্য</div>
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-red-600 font-bold text-lg">
                    {dashboardData.monthlyExpenses?.toLocaleString()} ৳
                  </div>
                  <div className="text-gray-600">মাসিক খরচ</div>
                </div>
              </Col>
              <Col xs={24} sm={6}>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-purple-600 font-bold text-lg">
                    {Math.round(
                      (dashboardData.monthlyNetProfit / dashboardData.monthlySales) *
                        100
                    ) || 0}%
                  </div>
                  <div className="text-gray-600">নিট লাভের হার</div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardHome;