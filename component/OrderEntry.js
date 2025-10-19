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
} from "@ant-design/icons";
import { Html5Qrcode } from "html5-qrcode";
import coreAxios from "@/utils/axiosInstance";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

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
      const response = await coreAxios.get("/orders");
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
      const response = await coreAxios.get("/getFinancialSummary");
      if (response.data.success) {
        setFinancialSummary(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching financial summary:", error);
    }
  };

  // QR Scanner Logic
  useEffect(() => {
    if (!scanning) return;

    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          const cameraId = cameras[0].id;

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
      // const parsedProductId = parseQRCode(productId);
      // if (!parsedProductId) {
      //   message.error("অবৈধ QR কোড");
      //   return;
      // }

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

  const handleAddOrder = (values) => {
    const total = values.salePrice * values.quantity;
    const newItem = {
      key: Date.now(),
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      total: total,
    };

    setOrderItems([...orderItems, newItem]);
    addOrderForm.resetFields();
    setAddOrderModalVisible(false);
    message.success("পণ্য অর্ডারে যোগ করা হয়েছে!");
  };

  const handleScanOrder = (values) => {
    const total = values.salePrice * values.quantity;
    const newItem = {
      key: Date.now(),
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      total: total,
    };

    setOrderItems([...orderItems, newItem]);
    scanForm.resetFields();
    setScanModalVisible(false);
    setScanning(false);
    message.success("স্ক্যান করা পণ্য অর্ডারে যোগ করা হয়েছে!");
  };

  const removeOrderItem = (key) => {
    setOrderItems(orderItems.filter((item) => item.key !== key));
    message.success("পণ্য অর্ডার থেকে সরানো হয়েছে!");
  };

  const updateOrderItem = (key, field, value) => {
    const updatedItems = orderItems.map((item) => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };

        // Recalculate total if quantity or sale price changes
        if (field === "quantity" || field === "salePrice") {
          updatedItem.total = updatedItem.salePrice * updatedItem.quantity;
        }

        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const submitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      message.error("গ্রাহকের সকল তথ্য প্রয়োজন!");
      return;
    }

    if (orderItems.length === 0) {
      message.error("অর্ডারে কমপক্ষে একটি পণ্য যোগ করুন!");
      return;
    }

    setOrderSubmitting(true);
    try {
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address,
        items: orderItems,
        totalAmount: totalAmount,
        grandTotal: totalAmount,
        paymentMethod: "Cash",
        orderDate: new Date().toISOString(),
        createdBy: "user",
      };

      const response = await coreAxios.post("/orders", orderData);

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
        setOrderItems([]);
        addOrderForm.resetFields();
        scanForm.resetFields();
        fetchOrders();
        fetchFinancialSummary();
      } else {
        message.error("অর্ডার তৈরি করতে সমস্যা হয়েছে!");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      message.error("অর্ডার তৈরি করতে সমস্যা হয়েছে!");
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
      });
    }
  };

  // View Order Details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setViewOrderModalVisible(true);
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
        `/orders/${selectedOrder._id}`,
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
          const response = await coreAxios.delete(`/orders/${orderId}`);
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

  // Order Items Columns
  const columns = [
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "দাম",
      dataIndex: "salePrice",
      key: "salePrice",
      render: (price, record) => (
        <InputNumber
          min={1}
          value={price}
          onChange={(value) => updateOrderItem(record.key, "salePrice", value)}
          formatter={(value) => `৳ ${value}`}
          parser={(value) => value.replace(/৳\s?/g, "")}
          size="small"
          style={{ width: "100px" }}
        />
      ),
    },
    {
      title: "পরিমাণ",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity, record) => (
        <InputNumber
          min={1}
          max={1000}
          value={quantity}
          onChange={(value) => updateOrderItem(record.key, "quantity", value)}
          size="small"
          style={{ width: "80px" }}
        />
      ),
    },
    {
      title: "মোট",
      dataIndex: "total",
      key: "total",
      render: (total) => <Text strong>৳{total}</Text>,
    },
    {
      title: "কর্ম",
      key: "action",
      render: (_, record) => (
        <Tooltip title="মুছুন">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeOrderItem(record.key)}
            size="small"
          />
        </Tooltip>
      ),
    },
  ];

  // Order Table Columns
  const orderColumns = [
    {
      title: "অর্ডার নম্বর",
      dataIndex: "orderNo",
      key: "orderNo",
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
      render: (status) => {
        const color =
          status === "Completed"
            ? "green"
            : status === "Pending"
            ? "orange"
            : "red";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "তারিখ",
      dataIndex: "orderDate",
      key: "orderDate",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
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

  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 text-center">
          <Title level={2} className="text-gray-800 mb-2">
            🛒 অর্ডার ম্যানেজমেন্ট
          </Title>
          <Text className="text-gray-600">
            নতুন অর্ডার তৈরি এবং ব্যবস্থাপনা করুন
          </Text>
        </div>

        {/* Financial Summary Dashboard */}
        {financialSummary && (
          <Card className="shadow-lg rounded-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} className="m-0">
                <BarChartOutlined className="mr-2 text-blue-500" />
                ড্যাশবোর্ড সামারি
              </Title>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchFinancialSummary}
                size="small"
              >
                রিফ্রেশ
              </Button>
            </div>
            <Row gutter={16}>
              <Col xs={12} sm={6} className="mb-3">
                <Card size="small" className="text-center shadow-sm">
                  <Statistic
                    title="আজকের বিক্রয়"
                    value={financialSummary.daily?.sales || 0}
                    prefix="৳"
                    valueStyle={{ color: "#3f8600" }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} className="mb-3">
                <Card size="small" className="text-center shadow-sm">
                  <Statistic
                    title="আজকের অর্ডার"
                    value={financialSummary.daily?.orders || 0}
                    valueStyle={{ color: "#1890ff" }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} className="mb-3">
                <Card size="small" className="text-center shadow-sm">
                  <Statistic
                    title="মাসিক বিক্রয়"
                    value={financialSummary.monthly?.sales || 0}
                    prefix="৳"
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6} className="mb-3">
                <Card size="small" className="text-center shadow-sm">
                  <Statistic
                    title="মাসিক অর্ডার"
                    value={financialSummary.monthly?.orders || 0}
                    valueStyle={{ color: "#722ed1" }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* Main Order Card */}
        <Card className="shadow-lg rounded-xl mb-6">
          {/* Action Buttons */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={8} className="mb-3">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setAddOrderModalVisible(true)}
                className="w-full h-12"
                block
              >
                নতুন অর্ডার
              </Button>
            </Col>
            <Col xs={24} sm={12} md={8} className="mb-3">
              <Button
                icon={<QrcodeOutlined />}
                size="large"
                onClick={startQRScanner}
                className="w-full h-12"
                block
              >
                QR স্ক্যান করুন
              </Button>
            </Col>
          </Row>

          {/* Customer Information */}
          <Card
            title={
              <span>
                <UserOutlined className="mr-2" />
                গ্রাহকের তথ্য
              </span>
            }
            className="mb-6"
            size="small"
          >
            <Row gutter={16}>
              <Col xs={24} md={8} className="mb-3">
                <Input
                  placeholder="গ্রাহকের নাম*"
                  prefix={<UserOutlined />}
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                  size="large"
                />
              </Col>
              <Col xs={24} md={8} className="mb-3">
                <Input
                  placeholder="ফোন নম্বর*"
                  prefix={<PhoneOutlined />}
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  size="large"
                />
              </Col>
              <Col xs={24} md={8} className="mb-3">
                <Input
                  placeholder="ঠিকানা*"
                  prefix={<HomeOutlined />}
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      address: e.target.value,
                    })
                  }
                  size="large"
                />
              </Col>
            </Row>
          </Card>

          {/* Current Order Summary */}
          {orderItems.length > 0 && (
            <Card
              title={`বর্তমান অর্ডার (${orderItems.length}টি পণ্য)`}
              className="mb-6"
              size="small"
            >
              <Row gutter={16} className="mb-4">
                <Col xs={12} sm={8}>
                  <div className="text-center">
                    <Text strong>মোট পণ্য</Text>
                    <div className="text-lg font-bold text-blue-600">
                      {orderItems.length}
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={8}>
                  <div className="text-center">
                    <Text strong>মোট আইটেম</Text>
                    <div className="text-lg font-bold text-green-600">
                      {totalItems}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div className="text-center">
                    <Text strong>মোট Amount</Text>
                    <div className="text-lg font-bold text-red-600">
                      ৳{totalAmount}
                    </div>
                  </div>
                </Col>
              </Row>

              <Table
                columns={columns}
                dataSource={orderItems}
                pagination={false}
                scroll={{ x: 500 }}
                size="small"
              />

              <div className="text-center mt-4">
                <Button
                  type="primary"
                  size="large"
                  onClick={submitOrder}
                  loading={orderSubmitting}
                  className="min-w-48 h-12"
                  disabled={
                    !customerInfo.name ||
                    !customerInfo.phone ||
                    !customerInfo.address
                  }
                  icon={
                    orderSubmitting ? (
                      <LoadingOutlined />
                    ) : (
                      <CheckCircleOutlined />
                    )
                  }
                >
                  {orderSubmitting ? "প্রসেসিং..." : "অর্ডার কনফার্ম করুন"}
                </Button>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {orderItems.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCartOutlined className="text-4xl text-gray-400 mb-4" />
              <Title level={4} className="text-gray-500 mb-2">
                কোন অর্ডার আইটেম নেই
              </Title>
              <Text className="text-gray-400">
                নতুন অর্ডার যোগ করতে উপরের বাটন ব্যবহার করুন
              </Text>
            </div>
          )}
        </Card>

        {/* All Orders Table */}
        <Card className="shadow-lg rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <Title level={4} className="m-0">
              সকল অর্ডার
            </Title>
            <Button
              onClick={fetchOrders}
              icon={<ReloadOutlined />}
              loading={loading}
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
          />
        </Card>

        {/* Add Order Modal */}
        <Modal
          title="নতুন অর্ডার যোগ করুন"
          open={addOrderModalVisible}
          onCancel={() => setAddOrderModalVisible(false)}
          footer={null}
          width={700}
        >
          <Form
            form={addOrderForm}
            onFinish={handleAddOrder}
            layout="vertical"
            className="mt-4"
          >
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
                      <Option key={product.productId} value={product.productId}>
                        {product.productName} - ৳{product.unitPrice}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
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
                  rules={[{ required: true, message: "পরিমাণ লিখুন" }]}
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

            <div className="text-right pt-4 border-t">
              <Button
                onClick={() => setAddOrderModalVisible(false)}
                className="mr-2"
                size="large"
              >
                বাতিল
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<PlusOutlined />}
              >
                অর্ডার যোগ করুন
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
                      selectedOrder.status === "Completed" ? "green" : "orange"
                    }
                  >
                    {selectedOrder.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="মোট Amount">
                  <Text strong>৳{selectedOrder.grandTotal}</Text>
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
                <Option value="Completed">Completed</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
            <div className="text-right pt-4 border-t">
              <Button
                onClick={() => setEditOrderModalVisible(false)}
                className="mr-2"
                size="large"
              >
                বাতিল
              </Button>
              <Button type="primary" htmlType="submit" size="large">
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

            <Form form={scanForm} onFinish={handleScanOrder} layout="vertical">
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
                    rules={[{ required: true, message: "পরিমাণ লিখুন" }]}
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

              <div className="text-right pt-4 border-t">
                <Button
                  onClick={() => {
                    setScanModalVisible(false);
                    setScanning(false);
                  }}
                  className="mr-2"
                  size="large"
                >
                  বাতিল
                </Button>
                <Button type="primary" htmlType="submit" size="large">
                  অর্ডার যোগ করুন
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
