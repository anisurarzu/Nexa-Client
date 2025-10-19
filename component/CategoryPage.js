"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Popconfirm,
  Spin,
  Pagination,
  Form,
  Input,
  Card,
  Row,
  Col,
  Tag,
  Statistic,
  Space,
  Tooltip,
  Select,
  InputNumber,
  Divider,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  BarcodeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import coreAxios from "@/utils/axiosInstance";

const { Option } = Select;
const { TextArea } = Input;

const CategoryPage = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
    totalProducts: 0,
  });

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  // Category types for electronics
  const categoryTypes = [
    { value: "electronics", label: "ইলেকট্রনিক্স" },
    { value: "accessories", label: "অ্যাকসেসরিজ" },
    { value: "home_appliances", label: "হোম অ্যাপ্লায়েন্সেস" },
    { value: "computers", label: "কম্পিউটার" },
    { value: "mobile", label: "মোবাইল" },
    { value: "audio_video", label: "অডিও-ভিডিও" },
    { value: "gaming", label: "গেমিং" },
    { value: "networking", label: "নেটওয়ার্কিং" },
  ];

  // Status options
  const statusOptions = [
    { value: "active", label: "সক্রিয়", color: "green" },
    { value: "inactive", label: "নিষ্ক্রিয়", color: "red" },
    { value: "draft", label: "খসড়া", color: "orange" },
  ];

  // Fetch categories from API
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await coreAxios.get("/categories");
      if (response?.status === 200) {
        setCategories(response.data);
        setFilteredCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      message.error("ক্যাটাগরি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Fetch category statistics
  const fetchCategoryStats = async () => {
    try {
      const response = await coreAxios.get("/getCategoryStats");
      if (response?.status === 200) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching category stats:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCategoryStats();
  }, []);

  const formik = useFormik({
    initialValues: {
      categoryName: "",
      categoryCode: "",
      description: "",
      categoryType: "",
      status: "active",
      createdBy: userInfo?.loginID,
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);

        if (isEditing) {
          // Update category API call
          const res = await coreAxios.put(`/categories/${editingKey}`, {
            ...values,
            updatedBy: userInfo?.loginID,
          });
          if (res?.status === 200) {
            message.success("ক্যাটাগরি সফলভাবে আপডেট হয়েছে!");
            fetchCategories();
            fetchCategoryStats();
          }
        } else {
          // Create category API call
          const res = await coreAxios.post("/categories", values);
          if (res?.status === 200) {
            message.success("নতুন ক্যাটাগরি সফলভাবে তৈরি হয়েছে!");
            fetchCategories();
            fetchCategoryStats();
          }
        }

        resetForm();
        setVisible(false);
        setIsEditing(false);
        setEditingKey(null);
      } catch (error) {
        console.error("Error saving category:", error);
        const errorMessage =
          error.response?.data?.error ||
          "ক্যাটাগরি সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleEdit = (record) => {
    setEditingKey(record._id);
    formik.setValues({
      categoryName: record.categoryName,
      categoryCode: record.categoryCode,
      description: record.description || "",
      categoryType: record.categoryType,
      status: record.status,
      createdBy: userInfo?.loginID,
    });
    setVisible(true);
    setIsEditing(true);
  };

  const handleDelete = async (key) => {
    setLoading(true);
    try {
      const res = await coreAxios.delete(`/categories/${key}`, {
        data: {
          deletedBy: userInfo?.loginID,
          deleteReason: "User initiated deletion",
        },
      });
      if (res?.status === 200) {
        message.success("ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে!");
        fetchCategories();
        fetchCategoryStats();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      const errorMessage =
        error.response?.data?.error ||
        "ক্যাটাগরি মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = categories.filter(
      (item) =>
        item.categoryName?.toLowerCase().includes(value.toLowerCase()) ||
        item.categoryCode?.toLowerCase().includes(value.toLowerCase()) ||
        item.description?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCategories(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const generateCategoryCode = async () => {
    try {
      const prefix = "CAT";
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `${prefix}-${randomNum}`;
      formik.setFieldValue("categoryCode", code);
    } catch (error) {
      console.error("Error generating category code:", error);
      message.error("ক্যাটাগরি কোড জেনারেট করতে সমস্যা হয়েছে।");
    }
  };

  const refreshData = () => {
    fetchCategories();
    fetchCategoryStats();
    message.success("ডেটা রিফ্রেশ করা হয়েছে!");
  };

  const columns = [
    {
      title: "ক্যাটাগরি নাম",
      dataIndex: "categoryName",
      key: "categoryName",
      sorter: (a, b) => a.categoryName?.localeCompare(b.categoryName),
      render: (text, record) => (
        <Space>
          <FolderOutlined className="text-blue-500" />
          <span className="font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: "ক্যাটাগরি কোড",
      dataIndex: "categoryCode",
      key: "categoryCode",
      render: (code) => (
        <Tag color="blue" className="font-mono">
          <BarcodeOutlined /> {code}
        </Tag>
      ),
    },
    {
      title: "ধরণ",
      dataIndex: "categoryType",
      key: "categoryType",
      render: (type) => {
        const typeObj = categoryTypes.find((t) => t.value === type);
        return typeObj ? (
          <Tag color="geekblue">{typeObj.label}</Tag>
        ) : (
          <Tag>{type}</Tag>
        );
      },
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusObj = statusOptions.find((s) => s.value === status);
        return (
          <Tag color={statusObj?.color || "default"}>
            {statusObj?.label || status}
          </Tag>
        );
      },
    },
    {
      title: "পণ্য সংখ্যা",
      dataIndex: "productsCount",
      key: "productsCount",
      sorter: (a, b) => a.productsCount - b.productsCount,
      render: (count) => (
        <Statistic
          value={count}
          valueStyle={{ fontSize: "16px", color: "#1890ff" }}
          prefix={<AppstoreOutlined />}
          className="text-center"
        />
      ),
    },
    {
      title: "তৈরির তারিখ",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => (text ? dayjs(text).format("DD/MM/YYYY") : "-"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    ...(userInfo?.pagePermissions?.[4]?.editAccess === true
      ? [
          {
            title: "কর্ম",
            key: "actions",
            width: 120,
            render: (_, record) => (
              <Space size="small">
                <Tooltip title="এডিট করুন">
                  <Button
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    className="bg-blue-500 border-blue-500"
                  />
                </Tooltip>
                <Tooltip title="ডিলিট করুন">
                  <Popconfirm
                    title="আপনি কি এই ক্যাটাগরি ডিলিট করতে চান?"
                    description="এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না!"
                    onConfirm={() => handleDelete(record._id)}
                    okText="হ্যাঁ"
                    cancelText="না"
                    okType="danger"
                    icon={
                      <ExclamationCircleOutlined className="text-red-500" />
                    }
                  >
                    <Button
                      type="primary"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (userInfo?.pagePermissions?.[4]?.viewAccess !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="text-center shadow-lg border-0 max-w-md">
          <ExclamationCircleOutlined className="text-6xl text-red-500 mb-4" />
          <h3 className="text-red-600 mb-2 text-xl font-bold">অনুমতি নেই</h3>
          <p className="text-gray-600">
            দুঃখিত, এই পৃষ্ঠা দেখার জন্য আপনার প্রয়োজনীয় অনুমতি নেই।
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              ক্যাটাগরি ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600">
              পণ্যের ক্যাটাগরি তৈরি, এডিট এবং ব্যবস্থাপনা করুন
            </p>
          </div>

          <Space>
            <Tooltip title="রিফ্রেশ করুন">
              <Button
                icon={<ReloadOutlined />}
                onClick={refreshData}
                size="large"
                className="border-blue-500 text-blue-500"
              >
                রিফ্রেশ
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                formik.resetForm();
                setVisible(true);
                setIsEditing(false);
                generateCategoryCode();
                formik.setFieldValue("status", "active");
                formik.setFieldValue("createdBy", userInfo?.loginID);
              }}
              className="bg-green-600 hover:bg-green-700 border-green-600 h-12 px-6 text-lg"
              size="large"
            >
              নতুন ক্যাটাগরি
            </Button>
          </Space>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="মোট ক্যাটাগরি"
                value={stats.totalCategories}
                prefix={<FolderOutlined className="text-blue-500" />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="সক্রিয় ক্যাটাগরি"
                value={stats.activeCategories}
                prefix={<AppstoreOutlined className="text-green-500" />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="মোট পণ্য"
                value={stats.totalProducts}
                prefix={<AppstoreOutlined className="text-purple-500" />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Search Section */}
      <Card className="shadow-md border-0 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Input.Search
            placeholder="ক্যাটাগরি নাম, কোড বা বর্ণনা দিয়ে খুঁজুন..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full lg:w-96"
            size="large"
            allowClear
            enterButton={
              <Button
                type="primary"
                className="bg-blue-500 border-blue-500"
                icon={<SearchOutlined />}
              >
                খুঁজুন
              </Button>
            }
          />

          <Select
            placeholder="স্ট্যাটাস দিয়ে ফিল্টার করুন"
            className="w-full lg:w-48"
            size="large"
            allowClear
            onChange={(value) => {
              if (!value) {
                setFilteredCategories(categories);
              } else {
                const filtered = categories.filter(
                  (cat) => cat.status === value
                );
                setFilteredCategories(filtered);
              }
              setPagination({ ...pagination, current: 1 });
            }}
          >
            {statusOptions.map((status) => (
              <Option key={status.value} value={status.value}>
                {status.label}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="ধরণ দিয়ে ফিল্টার করুন"
            className="w-full lg:w-48"
            size="large"
            allowClear
            onChange={(value) => {
              if (!value) {
                setFilteredCategories(categories);
              } else {
                const filtered = categories.filter(
                  (cat) => cat.categoryType === value
                );
                setFilteredCategories(filtered);
              }
              setPagination({ ...pagination, current: 1 });
            }}
          >
            {categoryTypes.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg border-0" bodyStyle={{ padding: 0 }}>
        <Spin spinning={loading} size="large">
          <Table
            columns={columns}
            dataSource={filteredCategories.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )}
            rowKey="_id"
            pagination={{
              ...pagination,
              total: filteredCategories.length,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `মোট ${total}টি ক্যাটাগরির মধ্যে ${range[0]}-${range[1]}টি দেখানো হচ্ছে`,
              onChange: handleTableChange,
            }}
            scroll={{ x: 800 }}
            className="custom-table"
          />
        </Spin>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="text-xl font-bold">
            {isEditing ? "ক্যাটাগরি এডিট করুন" : "নতুন ক্যাটাগরি তৈরি করুন"}
          </div>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          formik.resetForm();
          setIsEditing(false);
          setEditingKey(null);
        }}
        footer={null}
        width={600}
        centered
        className="modern-modal"
      >
        <Form
          onFinish={formik.handleSubmit}
          layout="vertical"
          className="space-y-4"
        >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item
                label="ক্যাটাগরি নাম"
                required
                validateStatus={formik.errors.categoryName ? "error" : ""}
                help={formik.errors.categoryName}
              >
                <Input
                  name="categoryName"
                  value={formik.values.categoryName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="ক্যাটাগরি নাম লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="ক্যাটাগরি কোড"
                required
                validateStatus={formik.errors.categoryCode ? "error" : ""}
                help={formik.errors.categoryCode}
              >
                <Input
                  name="categoryCode"
                  value={formik.values.categoryCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="ক্যাটাগরি কোড"
                  size="large"
                  addonBefore={
                    <Button
                      type="text"
                      icon={<BarcodeOutlined />}
                      onClick={generateCategoryCode}
                      className="text-blue-500"
                    >
                      জেনারেট
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item
                label="ক্যাটাগরি ধরণ"
                required
                validateStatus={formik.errors.categoryType ? "error" : ""}
                help={formik.errors.categoryType}
              >
                <Select
                  name="categoryType"
                  value={formik.values.categoryType}
                  onChange={(value) =>
                    formik.setFieldValue("categoryType", value)
                  }
                  onBlur={formik.handleBlur}
                  placeholder="ধরণ নির্বাচন করুন"
                  size="large"
                >
                  {categoryTypes.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="স্ট্যাটাস"
                required
                validateStatus={formik.errors.status ? "error" : ""}
                help={formik.errors.status}
              >
                <Select
                  name="status"
                  value={formik.values.status}
                  onChange={(value) => formik.setFieldValue("status", value)}
                  onBlur={formik.handleBlur}
                  placeholder="স্ট্যাটাস নির্বাচন করুন"
                  size="large"
                >
                  {statusOptions.map((status) => (
                    <Option key={status.value} value={status.value}>
                      <Tag color={status.color}>{status.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="বর্ণনা">
            <TextArea
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="ক্যাটাগরির বিস্তারিত বর্ণনা লিখুন"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Divider />

          <Form.Item className="mb-0">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setVisible(false);
                  formik.resetForm();
                  setIsEditing(false);
                  setEditingKey(null);
                }}
                size="large"
                className="px-6"
                disabled={loading}
              >
                বাতিল করুন
              </Button>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                size="large"
                className="bg-green-600 hover:bg-green-700 border-green-600 px-6"
              >
                {isEditing ? "আপডেট করুন" : "তৈরি করুন"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <style jsx>{`
        .custom-table :global(.ant-table-thead > tr > th) {
          background-color: #f8fafc;
          font-weight: 600;
          color: #374151;
        }

        .modern-modal :global(.ant-modal-header) {
          border-bottom: 2px solid #10b981;
        }
      `}</style>
    </div>
  );
};

export default CategoryPage;
