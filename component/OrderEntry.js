import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Alert,
  Typography,
  message,
  Descriptions,
  Divider,
  Skeleton,
  Tag,
  Row,
  Col,
  Image,
  Select,
  Form,
  Table,
  Space,
  InputNumber,
  Modal,
  Tooltip,
  Statistic,
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
} from "@ant-design/icons";
import { Html5Qrcode } from "html5-qrcode";
import coreAxios from "@/utils/axiosInstance";

const { Title, Text } = Typography;
const { Option } = Select;

const OrderEntry = () => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);

  // Modal states
  const [addOrderModalVisible, setAddOrderModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);

  const scannerRef = useRef(null);
  const scannerId = "order-qr-reader";
  const [addOrderForm] = Form.useForm();
  const [scanForm] = Form.useForm();

  // Customer form fields
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

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

  // QR Scanner Logic
  useEffect(() => {
    if (!scanning) return;

    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          const backCamera = cameras.find((camera) =>
            camera.label.toLowerCase().includes("back")
          );
          const cameraId = backCamera ? backCamera.id : cameras[0].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            (errorMessage) => {
              // ignore scan errors
            }
          );
        } else {
          setCameraError(true);
          message.error(
            "কোন ক্যামেরা পাওয়া যায়নি। আপনার ডিভাইস পরীক্ষা করুন।"
          );
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError(true);
        message.error(
          "ক্যামেরা অ্যাক্সেস করতে ব্যর্থ হয়েছে। অনুমতি পরীক্ষা করুন।"
        );
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
      if (qrData.includes("productId:")) {
        return parseInt(qrData.split("productId:")[1]);
      } else if (qrData.includes("id=")) {
        return parseInt(qrData.split("id=")[1]);
      }
      const parsedId = parseInt(qrData);
      return isNaN(parsedId) ? null : parsedId;
    }
  };

  const fetchProductDetails = async (productId) => {
    setLoading(true);
    try {
      const parsedProductId = parseQRCode(productId);
      const response = await coreAxios.get(`/products/${parsedProductId}`);
      if (response.data.success) {
        const productData = response.data.product;

        // Pre-fill the scan form with product details
        scanForm.setFieldsValue({
          productId: productData.productId,
          productName: productData.productName,
          category: productData.category,
          unitPrice: productData.unitPrice,
          salePrice: productData.unitPrice,
          quantity: 1,
          vat: 0,
          tax: 0,
        });

        message.success("পণ্য সফলভাবে স্ক্যান করা হয়েছে!");
      } else {
        message.error("পণ্য পাওয়া যায়নি!");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      message.error("পণ্যের তথ্য পাওয়া যায়নি।");
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
    const newItem = {
      key: Date.now(),
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      vat: values.vat || 0,
      tax: values.tax || 0,
      total:
        values.salePrice * values.quantity +
        (values.vat || 0) +
        (values.tax || 0),
    };

    setOrderItems([...orderItems, newItem]);
    addOrderForm.resetFields();
    setAddOrderModalVisible(false);
    message.success("পণ্য অর্ডারে যোগ করা হয়েছে!");
  };

  const handleScanOrder = (values) => {
    const newItem = {
      key: Date.now(),
      productId: values.productId,
      productName: values.productName,
      category: values.category,
      unitPrice: values.unitPrice,
      salePrice: values.salePrice,
      quantity: values.quantity,
      vat: values.vat || 0,
      tax: values.tax || 0,
      total:
        values.salePrice * values.quantity +
        (values.vat || 0) +
        (values.tax || 0),
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
          updatedItem.total =
            updatedItem.salePrice * updatedItem.quantity +
            updatedItem.vat +
            updatedItem.tax;
        }

        // Recalculate total if vat or tax changes
        if (field === "vat" || field === "tax") {
          updatedItem.total =
            updatedItem.salePrice * updatedItem.quantity +
            updatedItem.vat +
            updatedItem.tax;
        }

        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const submitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      message.error("গ্রাহকের নাম এবং ফোন নম্বর প্রয়োজন!");
      return;
    }

    if (orderItems.length === 0) {
      message.error("অর্ডারে কমপক্ষে একটি পণ্য যোগ করুন!");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address,
        items: orderItems,
        totalAmount: orderItems.reduce((sum, item) => sum + item.total, 0),
        orderDate: new Date().toISOString(),
      };

      // Here you would call your order creation API
      console.log("Order Data:", orderData);

      message.success("অর্ডার সফলভাবে তৈরি হয়েছে!");

      // Reset form
      setCustomerInfo({ name: "", phone: "", address: "" });
      setOrderItems([]);
    } catch (error) {
      console.error("Error creating order:", error);
      message.error("অর্ডার তৈরি করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      responsive: ["md"],
    },
    {
      title: "ক্যাটাগরি",
      dataIndex: "category",
      key: "category",
      responsive: ["lg"],
    },
    {
      title: "ইউনিট প্রাইস",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (price) => `৳${price}`,
      responsive: ["md"],
    },
    {
      title: "সেল প্রাইস",
      dataIndex: "salePrice",
      key: "salePrice",
      render: (price, record) => (
        <InputNumber
          min={1}
          value={price}
          onChange={(value) => updateOrderItem(record.key, "salePrice", value)}
          formatter={(value) => `৳ ${value}`}
          parser={(value) => value.replace("৳ ", "")}
          size="small"
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
          value={quantity}
          onChange={(value) => updateOrderItem(record.key, "quantity", value)}
          size="small"
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

  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <Title level={2} className="text-center mb-2 text-gray-800">
            অর্ডার ম্যানেজমেন্ট
          </Title>
          <Text className="text-center block text-gray-600">
            নতুন অর্ডার তৈরি এবং ব্যবস্থাপনা করুন
          </Text>
        </div>

        <Card className="shadow-lg border-0 rounded-xl">
          {/* Action Buttons */}
          <div className="mb-6">
            <Row gutter={16} justify="center">
              <Col xs={24} sm={8} md={6} className="mb-3">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={() => setAddOrderModalVisible(true)}
                  className="w-full h-12"
                >
                  নতুন অর্ডার
                </Button>
              </Col>
              <Col xs={24} sm={8} md={6} className="mb-3">
                <Button
                  icon={<QrcodeOutlined />}
                  size="large"
                  onClick={startQRScanner}
                  className="w-full h-12"
                >
                  QR স্ক্যান করুন
                </Button>
              </Col>
            </Row>
          </div>

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
                    setCustomerInfo({
                      ...customerInfo,
                      phone: e.target.value,
                    })
                  }
                  size="large"
                />
              </Col>
              <Col xs={24} md={8} className="mb-3">
                <Input
                  placeholder="ঠিকানা"
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

          {/* Order Summary Stats */}
          {orderItems.length > 0 && (
            <div className="mb-6">
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Card size="small" className="text-center">
                    <Statistic
                      title="মোট পণ্য"
                      value={orderItems.length}
                      prefix={<ShoppingCartOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" className="text-center">
                    <Statistic title="মোট আইটেম" value={totalItems} />
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card size="small" className="text-center">
                    <Statistic
                      title="মোট Amount"
                      value={totalAmount}
                      precision={2}
                      prefix="৳"
                      valueStyle={{ color: "#3f8600" }}
                    />
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* Order Items Table */}
          <Card title={`অর্ডার আইটেম (${orderItems.length})`} className="mb-6">
            {orderItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCartOutlined className="text-4xl text-gray-400 mb-4" />
                <Title level={4} className="text-gray-500">
                  কোন অর্ডার আইটেম নেই
                </Title>
                <Text className="text-gray-400">
                  নতুন অর্ডার যোগ করতে উপরের বাটন ব্যবহার করুন
                </Text>
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={orderItems}
                pagination={false}
                scroll={{ x: 800 }}
                size="middle"
                className="order-table"
              />
            )}
          </Card>

          {/* Submit Order Button */}
          {orderItems.length > 0 && (
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                onClick={submitOrder}
                loading={loading}
                className="min-w-48 h-12 text-lg"
                disabled={!customerInfo.name || !customerInfo.phone}
              >
                অর্ডার কনফার্ম করুন
              </Button>
            </div>
          )}
        </Card>

        {/* Add Order Modal */}
        <Modal
          title="নতুন অর্ডার যোগ করুন"
          open={addOrderModalVisible}
          onCancel={() => setAddOrderModalVisible(false)}
          footer={null}
          width={700}
          centered
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
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
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
                <Form.Item
                  name="unitPrice"
                  label="ইউনিট প্রাইস"
                  rules={[{ required: true, message: "ইউনিট প্রাইস লিখুন" }]}
                >
                  <InputNumber
                    placeholder="ইউনিট প্রাইস"
                    className="w-full"
                    min={1}
                    formatter={(value) => `৳ ${value}`}
                    parser={(value) => value.replace("৳ ", "")}
                    size="large"
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
                    placeholder="সেল প্রাইস"
                    className="w-full"
                    min={1}
                    formatter={(value) => `৳ ${value}`}
                    parser={(value) => value.replace("৳ ", "")}
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
                    placeholder="পরিমাণ"
                    className="w-full"
                    min={1}
                    defaultValue={1}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="vat" label="ভ্যাট">
                  <InputNumber
                    placeholder="ভ্যাট"
                    className="w-full"
                    min={0}
                    formatter={(value) => `৳ ${value}`}
                    parser={(value) => value.replace("৳ ", "")}
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="tax" label="ট্যাক্স">
                  <InputNumber
                    placeholder="ট্যাক্স"
                    className="w-full"
                    min={0}
                    formatter={(value) => `৳ ${value}`}
                    parser={(value) => value.replace("৳ ", "")}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="text-right">
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

        {/* Scan Modal */}
        <Modal
          title="QR কোড স্ক্যান করুন"
          open={scanModalVisible}
          onCancel={() => {
            setScanModalVisible(false);
            setScanning(false);
            if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current.stop().catch(() => {});
            }
          }}
          footer={null}
          width={700}
          centered
        >
          <div className="mb-4">
            {scanning && (
              <div className="mb-4">
                {cameraError ? (
                  <Alert
                    message="ক্যামেরা অ্যাক্সেস ব্যর্থ হয়েছে"
                    description="আপনার ব্রাউজারে ক্যামেরা অনুমতি প্রদান করুন"
                    type="error"
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
                      parser={(value) => value.replace("৳ ", "")}
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
                      parser={(value) => value.replace("৳ ", "")}
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

              <div className="text-right">
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

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.order-table .ant-table-thead > tr > th) {
            font-size: 12px;
            padding: 8px 4px;
          }
          :global(.order-table .ant-table-tbody > tr > td) {
            font-size: 12px;
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderEntry;
