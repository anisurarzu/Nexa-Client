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
  Dropdown,
  Menu,
  Select,
  Upload,
  Image,
  Card,
  Row,
  Col,
  Tag,
  Statistic,
  Space,
  Tooltip,
  InputNumber,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  UploadOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import coreAxios from "@/utils/axiosInstance";

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

const InventoryPage = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  // Fetch inventory items from API
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await coreAxios.get("products");
      if (response?.status === 200) {
        const products = response.data?.products || [];
        setInventoryItems(products);
        setFilteredInventory(products);

        // Calculate statistics
        const totalProducts = products.length;
        const lowStock = products.filter((item) => item.qty < 10).length;
        const outOfStock = products.filter((item) => item.qty === 0).length;

        setStats({
          totalProducts,
          lowStock,
          outOfStock,
        });
      }
    } catch (error) {
      message.error(
        "ইনভেন্টরি আইটেম লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await coreAxios.get("/categories");
      if (response?.status === 200) {
        // Only show active categories
        const activeCategories = response.data.filter(
          (cat) => cat.status === "active" && cat.statusCode !== 255
        );
        setCategories(activeCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      message.error("ক্যাটাগরি লোড করতে সমস্যা হয়েছে।");
    }
  };

  // Fetch users for purchaseBy dropdown
  const fetchUsers = async () => {
    try {
      const response = await coreAxios.get("/auth/users");
      if (response?.status === 200) {
        setUsers(response.data?.users || []);
      }
    } catch (error) {
      message.error("ব্যবহারকারী লোড করতে সমস্যা হয়েছে।");
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchUsers();
  }, []);

  const formik = useFormik({
    initialValues: {
      productName: "",
      category: "",
      description: "",
      qty: 0,
      stockQTY: 0,
      purchaseBy: "",
      createdBy: userInfo?.loginID,
      createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      imageUrl: "",
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        const newInventoryItem = {
          ...values,
          stockQTY: values?.stockQTY || values?.qty || 0,
          createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        };

        let res;

        if (isEditing) {
          console.log("Editing Key:", editingKey);
          res = await coreAxios.put(`products/${editingKey}`, newInventoryItem);
          if (res?.status === 200) {
            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const productID = editingKey;
              await coreAxios.post(`/image-upload/${productID}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            message.success("পণ্য সফলভাবে আপডেট হয়েছে!");
            fetchInventory();
          }
        } else {
          res = await coreAxios.post("products", newInventoryItem);
          if (res?.status === 200) {
            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const productID = res.data.productId;
              await coreAxios.post(`/image-upload/${productID}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            message.success("নতুন পণ্য সফলভাবে যোগ করা হয়েছে!");
            fetchInventory();
          }
        }

        resetForm();
        setVisible(false);
        setIsEditing(false);
        setEditingKey(null);
        setFileList([]);
      } catch (error) {
        console.error("Error saving product:", error);
        const errorMessage =
          error.response?.data?.error ||
          "পণ্য যোগ/আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleEdit = (record) => {
    setEditingKey(record.productId);
    formik.setValues({
      productName: record.productName,
      category: record.category,
      description: record.description,
      qty: record.qty,
      stockQTY: record.stockQTY,
      purchaseBy: record.purchaseBy,
      createdBy: userInfo?.loginID,
      createdDate: record.createdDate || dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
    setFileList(record.imageUrl ? [{ uid: "-1", url: record.imageUrl }] : []);
    setVisible(true);
    setIsEditing(true);
  };

  const handleDelete = async (key) => {
    setLoading(true);
    try {
      const res = await coreAxios.delete(`products/${key}`);
      if (res?.status === 200) {
        message.success("পণ্য সফলভাবে মুছে ফেলা হয়েছে!");
        fetchInventory();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      const errorMessage =
        error.response?.data?.error ||
        "পণ্য মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = inventoryItems.filter(
      (item) =>
        item.productName?.toLowerCase().includes(value.toLowerCase()) ||
        item.category?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredInventory(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0)
      return { status: "out-of-stock", label: "স্টক নেই", color: "red" };
    if (quantity < 5)
      return { status: "low-stock", label: "স্টক কম", color: "orange" };
    if (quantity < 10)
      return { status: "medium-stock", label: "স্টক মধ্যম", color: "blue" };
    return { status: "in-stock", label: "স্টক আছে", color: "green" };
  };

  const refreshData = () => {
    fetchInventory();
    fetchCategories();
    message.success("ডেটা রিফ্রেশ করা হয়েছে!");
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(
      (cat) => cat.categoryCode === categoryValue
    );
    return category ? category.categoryName : categoryValue;
  };

  const columns = [
    {
      title: "ছবি",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (imageUrl) => (
        <div className="flex justify-center">
          <Image
            src={
              imageUrl
                ? `data:image/jpeg;base64,${imageUrl}`
                : "/placeholder/40/40"
            }
            alt="Product"
            width={40}
            height={40}
            style={{
              borderRadius: "8px",
              objectFit: "cover",
            }}
            fallback="/placeholder/40/40"
          />
        </div>
      ),
    },
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      sorter: (a, b) => a.productName?.localeCompare(b.productName),
    },
    {
      title: "ক্যাটাগরি",
      dataIndex: "category",
      key: "category",
      render: (category) => {
        const categoryObj = categories.find(
          (cat) => cat.categoryCode === category
        );
        return categoryObj ? (
          <Tag color="blue">{categoryObj.categoryName}</Tag>
        ) : (
          <Tag>{category}</Tag>
        );
      },
    },
    {
      title: "পরিমাণ",
      dataIndex: "qty",
      key: "qty",
      sorter: (a, b) => a.qty - b.qty,
      render: (quantity) => (
        <Space>
          <span className="font-medium">{quantity}</span>
          <Tag color={getStockStatus(quantity).color}>
            {getStockStatus(quantity).label}
          </Tag>
        </Space>
      ),
    },
    {
      title: "ক্রয় করেছেন",
      dataIndex: "purchaseBy",
      key: "purchaseBy",
    },
    {
      title: "তৈরির তারিখ",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (text) => (text ? dayjs(text).format("DD/MM/YYYY HH:mm") : "-"),
      sorter: (a, b) => new Date(a.createdDate) - new Date(b.createdDate),
    },
    ...(userInfo?.pagePermissions?.[0]?.editAccess === true
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
                    title="আপনি কি এই পণ্য ডিলিট করতে চান?"
                    description="এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না!"
                    onConfirm={() => handleDelete(record.productId)}
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

  if (userInfo?.pagePermissions?.[0]?.viewAccess !== true) {
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
              ইনভেন্টরি ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600">
              আপনার ইলেকট্রনিক্স পণ্যগুলির স্টক ব্যবস্থাপনা করুন
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
                setFileList([]);
                formik.setFieldValue("createdBy", userInfo?.loginID);
              }}
              className="bg-green-600 hover:bg-green-700 border-green-600 h-12 px-6 text-lg"
              size="large"
            >
              নতুন পণ্য যোগ করুন
            </Button>
          </Space>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="মোট পণ্য"
                value={stats.totalProducts}
                prefix={<ShoppingOutlined className="text-blue-500" />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="কম স্টক"
                value={stats.lowStock}
                prefix={
                  <ExclamationCircleOutlined className="text-orange-500" />
                }
                valueStyle={{ color: "#fa8c16" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="স্টক নেই"
                value={stats.outOfStock}
                prefix={<InboxOutlined className="text-red-500" />}
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Search and Filter Section */}
      <Card className="shadow-md border-0 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Input.Search
            placeholder="পণ্যের নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
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
            placeholder="ক্যাটাগরি দিয়ে ফিল্টার করুন"
            className="w-full lg:w-64"
            size="large"
            allowClear
            onChange={(value) => {
              if (!value) {
                setFilteredInventory(inventoryItems);
              } else {
                const filtered = inventoryItems.filter(
                  (item) => item.category === value
                );
                setFilteredInventory(filtered);
              }
              setPagination({ ...pagination, current: 1 });
            }}
          >
            {categories.map((category) => (
              <Option key={category.categoryCode} value={category.categoryCode}>
                {category.categoryName}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="স্টক স্ট্যাটাস"
            className="w-full lg:w-48"
            size="large"
            allowClear
            onChange={(value) => {
              if (!value) {
                setFilteredInventory(inventoryItems);
              } else {
                let filtered = [];
                if (value === "out-of-stock") {
                  filtered = inventoryItems.filter((item) => item.qty === 0);
                } else if (value === "low-stock") {
                  filtered = inventoryItems.filter(
                    (item) => item.qty > 0 && item.qty < 5
                  );
                } else if (value === "in-stock") {
                  filtered = inventoryItems.filter((item) => item.qty >= 5);
                }
                setFilteredInventory(filtered);
              }
              setPagination({ ...pagination, current: 1 });
            }}
          >
            <Option value="in-stock">স্টক আছে</Option>
            <Option value="low-stock">স্টক কম</Option>
            <Option value="out-of-stock">স্টক নেই</Option>
          </Select>
        </div>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg border-0" bodyStyle={{ padding: 0 }}>
        <Spin spinning={loading} size="large">
          <Table
            columns={columns}
            dataSource={filteredInventory.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )}
            rowKey="productId"
            pagination={{
              ...pagination,
              total: filteredInventory.length,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `মোট ${total}টি পণ্যের মধ্যে ${range[0]}-${range[1]}টি দেখানো হচ্ছে`,
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
            {isEditing ? "পণ্য এডিট করুন" : "নতুন পণ্য যোগ করুন"}
          </div>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          formik.resetForm();
          setIsEditing(false);
          setEditingKey(null);
          setFileList([]);
        }}
        footer={null}
        width={700}
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
                label="পণ্যের নাম"
                required
                validateStatus={formik.errors.productName ? "error" : ""}
                help={formik.errors.productName}
              >
                <Input
                  name="productName"
                  value={formik.values.productName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="পণ্যের নাম লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="ক্যাটাগরি"
                required
                validateStatus={formik.errors.category ? "error" : ""}
                help={formik.errors.category}
              >
                <Select
                  name="category"
                  value={formik.values.category}
                  onChange={(value) => formik.setFieldValue("category", value)}
                  onBlur={formik.handleBlur}
                  placeholder="ক্যাটাগরি নির্বাচন করুন"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {categories.map((category) => (
                    <Option
                      key={category.categoryCode}
                      value={category.categoryCode}
                    >
                      {category.categoryName}
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
              placeholder="পণ্যের বিস্তারিত বর্ণনা লিখুন"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item
                label="পরিমাণ"
                required
                validateStatus={formik.errors.qty ? "error" : ""}
                help={formik.errors.qty}
              >
                <InputNumber
                  name="qty"
                  value={formik.values.qty}
                  onChange={(value) => formik.setFieldValue("qty", value)}
                  onBlur={formik.handleBlur}
                  placeholder="পরিমাণ লিখুন"
                  min={0}
                  className="w-full"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="ক্রয় করেছেন">
                <Select
                  name="purchaseBy"
                  value={formik.values.purchaseBy}
                  onChange={(value) =>
                    formik.setFieldValue("purchaseBy", value)
                  }
                  onBlur={formik.handleBlur}
                  placeholder="ব্যবহারকারী নির্বাচন করুন"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {users.map((user) => (
                    <Option key={user.loginID} value={user.loginID}>
                      {user.loginID}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="পণ্যের ছবি">
            <Dragger
              name="image"
              listType="picture"
              maxCount={1}
              beforeUpload={() => false}
              onChange={({ fileList }) => {
                formik.setFieldValue("image", fileList[0]?.originFileObj);
                setFileList(fileList);
              }}
              fileList={fileList}
              className="upload-dragger"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">
                ক্লিক করুন বা ছবিটি এখানে ড্রাগ করুন
              </p>
              <p className="ant-upload-hint">PNG, JPG, JPEG ফাইল সাপোর্টেড</p>
            </Dragger>
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setVisible(false);
                  formik.resetForm();
                  setIsEditing(false);
                  setEditingKey(null);
                  setFileList([]);
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
                {isEditing ? "আপডেট করুন" : "যোগ করুন"}
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

        .upload-dragger :global(.ant-upload) {
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
