"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Popconfirm,
  Pagination,
  Form,
  Input,
  Dropdown,
  Menu,
  Tooltip,
  Card,
  Skeleton,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Select,
  DatePicker,
  InputNumber,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  CopyOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  EyeOutlined,
  FileTextOutlined,
  DollarOutlined,
  WalletOutlined,
  LineChartOutlined,
  FilterOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import coreAxios from "@/utils/axiosInstance";
import CopyToClipboard from "react-copy-to-clipboard";
import Link from "next/link";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const ExpenseInfo = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [invoiceInfo, setInvoiceInfo] = useState({});
  const [dateRange, setDateRange] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalCashInHand: 0,
    averageCost: 0,
    thisMonthExpenses: 0,
    pendingExpenses: 0,
  });

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  // Bengali translations
  const bengaliText = {
    title: "খরচ ব্যবস্থাপনা",
    subtitle: "আপনার সকল ব্যবসায়িক খরচ এক স্থানে ট্র্যাক ও ব্যবস্থাপনা করুন",
    stats: {
      totalExpenses: "মোট খরচ",
      totalCashInHand: "নগদ在手",
      thisMonth: "এই মাসের খরচ",
      pending: "বিচারাধীন",
      allTime: "সর্বমোট ব্যয়",
      netProfit: "নেট লাভ",
      currentMonth: "বর্তমান মাসের খরচ",
      needAttention: "খরচ মনোযোগ প্রয়োজন",
    },
    filters: {
      search: "ইনভয়েস, ক্রিয়েটর, বা নোটস অনুসন্ধান করুন...",
      startDate: "শুরুর তারিখ",
      endDate: "শেষ তারিখ",
      allStatus: "সব স্ট্যাটাস",
      profit: "লাভ",
      loss: "লস",
      breakEven: "ব্রেক ইভেন",
    },
    table: {
      dateTime: "তারিখ ও সময়",
      invoiceNo: "ইনভয়েস নং",
      grandTotal: "গ্র্যান্ড টোটাল",
      totalCost: "মোট খরচ",
      cashInHand: "নগদ在手",
      createdBy: "তৈরি করেছেন",
      notes: "নোটস",
      actions: "কর্ম",
      records: "রেকর্ড",
      showing: "দেখানো হচ্ছে",
      of: "এর",
      items: "আইটেম",
    },
    form: {
      createTitle: "নতুন খরচ তৈরি করুন",
      editTitle: "খরচ রেকর্ড সম্পাদনা করুন",
      invoiceNumber: "ইনভয়েস নম্বর",
      invoicePlaceholder: "FTB-XXXX",
      grandTotal: "গ্র্যান্ড টোটাল",
      flowerCost: "ফুলের খরচ",
      deliveryCost: "ডেলিভারি খরচ",
      additionalCost: "অতিরিক্ত খরচ",
      totalCost: "মোট খরচ",
      cashInHand: "নগদ在手",
      notes: "নোটস",
      notesPlaceholder: "এই খরচ সম্পর্কে অতিরিক্ত নোটস...",
      createButton: "✨ খরচ তৈরি করুন",
      updateButton: "💾 খরচ আপডেট করুন",
    },
    buttons: {
      export: "এক্সপোর্ট CSV",
      addExpense: "খরচ যোগ করুন",
      refresh: "রিফ্রেশ",
      viewInvoice: "ইনভয়েস দেখুন",
      editExpense: "খরচ সম্পাদনা",
      delete: "মুছুন",
      cancel: "বাতিল",
      confirmDelete: "হ্যাঁ, মুছুন",
    },
    messages: {
      success: {
        created: "✅ খরচ সফলভাবে তৈরি হয়েছে!",
        updated: "✅ খরচ সফলভাবে আপডেট হয়েছে!",
        deleted: "🗑️ খরচ সফলভাবে মুছে ফেলা হয়েছে!",
        exported: "📊 খরচ ডেটা সফলভাবে এক্সপোর্ট হয়েছে!",
        copied: "📋 ইনভয়েস নম্বর কপি করা হয়েছে!",
        refreshed: "🔄 খরচ ডেটা রিফ্রেশ করা হচ্ছে...",
      },
      error: {
        fetch: "খরচ ডেটা লোড করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
        invoice:
          "ইনভয়েস তথ্য লোড করতে ব্যর্থ হয়েছে। দয়া করে ইনভয়েস নম্বর চেক করুন।",
        save: "খরচ সংরক্ষণ করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
        delete: "খরচ মুছতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।",
      },
      confirm: {
        delete: "এই খরচ মুছবেন?",
        deleteDescription: "আপনি কি নিশ্চিত যে আপনি এই খরচ রেকর্ডটি মুছতে চান?",
      },
      accessDenied: {
        title: "অ্যাক্সেস ডিনাইড",
        message: "আপনার খরচ ব্যবস্থাপনা বিভাগে অ্যাক্সেসের অনুমতি নেই।",
      },
    },
  };

  const fetchExpense = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await coreAxios.get("expense");
      if (response?.status === 200) {
        const expensesData = response.data?.expenses || [];
        setExpenses(expensesData);
        setFilteredExpenses(expensesData);
        calculateStats(expensesData);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || bengaliText.messages.error.fetch;
      message.error(errorMessage);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const calculateStats = (expenses) => {
    const totalExpenses = expenses.reduce(
      (sum, item) => sum + Number(item.totalCost || 0),
      0
    );

    const totalCashInHand = expenses.reduce(
      (sum, item) => sum + Number(item.cashInHand || 0),
      0
    );

    const averageCost =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;

    const thisMonthExpenses = expenses
      .filter((item) => dayjs(item.createdDate).isSame(dayjs(), "month"))
      .reduce((sum, item) => sum + Number(item.totalCost || 0), 0);

    const pendingExpenses = expenses.filter(
      (item) => Number(item.cashInHand || 0) < 0
    ).length;

    setStats({
      totalExpenses,
      totalCashInHand,
      averageCost,
      thisMonthExpenses,
      pendingExpenses,
    });
  };

  useEffect(() => {
    fetchExpense();
  }, []);

  const fetchGrandTotal = async (invoiceNo) => {
    try {
      const response = await coreAxios.get(`/getOrderInfo/${invoiceNo}`);
      if (response?.status === 200) {
        setInvoiceInfo(response?.data);
        return response.data.grandTotal;
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || bengaliText.messages.error.invoice;
      message.error(errorMessage);
      return null;
    }
  };

  const calculateTotalCost = (values) => {
    const { flowerCost, deliveryCost, additionalCost } = values;
    return (
      Number(flowerCost || 0) +
      Number(deliveryCost || 0) +
      Number(additionalCost || 0)
    );
  };

  const calculateCashInHand = (grandTotal, totalCost) => {
    return Number(grandTotal || 0) - Number(totalCost || 0);
  };

  const formatCurrency = (value) => {
    return (
      new Intl.NumberFormat("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value || 0) + " ৳"
    );
  };

  const formik = useFormik({
    initialValues: {
      invoiceNo: "",
      grandTotal: 0,
      flowerCost: 0,
      deliveryCost: 0,
      additionalCost: 0,
      totalCost: 0,
      cashInHand: 0,
      createdBy: userInfo?.loginID,
      createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      invoiceId: "",
      notes: "",
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        const totalCost = calculateTotalCost(values);
        const cashInHand = calculateCashInHand(values.grandTotal, totalCost);
        const newExpense = {
          ...values,
          totalCost,
          cashInHand,
          invoiceId: invoiceInfo?._id,
        };

        let res;
        if (isEditing) {
          res = await coreAxios.put(`expense/${editingKey}`, newExpense);
        } else {
          res = await coreAxios.post("expense", newExpense);
        }

        if (res?.status === 200) {
          message.success(
            isEditing
              ? bengaliText.messages.success.updated
              : bengaliText.messages.success.created
          );
          fetchExpense();
          resetForm();
          setVisible(false);
          setIsEditing(false);
          setEditingKey(null);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || bengaliText.messages.error.save;
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleFieldChange = async (fieldName, value) => {
    await formik.setFieldValue(fieldName, value);
    const latestValues = { ...formik.values, [fieldName]: value };

    if (fieldName === "invoiceNo") {
      const grandTotal = await fetchGrandTotal(value);
      if (grandTotal !== null) {
        await formik.setFieldValue("grandTotal", grandTotal);
        latestValues.grandTotal = grandTotal;
      }
    }

    const totalCost = calculateTotalCost(latestValues);
    await formik.setFieldValue("totalCost", totalCost);

    const cashInHand = calculateCashInHand(latestValues.grandTotal, totalCost);
    await formik.setFieldValue("cashInHand", cashInHand);
  };

  const handleEdit = (record) => {
    setEditingKey(record._id);
    formik.setValues({
      invoiceNo: record.invoiceNo,
      grandTotal: record.grandTotal,
      flowerCost: record.flowerCost,
      deliveryCost: record.deliveryCost,
      additionalCost: record.additionalCost,
      totalCost: record.totalCost,
      cashInHand: record.cashInHand,
      createdBy: record.createdBy,
      createdDate: record.createdDate,
      invoiceId: record._id,
      notes: record.notes || "",
    });
    setVisible(true);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const res = await coreAxios.delete(`expense/${id}`);
      if (res?.status === 200) {
        message.success(bengaliText.messages.success.deleted);
        fetchExpense();
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || bengaliText.messages.error.delete;
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchExpense(true);
    message.info(bengaliText.messages.success.refreshed);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    filterExpenses(value, dateRange, statusFilter);
  };

  const handleDateFilter = (dates) => {
    setDateRange(dates);
    filterExpenses(searchText, dates, statusFilter);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    filterExpenses(searchText, dateRange, status);
  };

  const filterExpenses = (search, dates, status) => {
    let filtered = expenses;

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
          item.createdBy?.toLowerCase().includes(search.toLowerCase()) ||
          item.notes?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Date filter
    if (dates && dates.length === 2) {
      filtered = filtered.filter((item) => {
        const itemDate = dayjs(item.createdDate);
        return (
          itemDate.isAfter(dates[0].startOf("day")) &&
          itemDate.isBefore(dates[1].endOf("day"))
        );
      });
    }

    // Status filter
    if (status !== "all") {
      filtered = filtered.filter((item) => {
        if (status === "profit") return Number(item.cashInHand || 0) > 0;
        if (status === "loss") return Number(item.cashInHand || 0) < 0;
        if (status === "break_even") return Number(item.cashInHand || 0) === 0;
        return true;
      });
    }

    setFilteredExpenses(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const formatDeliveryDateTime = (dateTime) => {
    if (!dateTime) return "-";
    return dayjs.utc(dateTime).tz("Asia/Dhaka").format("DD MMM YYYY, hh:mm A");
  };

  const exportToCSV = () => {
    const headers = [
      "ইনভয়েস নং",
      "গ্র্যান্ড টোটাল",
      "মোট খরচ",
      "নগদ在手",
      "তৈরি করেছেন",
      "তারিখ",
    ];
    const csvData = filteredExpenses.map((expense) => [
      expense.invoiceNo,
      expense.grandTotal,
      expense.totalCost,
      expense.cashInHand,
      expense.createdBy,
      formatDeliveryDateTime(expense.createdDate),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(bengaliText.messages.success.exported);
  };

  const StatsSkeleton = () => (
    <Row gutter={[16, 16]}>
      {[1, 2, 3, 4].map((item) => (
        <Col xs={24} sm={12} lg={6} key={item}>
          <Card className="stats-card">
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );

  const TableSkeleton = () => (
    <Card>
      {Array(6)
        .fill()
        .map((_, i) => (
          <div key={i} style={{ display: "flex", marginBottom: 16, gap: 16 }}>
            {Array(7)
              .fill()
              .map((_, j) => (
                <div key={j} style={{ flex: 1 }}>
                  <Skeleton.Input
                    active
                    style={{ width: "100%", height: 20 }}
                  />
                </div>
              ))}
          </div>
        ))}
    </Card>
  );

  const columns = [
    {
      title: bengaliText.table.dateTime,
      dataIndex: "createdDate",
      key: "createdDate",
      width: 160,
      render: (text) => (
        <div className="text-xs">
          <div className="font-medium text-gray-900">
            {formatDeliveryDateTime(text)}
          </div>
        </div>
      ),
    },
    {
      title: bengaliText.table.invoiceNo,
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 140,
      fixed: "left",
      render: (invoiceNo, record) => (
        <div className="flex items-center space-x-2">
          <Link
            target="_blank"
            href={`/dashboard/${record.invoiceNo}`}
            passHref
            className="no-underline"
          >
            <Tag
              color="blue"
              className="cursor-pointer hover:shadow-md transition-all"
            >
              <FileTextOutlined className="mr-1" />
              {invoiceNo}
            </Tag>
          </Link>
          <Tooltip title="ইনভয়েস নম্বর কপি করুন">
            <CopyToClipboard
              text={invoiceNo}
              onCopy={() =>
                message.success(bengaliText.messages.success.copied)
              }
            >
              <CopyOutlined className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors" />
            </CopyToClipboard>
          </Tooltip>
        </div>
      ),
    },
    {
      title: bengaliText.table.grandTotal,
      dataIndex: "grandTotal",
      key: "grandTotal",
      width: 130,
      render: (text) => (
        <Text strong className="text-green-600">
          {formatCurrency(text)}
        </Text>
      ),
    },
    {
      title: bengaliText.table.totalCost,
      dataIndex: "totalCost",
      key: "totalCost",
      width: 130,
      render: (text) => (
        <Text strong className="text-red-600">
          {formatCurrency(text)}
        </Text>
      ),
    },
    {
      title: bengaliText.table.cashInHand,
      dataIndex: "cashInHand",
      key: "cashInHand",
      width: 140,
      render: (text) => {
        const amount = Number(text || 0);
        const isProfit = amount > 0;
        const isLoss = amount < 0;

        return (
          <Tag
            color={isProfit ? "success" : isLoss ? "error" : "default"}
            className="font-semibold text-sm"
          >
            {isProfit ? "↑ " : isLoss ? "↓ " : ""}
            {formatCurrency(amount)}
          </Tag>
        );
      },
    },
    {
      title: bengaliText.table.createdBy,
      dataIndex: "createdBy",
      key: "createdBy",
      width: 130,
      render: (text) => (
        <Tag color="purple" className="text-xs">
          {text}
        </Tag>
      ),
    },
    {
      title: bengaliText.table.notes,
      dataIndex: "notes",
      key: "notes",
      width: 150,
      render: (text) => (
        <Text type="secondary" className="text-xs truncate block" title={text}>
          {text || "-"}
        </Text>
      ),
    },
    {
      title: bengaliText.table.actions,
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item
                key="view"
                icon={<EyeOutlined />}
                onClick={() =>
                  window.open(`/dashboard/${record.invoiceNo}`, "_blank")
                }
              >
                {bengaliText.buttons.viewInvoice}
              </Menu.Item>
              {userInfo?.pegePermissions?.[3]?.editAccess && (
                <Menu.Item
                  key="edit"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  {bengaliText.buttons.editExpense}
                </Menu.Item>
              )}
              {userInfo?.pegePermissions?.[3]?.editAccess && (
                <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                  <Popconfirm
                    title={bengaliText.messages.confirm.delete}
                    description={bengaliText.messages.confirm.deleteDescription}
                    onConfirm={() => handleDelete(record._id)}
                    okText={bengaliText.buttons.confirmDelete}
                    cancelText={bengaliText.buttons.cancel}
                    okType="danger"
                  >
                    {bengaliText.buttons.delete}
                  </Popconfirm>
                </Menu.Item>
              )}
            </Menu>
          }
          trigger={["click"]}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="small"
            icon={<DownOutlined />}
            className="hover:bg-gray-100"
          />
        </Dropdown>
      ),
    },
  ];

  const renderForm = () => (
    <Form
      onFinish={formik.handleSubmit}
      layout="vertical"
      className="space-y-4"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={bengaliText.form.invoiceNumber} required>
            <Input
              name="invoiceNo"
              value={formik.values.invoiceNo}
              onChange={(e) => handleFieldChange("invoiceNo", e.target.value)}
              placeholder={bengaliText.form.invoicePlaceholder}
              size="large"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={bengaliText.form.grandTotal}>
            <Input
              name="grandTotal"
              value={formatCurrency(formik.values.grandTotal)}
              disabled
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={bengaliText.form.flowerCost} required>
            <InputNumber
              name="flowerCost"
              value={formik.values.flowerCost}
              onChange={(value) => handleFieldChange("flowerCost", value)}
              placeholder="0.00"
              min={0}
              style={{ width: "100%" }}
              size="large"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={bengaliText.form.deliveryCost} required>
            <InputNumber
              name="deliveryCost"
              value={formik.values.deliveryCost}
              onChange={(value) => handleFieldChange("deliveryCost", value)}
              placeholder="0.00"
              min={0}
              style={{ width: "100%" }}
              size="large"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={bengaliText.form.additionalCost}>
            <InputNumber
              name="additionalCost"
              value={formik.values.additionalCost}
              onChange={(value) => handleFieldChange("additionalCost", value)}
              placeholder="0.00"
              min={0}
              style={{ width: "100%" }}
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={bengaliText.form.totalCost}>
            <Input
              name="totalCost"
              value={formatCurrency(formik.values.totalCost)}
              disabled
              size="large"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={bengaliText.form.cashInHand}>
            <Input
              name="cashInHand"
              value={formatCurrency(formik.values.cashInHand)}
              disabled
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={bengaliText.form.notes}>
        <Input.TextArea
          name="notes"
          value={formik.values.notes}
          onChange={formik.handleChange}
          placeholder={bengaliText.form.notesPlaceholder}
          rows={3}
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          size="large"
          block
          className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none shadow-lg"
        >
          {isEditing
            ? bengaliText.form.updateButton
            : bengaliText.form.createButton}
        </Button>
      </Form.Item>
    </Form>
  );

  if (!userInfo?.pegePermissions?.[3]?.viewAccess) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Card className="text-center border-0 shadow-lg max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <Title level={3} className="text-gray-700 mb-2">
            {bengaliText.messages.accessDenied.title}
          </Title>
          <Text type="secondary">
            {bengaliText.messages.accessDenied.message}
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <style jsx>{`
        .stats-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
        }
        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e0;
        }
        .filter-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
        }
      `}</style>

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Title level={2} className="!mb-2 text-gray-800">
              💰 {bengaliText.title}
            </Title>
            <Text type="secondary" className="text-base">
              {bengaliText.subtitle}
            </Text>
          </div>
          <Space>
            <Button
              icon={<ExportOutlined />}
              onClick={exportToCSV}
              size="large"
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
            >
              {bengaliText.buttons.export}
            </Button>
            {userInfo?.pegePermissions?.[3]?.insertAccess && (
              <Button
                type="primary"
                onClick={() => {
                  formik.resetForm();
                  setVisible(true);
                  setIsEditing(false);
                }}
                icon={<PlusOutlined />}
                size="large"
                className="h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-none shadow-lg"
              >
                {bengaliText.buttons.addExpense}
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* Stats Section */}
      {initialLoading ? (
        <StatsSkeleton />
      ) : (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card className="stats-card">
              <Statistic
                title={bengaliText.stats.totalExpenses}
                value={stats.totalExpenses}
                precision={2}
                prefix="৳ "
                valueStyle={{ color: "#ef4444" }}
                suffix={<DollarOutlined className="text-red-500" />}
              />
              <Text type="secondary" className="text-xs">
                {bengaliText.stats.allTime}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stats-card">
              <Statistic
                title={bengaliText.stats.totalCashInHand}
                value={stats.totalCashInHand}
                precision={2}
                prefix="৳ "
                valueStyle={{
                  color: stats.totalCashInHand >= 0 ? "#10b981" : "#ef4444",
                }}
                suffix={
                  <WalletOutlined
                    className={
                      stats.totalCashInHand >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  />
                }
              />
              <Text type="secondary" className="text-xs">
                {bengaliText.stats.netProfit}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stats-card">
              <Statistic
                title={bengaliText.stats.thisMonth}
                value={stats.thisMonthExpenses}
                precision={2}
                prefix="৳ "
                valueStyle={{ color: "#f59e0b" }}
                suffix={<LineChartOutlined className="text-orange-500" />}
              />
              <Text type="secondary" className="text-xs">
                {bengaliText.stats.currentMonth}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stats-card">
              <Statistic
                title={bengaliText.stats.pending}
                value={stats.pendingExpenses}
                valueStyle={{ color: "#8b5cf6" }}
                suffix={
                  <SyncOutlined
                    spin={stats.pendingExpenses > 0}
                    className="text-purple-500"
                  />
                }
              />
              <Text type="secondary" className="text-xs">
                {bengaliText.stats.needAttention}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters Section */}
      <Card className="mb-6 filter-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <Input.Search
              placeholder={bengaliText.filters.search}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
              size="large"
              prefix={<SearchOutlined className="text-gray-400" />}
              className="bg-white rounded-lg"
            />

            <RangePicker
              onChange={handleDateFilter}
              size="large"
              className="rounded-lg bg-white"
              placeholder={[
                bengaliText.filters.startDate,
                bengaliText.filters.endDate,
              ]}
            />

            <Select
              value={statusFilter}
              onChange={handleStatusFilter}
              size="large"
              style={{ width: 150 }}
              className="rounded-lg bg-white"
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">{bengaliText.filters.allStatus}</Option>
              <Option value="profit">{bengaliText.filters.profit}</Option>
              <Option value="loss">{bengaliText.filters.loss}</Option>
              <Option value="break_even">
                {bengaliText.filters.breakEven}
              </Option>
            </Select>
          </div>

          <Space>
            <Button
              icon={<SyncOutlined spin={refreshing} />}
              onClick={handleRefresh}
              disabled={refreshing}
              size="large"
              className="bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              {bengaliText.buttons.refresh}
            </Button>
          </Space>
        </div>
      </Card>

      {/* Main Table */}
      <Card
        className="shadow-lg border-0 rounded-xl overflow-hidden"
        bodyStyle={{ padding: 0 }}
      >
        {initialLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <Title level={4} className="!mb-0">
                  খরচ রেকর্ড
                </Title>
                <Tag color="blue" className="text-sm px-3 py-1">
                  {filteredExpenses.length} {bengaliText.table.records}
                </Tag>
              </div>
            </div>
            <Table
              columns={columns}
              dataSource={filteredExpenses.slice(
                (pagination.current - 1) * pagination.pageSize,
                pagination.current * pagination.pageSize
              )}
              rowKey="_id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: filteredExpenses.length,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} ${bengaliText.table.showing} ${total} ${bengaliText.table.items}`,
                onChange: (page, pageSize) => {
                  setPagination({ current: page, pageSize });
                },
              }}
              scroll={{ x: 1200 }}
              loading={loading}
              className="ant-table-striped"
              rowClassName={(record, index) =>
                index % 2 === 0 ? "table-row-light" : "table-row-dark"
              }
            />
          </>
        )}
      </Card>

      {/* Expense Form Modal */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <EditOutlined className="text-blue-500" />
                <span>{bengaliText.form.editTitle}</span>
              </>
            ) : (
              <>
                <PlusOutlined className="text-green-500" />
                <span>{bengaliText.form.createTitle}</span>
              </>
            )}
          </div>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          formik.resetForm();
        }}
        footer={null}
        width={700}
        destroyOnClose
        className="rounded-lg"
        styles={{
          body: { padding: "24px" },
        }}
      >
        {renderForm()}
      </Modal>
    </div>
  );
};

export default ExpenseInfo;
