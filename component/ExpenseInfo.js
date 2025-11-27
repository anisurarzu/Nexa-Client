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
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  EyeOutlined,
  DollarOutlined,
  WalletOutlined,
  LineChartOutlined,
  FilterOutlined,
  ExportOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import coreAxios from "@/utils/axiosInstance";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
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
  const [dateRange, setDateRange] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stats, setStats] = useState({
    totalExpenses: 0,
    thisMonthExpenses: 0,
    averageExpense: 0,
  });

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  // Updated Expense Names as per requirement
  const expenseNames = [
    "ঘর ভাড়া",
    "বিদ্যুৎ বিল",
    "কর্মচারী বেতন",
    "মালকেরি বাবদ",
    "দোকান খরচ",
    "বিবিধ খরচ"
  ];

  // Bengali translations
  const bengaliText = {
    title: "খরচ ব্যবস্থাপনা",
    subtitle: "আপনার সকল ব্যবসায়িক খরচ এক স্থানে ট্র্যাক ও ব্যবস্থাপনা করুন",
    stats: {
      totalExpenses: "মোট খরচ",
      thisMonth: "এই মাসের খরচ",
      pending: "বিচারাধীন",
      averageExpense: "গড় খরচ",
    },
    filters: {
      search: "খরচের নাম বা কারণ অনুসন্ধান...",
      category: "খরচের নাম",
      allCategories: "সব খরচ",
    },
    table: {
      date: "তারিখ",
      expenseName: "খরচের নাম",
      amount: "পরিমাণ",
      reason: "কারণ",
      expenseBy: "খরচ করেছেন",
      actions: "কর্ম",
    },
    form: {
      createTitle: "নতুন খরচ যোগ করুন",
      editTitle: "খরচ সম্পাদনা করুন",
      expenseName: "খরচের নাম *",
      expenseNamePlaceholder: "খরচের নাম নির্বাচন করুন",
      amount: "পরিমাণ *",
      amountPlaceholder: "০.০০",
      reason: "কারণ ",
      reasonPlaceholder: "খরচের কারণ লিখুন",
      expenseDate: "খরচের তারিখ *",
      expenseBy: "খরচ করেছেন *",
      expenseByPlaceholder: "আপনার নাম",
      createButton: "➕ খরচ যোগ করুন",
      updateButton: "💾 আপডেট করুন",
    },
    buttons: {
      addExpense: "➕ নতুন খরচ",
      refresh: "রিফ্রেশ",
      edit: "সম্পাদনা",
      delete: "মুছুন",
      cancel: "বাতিল",
      confirmDelete: "হ্যাঁ, মুছুন",
    },
    messages: {
      success: {
        created: "✅ খরচ সফলভাবে যোগ হয়েছে!",
        updated: "✅ খরচ সফলভাবে আপডেট হয়েছে!",
        deleted: "🗑️ খরচ সফলভাবে মুছে ফেলা হয়েছে!",
        refreshed: "🔄 ডেটা রিফ্রেশ করা হয়েছে!",
      },
      error: {
        fetch: "খরচ ডেটা লোড করতে ব্যর্থ হয়েছে।",
        save: "খরচ সংরক্ষণ করতে ব্যর্থ হয়েছে।",
        delete: "খরচ মুছতে ব্যর্থ হয়েছে।",
      },
      confirm: {
        delete: "এই খরচ মুছবেন?",
        deleteDescription: "আপনি কি নিশ্চিত যে আপনি এই খরচটি মুছতে চান?",
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
      message.error(bengaliText.messages.error.fetch);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const calculateStats = (expenses) => {
    const totalExpenses = expenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const thisMonthExpenses = expenses
      .filter((item) => dayjs(item.expenseDate).isSame(dayjs(), "month"))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const averageExpense =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;

    setStats({
      totalExpenses,
      thisMonthExpenses,
      averageExpense,
    });
  };

  useEffect(() => {
    fetchExpense();
  }, []);

  const formik = useFormik({
    initialValues: {
      expenseName: "",
      amount: 0,
      reason: "",
      expenseDate: dayjs().format("YYYY-MM-DD"),
      expenseBy: userInfo?.loginID || "",
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);

        const expenseData = {
          ...values,
          reason:values?.reason||" n/a reason",
          amount: Number(values.amount),
          createdBy: userInfo?.loginID,
          createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        };

        let res;
        if (isEditing) {
          res = await coreAxios.put(`expense/${editingKey}`, expenseData);
        } else {
          res = await coreAxios.post("expense", expenseData);
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
        message.error(bengaliText.messages.error.save);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleEdit = (record) => {
    setEditingKey(record._id);
    formik.setValues({
      expenseName: record.expenseName,
      amount: record.amount,
      reason: record.reason||" n/a reason",
      expenseDate: record.expenseDate,
      expenseBy: record.expenseBy,
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
      message.error(bengaliText.messages.error.delete);
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
    filterExpenses(value, categoryFilter);
  };

  const handleCategoryFilter = (category) => {
    setCategoryFilter(category);
    filterExpenses(searchText, category);
  };

  const filterExpenses = (search, category) => {
    let filtered = expenses;

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.expenseName?.toLowerCase().includes(search.toLowerCase()) ||
          item.reason?.toLowerCase().includes(search.toLowerCase()) ||
          item.expenseBy?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter
    if (category !== "all") {
      filtered = filtered.filter((item) => item.expenseName === category);
    }

    setFilteredExpenses(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return dayjs(date).format("DD MMM YYYY");
  };

  const formatCurrency = (value) => {
    return (
      new Intl.NumberFormat("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value || 0) + " ৳"
    );
  };

  const columns = [
    {
      title: bengaliText.table.date,
      dataIndex: "expenseDate",
      key: "expenseDate",
      width: 120,
      render: (text) => (
        <div className="text-sm font-medium">{formatDate(text)}</div>
      ),
    },
    {
      title: bengaliText.table.expenseName,
      dataIndex: "expenseName",
      key: "expenseName",
      width: 150,
      render: (text) => (
        <Text strong className="text-gray-800">
          {text}
        </Text>
      ),
    },
    {
      title: bengaliText.table.amount,
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (text) => (
        <Text strong className="text-red-600 text-lg">
          {formatCurrency(text)}
        </Text>
      ),
    },
    {
      title: bengaliText.table.reason,
      dataIndex: "reason",
      key: "reason",
      width: 200,
      render: (text) => (
        <Text type="secondary" className="text-sm">
          {text}
        </Text>
      ),
    },
    {
      title: bengaliText.table.expenseBy,
      dataIndex: "expenseBy",
      key: "expenseBy",
      width: 120,
      render: (text) => (
        <Tag color="green" className="text-xs">
          {text}
        </Tag>
      ),
    },
    {
      title: bengaliText.table.actions,
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="সম্পাদনা">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              className="text-blue-500 hover:text-blue-700"
            />
          </Tooltip>
          <Popconfirm
            title={bengaliText.messages.confirm.delete}
            description={bengaliText.messages.confirm.deleteDescription}
            onConfirm={() => handleDelete(record._id)}
            okText={bengaliText.buttons.confirmDelete}
            cancelText={bengaliText.buttons.cancel}
            okType="danger"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              className="text-red-500 hover:text-red-700"
            />
          </Popconfirm>
        </Space>
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
          <Form.Item
            label={bengaliText.form.expenseName}
            required
            help={formik.touched.expenseName && formik.errors.expenseName}
            validateStatus={
              formik.touched.expenseName && formik.errors.expenseName
                ? "error"
                : ""
            }
          >
            <Select
              name="expenseName"
              value={formik.values.expenseName}
              onChange={(value) => formik.setFieldValue("expenseName", value)}
              placeholder={bengaliText.form.expenseNamePlaceholder}
              size="large"
            >
              {expenseNames.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={bengaliText.form.amount} required>
            <InputNumber
              name="amount"
              value={formik.values.amount}
              onChange={(value) => formik.setFieldValue("amount", value)}
              placeholder={bengaliText.form.amountPlaceholder}
              min={0}
              style={{ width: "100%" }}
              size="large"
              formatter={(value) =>
                `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/৳\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={bengaliText.form.reason} required>
        <Input.TextArea
          name="reason"
          value={formik.values.reason}
          onChange={formik.handleChange}
          placeholder={bengaliText.form.reasonPlaceholder}
          rows={3}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={bengaliText.form.expenseDate} required>
            <DatePicker
              name="expenseDate"
              value={
                formik.values.expenseDate
                  ? dayjs(formik.values.expenseDate)
                  : null
              }
              onChange={(date) =>
                formik.setFieldValue(
                  "expenseDate",
                  date ? date.format("YYYY-MM-DD") : ""
                )
              }
              style={{ width: "100%" }}
              size="large"
              format="DD MMM YYYY"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={bengaliText.form.expenseBy} required>
            <Input
              name="expenseBy"
              value={formik.values.expenseBy}
              onChange={formik.handleChange}
              placeholder={bengaliText.form.expenseByPlaceholder}
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          size="large"
          block
          className="h-12 bg-green-600 hover:bg-green-700 border-none shadow-lg"
          icon={<ShoppingOutlined />}
        >
          {isEditing
            ? bengaliText.form.updateButton
            : bengaliText.form.createButton}
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
              icon={<SyncOutlined spin={refreshing} />}
              onClick={handleRefresh}
              disabled={refreshing}
              size="large"
            >
              {bengaliText.buttons.refresh}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                formik.resetForm();
                formik.setFieldValue("expenseBy", userInfo?.loginID || "");
                formik.setFieldValue(
                  "expenseDate",
                  dayjs().format("YYYY-MM-DD")
                );
                setVisible(true);
                setIsEditing(false);
              }}
              icon={<PlusOutlined />}
              size="large"
              className="h-12 bg-green-600 hover:bg-green-700 border-none"
            >
              {bengaliText.buttons.addExpense}
            </Button>
          </Space>
        </div>
      </div>

      {/* Simple Stats */}
      {!initialLoading && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="text-center">
              <Statistic
                title={bengaliText.stats.totalExpenses}
                value={stats.totalExpenses}
                precision={2}
                prefix="৳ "
                valueStyle={{ color: "#ef4444" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center">
              <Statistic
                title={bengaliText.stats.thisMonth}
                value={stats.thisMonthExpenses}
                precision={2}
                prefix="৳ "
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center">
              <Statistic
                title={bengaliText.stats.averageExpense}
                value={stats.averageExpense}
                precision={2}
                prefix="৳ "
                valueStyle={{ color: "#10b981" }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Simple Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Input.Search
            placeholder={bengaliText.filters.search}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
            size="large"
          />

          <Select
            value={categoryFilter}
            onChange={handleCategoryFilter}
            size="large"
            style={{ width: 200 }}
            placeholder={bengaliText.filters.category}
          >
            <Option value="all">{bengaliText.filters.allCategories}</Option>
            {expenseNames.map((name) => (
              <Option key={name} value={name}>
                {name}
              </Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Main Table ______________ */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredExpenses}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredExpenses.length,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["10", "20", "50"],
          }}
          loading={loading}
          scroll={{ x: 800 }}
        />
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
        width={600}
        destroyOnClose
      >
        {renderForm()}
      </Modal>
    </div>
  );
};

export default ExpenseInfo;