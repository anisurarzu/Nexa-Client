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
  Grid,
  Drawer,
  Badge,
  DatePicker,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  PlusOutlined,
  SearchOutlined,
  ShoppingOutlined,
  InboxOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
  FilterOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import coreAxios from "@/utils/axiosInstance";

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;
const { useBreakpoint } = Grid;

// Function to convert English numbers to Bengali
const toBengaliNumber = (number) => {
  if (number === null || number === undefined) return "";

  const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  return number.toString().replace(/\d/g, (digit) => {
    return bengaliNumbers[englishNumbers.indexOf(digit)];
  });
};

// Function to format price in Bengali
const formatPriceInBengali = (price) => {
  if (!price && price !== 0) return "০.০০";

  const formattedPrice = new Intl.NumberFormat("bn-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price || 0);

  return toBengaliNumber(formattedPrice);
};

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
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
      unitPrice: 0,
      stockQTY: 0,
      purchaseBy: "",
      purchaseDate: null,
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
          purchaseDate: values.purchaseDate
            ? dayjs(values.purchaseDate).format("YYYY-MM-DD")
            : null,
          createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        };

        let res;

        if (isEditing) {
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
      unitPrice: record.unitPrice,
      stockQTY: record.stockQTY,
      purchaseBy: record.purchaseBy,
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
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

  // Fixed pagination handler
  const handlePaginationChange = (page, pageSize) => {
    setPagination({ current: page, pageSize });
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

  // Format date in Bengali
  const formatDateInBengali = (dateString) => {
    if (!dateString) return "-";
    const date = dayjs(dateString);
    const day = toBengaliNumber(date.date());
    const month = toBengaliNumber(date.month() + 1);
    const year = toBengaliNumber(date.year());
    return `${day}/${month}/${year}`;
  };

  // Get current page data for both table and mobile view
  const getCurrentPageData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredInventory.slice(startIndex, endIndex);
  };

  // Mobile Card View for Products
  const renderMobileCard = (item) => {
    const stockStatus = getStockStatus(item.qty);
    return (
      <Card
        key={item.productId}
        className="mb-3 shadow-sm hover:shadow-md transition-shadow"
        bodyStyle={{ padding: "12px" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Image
              src={
                item.imageUrl
                  ? `data:image/jpeg;base64,${item.imageUrl}`
                  : "/placeholder/60/60"
              }
              alt="Product"
              width={60}
              height={60}
              style={{
                borderRadius: "8px",
                objectFit: "cover",
              }}
              fallback="/placeholder/60/60"
              preview={false}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-800 text-sm truncate mr-2">
                {item.productName}
              </h3>
              <Badge
                color={stockStatus.color}
                text={stockStatus.label}
                size="small"
              />
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium">ক্যাটাগরি:</span>
                <span>{getCategoryLabel(item.category)}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-medium">পরিমাণ:</span>
                <span className="font-mono">
                  {toBengaliNumber(item.qty)} পিস
                </span>
              </div>

              <div className="flex items-center gap-1">
                <DollarOutlined className="text-green-500 text-xs" />
                <span className="font-medium">মূল্য:</span>
                <span className="text-green-600 font-semibold font-mono">
                  ৳{formatPriceInBengali(item.unitPrice)}
                </span>
              </div>

              {item.purchaseDate && (
                <div className="flex items-center gap-1">
                  <CalendarOutlined className="text-blue-500 text-xs" />
                  <span className="font-medium">ক্রয়ের তারিখ:</span>
                  <span className="font-mono">
                    {formatDateInBengali(item.purchaseDate)}
                  </span>
                </div>
              )}

              {item.purchaseBy && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">ক্রয় করেছেন:</span>
                  <span>{item.purchaseBy}</span>
                </div>
              )}
            </div>

            {userInfo?.pagePermissions?.[4]?.editAccess === true && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(item)}
                  className="bg-blue-500 border-blue-500 text-xs flex-1"
                >
                  এডিট
                </Button>
                <Popconfirm
                  title="আপনি কি এই পণ্য ডিলিট করতে চান?"
                  description="এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না!"
                  onConfirm={() => handleDelete(item.productId)}
                  okText="হ্যাঁ"
                  cancelText="না"
                  okType="danger"
                  icon={<ExclamationCircleOutlined className="text-red-500" />}
                >
                  <Button
                    type="primary"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    className="text-xs flex-1"
                  >
                    ডিলিট
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const columns = [
    {
      title: "ছবি",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      responsive: ["md"],
      render: (imageUrl) => (
        <div className="flex justify-center">
          <Image
            src={
              imageUrl
                ? `data:image/jpeg;base64,${imageUrl}`
                : "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg"
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
      responsive: ["md"],
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
          <span className="font-medium font-mono">
            {toBengaliNumber(quantity)}
          </span>
          <Tag color={getStockStatus(quantity).color}>
            {getStockStatus(quantity).label}
          </Tag>
        </Space>
      ),
    },
    {
      title: "ইউনিট মূল্য",
      dataIndex: "unitPrice",
      key: "unitPrice",
      responsive: ["md"],
      sorter: (a, b) => a.unitPrice - b.unitPrice,
      render: (price) => (
        <Space>
          <DollarOutlined className="text-green-500" />
          <span className="font-medium text-green-600 font-mono">
            ৳{formatPriceInBengali(price)}
          </span>
        </Space>
      ),
    },
    {
      title: "ক্রয়ের তারিখ",
      dataIndex: "purchaseDate",
      key: "purchaseDate",
      responsive: ["lg"],
      render: (date) => (
        <Space>
          <CalendarOutlined className="text-blue-500" />
          <span className="font-mono">{formatDateInBengali(date)}</span>
        </Space>
      ),
      sorter: (a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate),
    },
    {
      title: "ক্রয় করেছেন",
      dataIndex: "purchaseBy",
      key: "purchaseBy",
      responsive: ["lg"],
    },
    {
      title: "তৈরির তারিখ",
      dataIndex: "createdDate",
      key: "createdDate",
      responsive: ["lg"],
      render: (text) => (
        <span className="font-mono">
          {text ? formatDateInBengali(text) : "-"}
        </span>
      ),
      sorter: (a, b) => new Date(a.createdDate) - new Date(b.createdDate),
    },
    ...(userInfo?.pagePermissions?.[4]?.editAccess === true
      ? [
          {
            title: "কর্ম",
            key: "actions",
            width: 120,
            responsive: ["md"],
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

  // Update statistics to show Bengali numbers
  const bengaliStats = {
    totalProducts: toBengaliNumber(stats.totalProducts),
    lowStock: toBengaliNumber(stats.lowStock),
    outOfStock: toBengaliNumber(stats.outOfStock),
  };

  if (userInfo?.pagePermissions?.[4]?.viewAccess !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="text-center shadow-lg border-0 w-full max-w-md">
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
    <div className="min-h-screen bg-gray-50 p-3 lg:p-6">
      {/* Header Section */}
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-3xl font-bold text-gray-800 mb-1 lg:mb-2 truncate">
              ইনভেন্টরি ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">
              আপনার ইলেকট্রনিক্স পণ্যগুলির স্টক ব্যবস্থাপনা করুন
            </p>
          </div>

          <Space size="small" className="w-full lg:w-auto">
            {isMobile && (
              <div className="flex gap-2 w-full">
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerVisible(true)}
                  size="large"
                  className="flex-1 border-blue-500 text-blue-500"
                >
                  ফিল্টার
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshData}
                  size="large"
                  className="flex-1 border-green-500 text-green-500"
                >
                  রিফ্রেশ
                </Button>
              </div>
            )}
            {!isMobile && (
              <>
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
                  className="bg-green-600 hover:bg-green-700 border-green-600 h-12 px-4 lg:px-6 text-base lg:text-lg"
                  size="large"
                >
                  {isMobile ? "যোগ করুন" : "নতুন পণ্য যোগ করুন"}
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* Mobile Add Button */}
        {isMobile && (
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
            className="w-full bg-green-600 hover:bg-green-700 border-green-600 h-12 mb-4"
            size="large"
          >
            নতুন পণ্য যোগ করুন
          </Button>
        )}

        {/* Statistics Cards */}
        <Row gutter={[12, 12]} className="mb-4 lg:mb-6">
          <Col xs={8} sm={8} md={8}>
            <Card className="text-center shadow-sm border-0 hover:shadow-md transition-shadow h-full">
              <Statistic
                title={<span className="text-xs lg:text-sm">মোট পণ্য</span>}
                value={bengaliStats.totalProducts}
                prefix={
                  <ShoppingOutlined className="text-blue-500 text-sm lg:text-base" />
                }
                valueStyle={{
                  color: "#1890ff",
                  fontSize: screens.xs ? "16px" : "20px",
                  fontFamily: "'Noto Sans Bengali', 'Arial', sans-serif",
                }}
              />
            </Card>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <Card className="text-center shadow-sm border-0 hover:shadow-md transition-shadow h-full">
              <Statistic
                title={<span className="text-xs lg:text-sm">কম স্টক</span>}
                value={bengaliStats.lowStock}
                prefix={
                  <ExclamationCircleOutlined className="text-orange-500 text-sm lg:text-base" />
                }
                valueStyle={{
                  color: "#fa8c16",
                  fontSize: screens.xs ? "16px" : "20px",
                  fontFamily: "'Noto Sans Bengali', 'Arial', sans-serif",
                }}
              />
            </Card>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <Card className="text-center shadow-sm border-0 hover:shadow-md transition-shadow h-full">
              <Statistic
                title={<span className="text-xs lg:text-sm">স্টক নেই</span>}
                value={bengaliStats.outOfStock}
                prefix={
                  <InboxOutlined className="text-red-500 text-sm lg:text-base" />
                }
                valueStyle={{
                  color: "#f5222d",
                  fontSize: screens.xs ? "16px" : "20px",
                  fontFamily: "'Noto Sans Bengali', 'Arial', sans-serif",
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Search and Filter Section - Desktop */}
      {!isMobile && (
        <Card className="shadow-md border-0 mb-4 lg:mb-6">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <Input.Search
              placeholder="পণ্যের নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full lg:w-80"
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
              className="w-full lg:w-56"
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
                <Option
                  key={category.categoryCode}
                  value={category.categoryCode}
                >
                  {category.categoryName}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="স্টক স্ট্যাটাস"
              className="w-full lg:w-40"
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
      )}

      {/* Mobile Search Bar */}
      {isMobile && (
        <Card className="shadow-sm border-0 mb-4">
          <div className="space-y-3">
            <Input.Search
              placeholder="পণ্য খুঁজুন..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
              size="large"
              allowClear
              enterButton={
                <Button
                  type="primary"
                  className="bg-blue-500 border-blue-500"
                  icon={<SearchOutlined />}
                />
              }
            />
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Card
        className="shadow-lg border-0"
        bodyStyle={{ padding: isMobile ? "12px" : "16px" }}
      >
        <Spin spinning={loading} size="large">
          {isMobile ? (
            <div className="space-y-3">
              {getCurrentPageData().map(renderMobileCard)}

              <div className="flex justify-center mt-4">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={filteredInventory.length}
                  onChange={handlePaginationChange}
                  showSizeChanger={false}
                  simple
                  size="small"
                  showTotal={(total, range) =>
                    `মোট ${toBengaliNumber(
                      total
                    )}টি পণ্যের মধ্যে ${toBengaliNumber(
                      range[0]
                    )}-${toBengaliNumber(range[1])}টি দেখানো হচ্ছে`
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={getCurrentPageData()}
                rowKey="productId"
                pagination={false}
                scroll={{ x: 800 }}
                className="custom-table mb-4"
              />
              <div className="flex justify-end">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={filteredInventory.length}
                  onChange={handlePaginationChange}
                  showSizeChanger
                  showQuickJumper
                  pageSizeOptions={["10", "20", "50", "100"]}
                  showTotal={(total, range) =>
                    `মোট ${toBengaliNumber(
                      total
                    )}টি পণ্যের মধ্যে ${toBengaliNumber(
                      range[0]
                    )}-${toBengaliNumber(range[1])}টি দেখানো হচ্ছে`
                  }
                />
              </div>
            </>
          )}
        </Spin>
      </Card>

      {/* Filter Drawer for Mobile */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">ফিল্টার করুন</span>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setFilterDrawerVisible(false)}
            />
          </div>
        }
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={300}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ক্যাটাগরি
            </label>
            <Select
              placeholder="ক্যাটাগরি নির্বাচন করুন"
              className="w-full"
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
                setFilterDrawerVisible(false);
              }}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              স্টক স্ট্যাটাস
            </label>
            <Select
              placeholder="স্ট্যাটাস নির্বাচন করুন"
              className="w-full"
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
                setFilterDrawerVisible(false);
              }}
            >
              <Option value="in-stock">স্টক আছে</Option>
              <Option value="low-stock">স্টক কম</Option>
              <Option value="out-of-stock">স্টক নেই</Option>
            </Select>
          </div>

          <Button
            type="default"
            className="w-full mt-4"
            onClick={() => {
              setFilteredInventory(inventoryItems);
              setFilterDrawerVisible(false);
            }}
          >
            ফিল্টার রিসেট করুন
          </Button>
        </div>
      </Drawer>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="text-lg lg:text-xl font-bold">
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
        width={isMobile ? "100%" : 700}
        style={{ maxWidth: "100vw", margin: isMobile ? 0 : "5vh auto" }}
        centered={!isMobile}
        className="modern-modal"
        bodyStyle={{
          maxHeight: isMobile ? "calc(100vh - 200px)" : "none",
          overflowY: "auto",
        }}
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
            <Col xs={24} lg={8}>
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
            <Col xs={24} lg={8}>
              <Form.Item
                label="ইউনিট মূল্য"
                required
                validateStatus={formik.errors.unitPrice ? "error" : ""}
                help={formik.errors.unitPrice}
              >
                <InputNumber
                  name="unitPrice"
                  value={formik.values.unitPrice}
                  onChange={(value) => formik.setFieldValue("unitPrice", value)}
                  onBlur={formik.handleBlur}
                  placeholder="ইউনিট মূল্য লিখুন"
                  min={0}
                  step={0.01}
                  precision={2}
                  className="w-full"
                  size="large"
                  addonBefore={<DollarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={8}>
              <Form.Item
                label="ক্রয়ের তারিখ"
                validateStatus={formik.errors.purchaseDate ? "error" : ""}
                help={formik.errors.purchaseDate}
              >
                <DatePicker
                  name="purchaseDate"
                  value={formik.values.purchaseDate}
                  onChange={(date) =>
                    formik.setFieldValue("purchaseDate", date)
                  }
                  onBlur={formik.handleBlur}
                  placeholder="তারিখ নির্বাচন করুন"
                  className="w-full"
                  size="large"
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
                className="px-4 lg:px-6"
                disabled={loading}
              >
                বাতিল করুন
              </Button>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                size="large"
                className="bg-green-600 hover:bg-green-700 border-green-600 px-4 lg:px-6"
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
          padding: 16px;
        }

        @media (max-width: 768px) {
          .modern-modal :global(.ant-modal) {
            margin: 0;
            max-width: 100vw;
            top: 0;
            padding-bottom: 0;
          }

          .modern-modal :global(.ant-modal-content) {
            height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
