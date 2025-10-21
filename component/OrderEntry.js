import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Alert,
  Typography,
  message,
  Descriptions,
  Tag,
  Row,
  Col,
  Select,
  Form,
  Table,
  Space,
  InputNumber,
  Modal,
  Tooltip,
  Statistic,
  Spin,
  Divider,
} from "antd";
import {
  QrcodeOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  BarChartOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { Html5Qrcode } from "html5-qrcode";
import coreAxios from "@/utils/axiosInstance";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

// Dynamically import Google Fonts
const loadFonts = () => {
  if (typeof document !== "undefined") {
    const link1 = document.createElement("link");
    link1.href =
      "https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap";
    link1.rel = "stylesheet";

    const link2 = document.createElement("link");
    link2.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap";
    link2.rel = "stylesheet";

    document.head.appendChild(link1);
    document.head.appendChild(link2);
  }
};

const OrderEntry = () => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);

  // Modal states
  const [addOrderModalVisible, setAddOrderModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [viewOrderModalVisible, setViewOrderModalVisible] = useState(false);
  const [editOrderModalVisible, setEditOrderModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const scannerRef = useRef(null);
  const scannerId = "order-qr-reader";
  const [addOrderForm] = Form.useForm();
  const [scanForm] = Form.useForm();
  const [editOrderForm] = Form.useForm();

  // Customer form fields
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Fetch initial data
  useEffect(() => {
    loadFonts();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchOrders(),
        fetchFinancialSummary(),
      ]);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      message.error("ডেটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await coreAxios.get("/categories");
      setCategories(response.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      message.error("ক্যাটাগরি লোড করতে সমস্যা হয়েছে");
    }
  };

  const fetchProductsByCategory = async (categoryCode) => {
    try {
      const response = await coreAxios.get(
        `/products/category/${categoryCode}`
      );
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      message.error("পণ্য লোড করতে সমস্যা হয়েছে");
    }
  };

  // Fetch all orders
  const fetchOrders = async () => {
    try {
      const response = await coreAxios.get("/productOrders");
      if (response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      message.error("অর্ডার লোড করতে সমস্যা হয়েছে");
    }
  };

  // Fetch financial summary
  const fetchFinancialSummary = async () => {
    try {
      const response = await coreAxios.get("/productOrders/summary/financial");
      if (response.data.success) {
        setFinancialSummary(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching financial summary:", error);
    }
  };

  // FIXED: QR Scanner Logic with Back Camera Priority
  useEffect(() => {
    if (!scanning) return;

    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          // FIX: Prioritize back camera for mobile devices
          let backCamera = cameras.find(
            (camera) =>
              camera.label.toLowerCase().includes("back") ||
              camera.label.toLowerCase().includes("rear")
          );

          // If no back camera found, look for environment-facing camera
          if (!backCamera) {
            backCamera = cameras.find((camera) =>
              camera.label.toLowerCase().includes("environment")
            );
          }

          // If still no back camera, use the last camera (usually back camera on mobile)
          const cameraId = backCamera
            ? backCamera.id
            : cameras[cameras.length - 1].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {
              // Ignore scan errors
            }
          );
        } else {
          setCameraError(true);
          message.error("কোন ক্যামেরা পাওয়া যায়নি");
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError(true);
        message.error("ক্যামেরা অ্যাক্সেস করতে ব্যর্থ হয়েছে");
      }
    };

    const handleScanSuccess = async (decodedText) => {
      try {
        await scannerRef.current.stop();
        setScanning(false);
        await fetchProductDetails(decodedText);
      } catch (err) {
        console.error("Error handling scan:", err);
        message.error("পণ্য স্ক্যান করতে ব্যর্থ হয়েছে");
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  const parseQRCode = (qrData) => {
    try {
      const productData = JSON.parse(qrData);
      return productData.productId || productData.id || productData.product_id;
    } catch (e) {
      const parsedId = parseInt(qrData);
      return isNaN(parsedId) ? null : parsedId;
    }
  };

  const fetchProductDetails = async (productId) => {
    setLoading(true);
    try {
      const response = await coreAxios.get(`/products/${productId}`);
      if (response.data.success) {
        const productData = response.data.product;

        scanForm.setFieldsValue({
          productId: productData.productId,
          productName: productData.productName,
          category: productData.category,
          unitPrice: productData.unitPrice,
          salePrice: productData.unitPrice,
          quantity: 1,
          availableQuantity: productData.quantity || 100, // Default to 100 if not available
        });

        message.success("পণ্য সফলভাবে স্ক্যান করা হয়েছে!");
      } else {
        message.error("পণ্য পাওয়া যায়নি!");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      message.error("পণ্যের তথ্য পাওয়া যায়নি");
    } finally {
      setLoading(false);
    }
  };

  const startQRScanner = () => {
    setScanModalVisible(true);
    setScanning(true);
    setCameraError(false);
  };

  const handleAddOrder = async (values) => {
    console.log("Add Order Values:", values);

    // Validate required fields
    if (!values.productName || !values.productId) {
      message.error("পণ্যের নাম এবং আইডি প্রয়োজন!");
      return;
    }

    const total = values.salePrice * values.quantity;

    // Create order immediately when adding product
    const orderData = {
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      total: total,
      customerName: values.customerName || "Walk-in Customer",
      customerPhone: values.customerPhone || "N/A",
      customerAddress: values.customerAddress || "N/A",
      totalAmount: total,
      grandTotal: total,
      paymentMethod: "Cash",
      createdBy: "user",
      status: "Pending", // Default status
    };

    console.log("Order Data to be sent:", orderData);

    setOrderSubmitting(true);
    try {
      const response = await coreAxios.post("/productOrders", orderData);

      if (response.data.success) {
        message.success({
          content: (
            <div>
              <CheckCircleOutlined
                style={{ color: "#52c41a", marginRight: 8 }}
              />
              অর্ডার সফলভাবে তৈরি হয়েছে!
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                অর্ডার নম্বর: {response.data.data.orderNo}
              </Text>
            </div>
          ),
          duration: 5,
        });

        // Reset and refresh data
        setCustomerInfo({ name: "", phone: "", address: "" });
        addOrderForm.resetFields();
        setAddOrderModalVisible(false);
        fetchOrders();
        fetchFinancialSummary();
      } else {
        message.error(
          response.data.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে!"
        );
      }
    } catch (error) {
      console.error("Error creating order:", error);
      message.error(
        error.response?.data?.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে!"
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleScanOrder = async (values) => {
    console.log("Scanned Order Values:", values);

    // Validate required fields
    if (!values.productName || !values.productId) {
      message.error("পণ্যের নাম এবং আইডি প্রয়োজন!");
      return;
    }

    const total = values.salePrice * values.quantity;

    // Create order immediately when scanning product
    const orderData = {
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      total: total,
      customerName: values.customerName || "Walk-in Customer",
      customerPhone: values.customerPhone || "N/A",
      customerAddress: values.customerAddress || "N/A",

      totalAmount: total,
      grandTotal: total,
      paymentMethod: "Cash",
      createdBy: "user",
      status: "Pending", // Default status
    };

    console.log("Order Data to be sent:", orderData);

    setOrderSubmitting(true);
    try {
      const response = await coreAxios.post("/productOrders", orderData);

      if (response.data.success) {
        message.success({
          content: (
            <div>
              <CheckCircleOutlined
                style={{ color: "#52c41a", marginRight: 8 }}
              />
              অর্ডার সফলভাবে তৈরি হয়েছে!
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                অর্ডার নম্বর: {response.data.data.orderNo}
              </Text>
            </div>
          ),
          duration: 5,
        });

        // Reset and refresh data
        scanForm.resetFields();
        setScanModalVisible(false);
        setScanning(false);
        fetchOrders();
        fetchFinancialSummary();
      } else {
        message.error(
          response.data.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে!"
        );
      }
    } catch (error) {
      console.error("Error creating order:", error);
      message.error(
        error.response?.data?.message || "অর্ডার তৈরি করতে সমস্যা হয়েছে!"
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleProductSelect = (productId) => {
    const selectedProduct = products.find(
      (product) => product.productId === productId
    );
    if (selectedProduct) {
      addOrderForm.setFieldsValue({
        productName: selectedProduct.productName,
        category: selectedProduct.category,
        unitPrice: selectedProduct.unitPrice,
        salePrice: selectedProduct.unitPrice,
        quantity: 1, // Set default quantity to 1
        availableQuantity: selectedProduct.quantity || 100, // Set available quantity
      });
    }
  };

  // Quantity validator to ensure it doesn't exceed available quantity
  const validateQuantity = (_, value) => {
    const availableQuantity =
      addOrderForm.getFieldValue("availableQuantity") ||
      scanForm.getFieldValue("availableQuantity") ||
      100;

    if (value && value > availableQuantity) {
      return Promise.reject(
        new Error(`পরিমাণ ${availableQuantity} এর বেশি হতে পারবে না`)
      );
    }
    if (value && value < 1) {
      return Promise.reject(new Error("পরিমাণ ১ এর কম হতে পারবে না"));
    }
    return Promise.resolve();
  };

  // View Order Details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setViewOrderModalVisible(true);
  };

  // Update Order Status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await coreAxios.put(`/productOrders/${orderId}`, {
        status: newStatus,
      });
      if (response.data.success) {
        message.success("অর্ডার স্ট্যাটাস সফলভাবে আপডেট হয়েছে!");
        fetchOrders();
        fetchFinancialSummary();
      } else {
        message.error("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে!");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      message.error("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে!");
    }
  };

  // Edit Order
  const editOrder = (order) => {
    setSelectedOrder(order);
    editOrderForm.setFieldsValue({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      status: order.status,
    });
    setEditOrderModalVisible(true);
  };

  // Update Order
  const updateOrder = async (values) => {
    try {
      const response = await coreAxios.put(
        `/productOrders/${selectedOrder._id}`,
        values
      );
      if (response.data.success) {
        message.success("অর্ডার সফলভাবে আপডেট হয়েছে!");
        setEditOrderModalVisible(false);
        fetchOrders();
        fetchFinancialSummary();
      } else {
        message.error("অর্ডার আপডেট করতে সমস্যা হয়েছে!");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      message.error("অর্ডার আপডেট করতে সমস্যা হয়েছে!");
    }
  };

  // Delete Order
  const deleteOrder = async (orderId) => {
    Modal.confirm({
      title: "আপনি কি এই অর্ডার ডিলিট করতে চান?",
      content: "এই কাজটি undo করা যাবে না।",
      okText: "হ্যাঁ, ডিলিট করুন",
      cancelText: "বাতিল",
      okType: "danger",
      onOk: async () => {
        try {
          const response = await coreAxios.delete(`/productOrders/${orderId}`);
          if (response.data.success) {
            message.success("অর্ডার সফলভাবে ডিলিট হয়েছে!");
            fetchOrders();
            fetchFinancialSummary();
          }
        } catch (error) {
          console.error("Error deleting order:", error);
          message.error("অর্ডার ডিলিট করতে সমস্যা হয়েছে!");
        }
      },
    });
  };

  // Status update handler
  const handleStatusChange = (orderId, currentStatus) => {
    let newStatus;
    switch (currentStatus) {
      case "Pending":
        newStatus = "Processing";
        break;
      case "Processing":
        newStatus = "Completed";
        break;
      case "Completed":
        newStatus = "Pending";
        break;
      default:
        newStatus = "Pending";
    }
    updateOrderStatus(orderId, newStatus);
  };

  // Order Table Columns
  const orderColumns = [
    {
      title: "অর্ডার নম্বর",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (text) => <Text strong>#{text}</Text>,
    },
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      render: (text) => <Text strong>#{text}</Text>,
    },

    {
      title: "গ্রাহক",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "ফোন",
      dataIndex: "customerPhone",
      key: "customerPhone",
    },
    {
      title: "মোট",
      dataIndex: "grandTotal",
      key: "grandTotal",
      render: (amount) => <Text strong>৳{amount}</Text>,
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      key: "status",
      render: (status, record) => (
        <Tooltip title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন">
          <Tag
            color={
              status === "Completed"
                ? "green"
                : status === "Processing"
                ? "blue"
                : status === "Cancelled"
                ? "red"
                : "orange"
            }
            className="cursor-pointer"
            onClick={() => handleStatusChange(record._id, status)}
          >
            {status}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "তারিখ",
      dataIndex: "orderDate",
      key: "orderDate",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "কর্ম",
      key: "action",
      render: (_, record) => (
        <Space>
          <Tooltip title="বিস্তারিত">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => viewOrderDetails(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="এডিট">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => editOrder(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="ডিলিট">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteOrder(record._id)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  //

  return (
    <div className="">
      <div className=" ">
        {/* Financial Summary Dashboard */}

        <Card>
          <Row gutter={16} className="">
            <Col xs={24} sm={12} md={8} className="mb-3">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setAddOrderModalVisible(true)}
                className="w-full h-12 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #6ECB63 0%, #5B8FF9 100%)",
                  border: "none",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                }}
              >
                নতুন অর্ডার
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} className="mb-3">
              <Button
                icon={<QrcodeOutlined />}
                size="large"
                onClick={startQRScanner}
                className="w-full h-12 rounded-lg border-0"
                style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                }}
              >
                QR স্ক্যান করুন
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Main Order Card */}

        {/* All Orders Table */}
        <Card
          className="rounded-xl border-0"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            boxShadow: "0 8px 32px rgba(31, 38, 135, 0.1)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="mb-2">
            <Title
              level={4}
              className="m-0"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              সকল অর্ডার
            </Title>
            <Button
              onClick={fetchOrders}
              icon={<ReloadOutlined />}
              loading={loading}
              className="rounded-lg mb-2"
            >
              রিফ্রেশ
            </Button>
          </div>
          <Table
            columns={orderColumns}
            dataSource={orders}
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{ pageSize: 10 }}
            size="middle"
            className="rounded-lg"
            rowKey="_id"
          />
        </Card>

        {/* Rest of your modals remain the same */}
        {/* Add Order Modal */}
        <Modal
          title="নতুন অর্ডার যোগ করুন"
          open={addOrderModalVisible}
          onCancel={() => setAddOrderModalVisible(false)}
          footer={null}
          width={700}
          className="rounded-lg"
        >
          <Form
            form={addOrderForm}
            onFinish={handleAddOrder}
            layout="vertical"
            className="mt-4"
            initialValues={{
              quantity: 1, // Set default quantity to 1
            }}
          >
            {/* Customer Information in Modal - Not Required */}
            <Card title="গ্রাহকের তথ্য (ঐচ্ছিক)" size="small" className="mb-4">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="customerName" label="গ্রাহকের নাম">
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="গ্রাহকের নাম"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="customerPhone" label="ফোন নম্বর">
                    <Input prefix={<PhoneOutlined />} placeholder="ফোন নম্বর" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="customerAddress" label="ঠিকানা">
                    <Input prefix={<HomeOutlined />} placeholder="ঠিকানা" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="পণ্যের তথ্য" size="small">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="category"
                    label="ক্যাটাগরি"
                    rules={[
                      { required: true, message: "ক্যাটাগরি নির্বাচন করুন" },
                    ]}
                  >
                    <Select
                      placeholder="ক্যাটাগরি নির্বাচন করুন"
                      onChange={fetchProductsByCategory}
                      size="large"
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
                <Col xs={24} md={12}>
                  <Form.Item
                    name="productId"
                    label="পণ্য"
                    rules={[{ required: true, message: "পণ্য নির্বাচন করুন" }]}
                  >
                    <Select
                      placeholder="পণ্য নির্বাচন করুন"
                      size="large"
                      showSearch
                      onChange={handleProductSelect}
                      filterOption={(input, option) =>
                        option.children
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {products.map((product) => (
                        <Option
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.productName} - ৳{product.unitPrice}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="productName" label="পণ্যের নাম" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item name="unitPrice" label="ইউনিট প্রাইস">
                    <InputNumber
                      className="w-full"
                      min={1}
                      formatter={(value) => `৳ ${value}`}
                      parser={(value) => value.replace(/৳\s?/g, "")}
                      size="large"
                      readOnly
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="salePrice"
                    label="সেল প্রাইস"
                    rules={[{ required: true, message: "সেল প্রাইস লিখুন" }]}
                  >
                    <InputNumber
                      className="w-full"
                      min={1}
                      formatter={(value) => `৳ ${value}`}
                      parser={(value) => value.replace(/৳\s?/g, "")}
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="quantity"
                    label="পরিমাণ"
                    rules={[
                      { required: true, message: "পরিমাণ লিখুন" },
                      { validator: validateQuantity },
                    ]}
                  >
                    <InputNumber
                      className="w-full"
                      min={1}
                      defaultValue={1}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="availableQuantity" hidden>
                <Input />
              </Form.Item>
            </Card>

            <div className="text-right pt-4 border-t">
              <Button
                onClick={() => setAddOrderModalVisible(false)}
                className="mr-2 rounded-lg"
                size="large"
              >
                বাতিল
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<PlusOutlined />}
                className="rounded-lg"
                loading={orderSubmitting}
              >
                {orderSubmitting ? "প্রসেসিং..." : "অর্ডার তৈরি করুন"}
              </Button>
            </div>
          </Form>
        </Modal>

        {/* View Order Modal */}
        <Modal
          title="অর্ডার বিস্তারিত"
          open={viewOrderModalVisible}
          onCancel={() => setViewOrderModalVisible(false)}
          footer={null}
          width={700}
          className="rounded-lg"
        >
          {selectedOrder && (
            <div>
              <Descriptions bordered column={2} className="mb-4">
                <Descriptions.Item label="অর্ডার নম্বর" span={2}>
                  <Text strong>#{selectedOrder.orderNo}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="গ্রাহকের নাম">
                  {selectedOrder.customerName}
                </Descriptions.Item>
                <Descriptions.Item label="ফোন নম্বর">
                  {selectedOrder.customerPhone}
                </Descriptions.Item>
                <Descriptions.Item label="ঠিকানা">
                  {selectedOrder.customerAddress}
                </Descriptions.Item>
                <Descriptions.Item label="স্ট্যাটাস">
                  <Tag
                    color={
                      selectedOrder.status === "Completed"
                        ? "green"
                        : selectedOrder.status === "Processing"
                        ? "blue"
                        : selectedOrder.status === "Cancelled"
                        ? "red"
                        : "orange"
                    }
                  >
                    {selectedOrder.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="মোট Amount">
                  <Text strong>৳{selectedOrder.grandTotal}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="পেমেন্ট মেথড">
                  {selectedOrder.paymentMethod}
                </Descriptions.Item>
                <Descriptions.Item label="অর্ডার তারিখ">
                  {dayjs(selectedOrder.orderDate).format("DD/MM/YYYY HH:mm")}
                </Descriptions.Item>
              </Descriptions>

              <Title level={5}>অর্ডার আইটেম</Title>
              <Table
                columns={[
                  {
                    title: "পণ্যের নাম",
                    dataIndex: "productName",
                    key: "productName",
                  },
                  { title: "পরিমাণ", dataIndex: "quantity", key: "quantity" },
                  {
                    title: "দাম",
                    dataIndex: "salePrice",
                    key: "salePrice",
                    render: (price) => `৳${price}`,
                  },
                  {
                    title: "মোট",
                    dataIndex: "total",
                    key: "total",
                    render: (total) => `৳${total}`,
                  },
                ]}
                dataSource={selectedOrder.items}
                pagination={false}
                size="small"
                rowKey="productId"
              />
            </div>
          )}
        </Modal>

        {/* Edit Order Modal */}
        <Modal
          title="অর্ডার এডিট করুন"
          open={editOrderModalVisible}
          onCancel={() => setEditOrderModalVisible(false)}
          footer={null}
          width={500}
          className="rounded-lg"
        >
          <Form
            form={editOrderForm}
            onFinish={updateOrder}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item name="customerName" label="গ্রাহকের নাম">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="customerPhone" label="ফোন নম্বর">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="customerAddress" label="ঠিকানা">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="status" label="স্ট্যাটাস">
              <Select size="large">
                <Option value="Pending">Pending</Option>
                <Option value="Processing">Processing</Option>
                <Option value="Completed">Completed</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
            <div className="text-right pt-4 border-t">
              <Button
                onClick={() => setEditOrderModalVisible(false)}
                className="mr-2 rounded-lg"
                size="large"
              >
                বাতিল
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="rounded-lg"
              >
                আপডেট করুন
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Scan Modal */}
        <Modal
          title="QR কোড স্ক্যান করুন"
          open={scanModalVisible}
          onCancel={() => {
            setScanModalVisible(false);
            setScanning(false);
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().catch(() => {});
            }
          }}
          footer={null}
          width={600}
          className="rounded-lg"
        >
          <div className="mb-4">
            {scanning && (
              <div className="mb-4">
                {cameraError ? (
                  <Alert
                    message="ক্যামেরা অ্যাক্সেস ব্যর্থ হয়েছে"
                    description="আপনার ব্রাউজারে ক্যামেরা অনুমতি প্রদান করুন"
                    type="error"
                    showIcon
                  />
                ) : (
                  <div className="w-full h-[300px] border-2 border-dashed border-blue-300 rounded-lg bg-gray-50 flex items-center justify-center">
                    <div id={scannerId} className="w-full h-full" />
                  </div>
                )}
                <div className="text-center mt-4">
                  <Text className="text-gray-600">
                    QR কোড স্ক্যান করার জন্য ক্যামেরার দিকে ধরুন
                  </Text>
                </div>
              </div>
            )}

            <Form
              form={scanForm}
              onFinish={handleScanOrder}
              layout="vertical"
              initialValues={{
                quantity: 1, // Set default quantity to 1
              }}
            >
              {/* Customer Information in Scan Modal - Not Required */}
              <Card
                title="গ্রাহকের তথ্য (ঐচ্ছিক)"
                size="small"
                className="mb-4"
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="customerName" label="গ্রাহকের নাম">
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="গ্রাহকের নাম"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="customerPhone" label="ফোন নম্বর">
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder="ফোন নম্বর"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="customerAddress" label="ঠিকানা">
                      <Input prefix={<HomeOutlined />} placeholder="ঠিকানা" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card title="স্ক্যান করা পণ্য" size="small">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="productName" label="পণ্যের নাম">
                      <Input size="large" readOnly />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="category" label="ক্যাটাগরি">
                      <Input size="large" readOnly />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="productId" label="পণ্য আইডি" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item name="unitPrice" label="ইউনিট প্রাইস">
                      <InputNumber
                        className="w-full"
                        formatter={(value) => `৳ ${value}`}
                        parser={(value) => value.replace(/৳\s?/g, "")}
                        size="large"
                        readOnly
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="salePrice"
                      label="সেল প্রাইস"
                      rules={[{ required: true, message: "সেল প্রাইস লিখুন" }]}
                    >
                      <InputNumber
                        className="w-full"
                        min={1}
                        formatter={(value) => `৳ ${value}`}
                        parser={(value) => value.replace(/৳\s?/g, "")}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="quantity"
                      label="পরিমাণ"
                      rules={[
                        { required: true, message: "পরিমাণ লিখুন" },
                        { validator: validateQuantity },
                      ]}
                    >
                      <InputNumber
                        className="w-full"
                        min={1}
                        defaultValue={1}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="availableQuantity" hidden>
                  <Input />
                </Form.Item>
              </Card>

              <div className="text-right pt-4 border-t">
                <Button
                  onClick={() => {
                    setScanModalVisible(false);
                    setScanning(false);
                  }}
                  className="mr-2 rounded-lg"
                  size="large"
                >
                  বাতিল
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  className="rounded-lg"
                  loading={orderSubmitting}
                >
                  {orderSubmitting ? "প্রসেসিং..." : "অর্ডার তৈরি করুন"}
                </Button>
              </div>
            </Form>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default OrderEntry;
