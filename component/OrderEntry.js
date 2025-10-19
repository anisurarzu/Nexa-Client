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
} from "antd";
import {
  QrcodeOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
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
  const [scannedProduct, setScannedProduct] = useState(null);

  const scannerRef = useRef(null);
  const scannerId = "order-qr-reader";
  const [form] = Form.useForm();

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
        const productId = parseQRCode(decodedText);
        if (productId) {
          await fetchProductDetails(productId);
        } else {
          message.error("অবৈধ QR কোড! সঠিক পণ্য QR কোড স্ক্যান করুন।");
        }
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
      const response = await coreAxios.get(`/products/${productId}`);
      if (response.data.success) {
        const productData = response.data.product;
        setScannedProduct(productData);
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
    setScanning(true);
    setCameraError(false);
  };

  const addToOrder = () => {
    if (!scannedProduct) {
      message.error("কোন পণ্য স্ক্যান করা হয়নি!");
      return;
    }

    const existingItemIndex = orderItems.findIndex(
      (item) => item.productId === scannedProduct.productId
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total =
        updatedItems[existingItemIndex].quantity *
        updatedItems[existingItemIndex].salePrice;
      setOrderItems(updatedItems);
    } else {
      const newItem = {
        key: Date.now(),
        productId: scannedProduct.productId,
        productName: scannedProduct.productName,
        category: scannedProduct.category,
        unitPrice: scannedProduct.unitPrice,
        salePrice: scannedProduct.unitPrice, // Default sale price same as unit price
        quantity: 1,
        vat: 0,
        tax: 0,
        total: scannedProduct.unitPrice,
      };
      setOrderItems([...orderItems, newItem]);
    }

    setScannedProduct(null);
    message.success("পণ্য অর্ডারে যোগ করা হয়েছে!");
  };

  const addManualProduct = (values) => {
    const selectedProduct = products.find(
      (p) => p.productId === values.productId
    );
    if (!selectedProduct) {
      message.error("পণ্য নির্বাচন করুন!");
      return;
    }

    const newItem = {
      key: Date.now(),
      productId: selectedProduct.productId,
      productName: selectedProduct.productName,
      category: values.category,
      unitPrice: selectedProduct.unitPrice,
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
    form.resetFields();
    message.success("পণ্য অর্ডারে যোগ করা হয়েছে!");
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
      setScannedProduct(null);
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
    },
    {
      title: "ক্যাটাগরি",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "ইউনিট প্রাইস",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (price) => `৳${price}`,
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
        />
      ),
    },
    {
      title: "ভ্যাট",
      dataIndex: "vat",
      key: "vat",
      render: (vat, record) => (
        <InputNumber
          min={0}
          value={vat}
          onChange={(value) => updateOrderItem(record.key, "vat", value)}
          formatter={(value) => `৳ ${value}`}
          parser={(value) => value.replace("৳ ", "")}
        />
      ),
    },
    {
      title: "ট্যাক্স",
      dataIndex: "tax",
      key: "tax",
      render: (tax, record) => (
        <InputNumber
          min={0}
          value={tax}
          onChange={(value) => updateOrderItem(record.key, "tax", value)}
          formatter={(value) => `৳ ${value}`}
          parser={(value) => value.replace("৳ ", "")}
        />
      ),
    },
    {
      title: "মোট",
      dataIndex: "total",
      key: "total",
      render: (total) => `৳${total}`,
    },
    {
      title: "কর্ম",
      key: "action",
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeOrderItem(record.key)}
        >
          মুছুন
        </Button>
      ),
    },
  ];

  const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg border-gray-200">
          <Title level={3} className="text-center mb-6 text-gray-800">
            অর্ডার এন্ট্রি
          </Title>

          <Row gutter={24}>
            {/* Left Column - Customer Info & Manual Entry */}
            <Col xs={24} lg={12}>
              {/* Customer Information */}
              <Card title="গ্রাহকের তথ্য" className="mb-6">
                <Space direction="vertical" className="w-full">
                  <Input
                    placeholder="গ্রাহকের নাম*"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    size="large"
                  />
                  <Input
                    placeholder="ফোন নম্বর*"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        phone: e.target.value,
                      })
                    }
                    size="large"
                  />
                  <Input.TextArea
                    placeholder="ঠিকানা"
                    value={customerInfo.address}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        address: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </Space>
              </Card>

              {/* Manual Product Entry */}
              <Card title="ম্যানুয়াল পণ্য এন্ট্রি">
                <Form form={form} onFinish={addManualProduct} layout="vertical">
                  <Form.Item
                    name="category"
                    label="ক্যাটাগরি"
                    rules={[{ required: true }]}
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

                  <Form.Item
                    name="productId"
                    label="পণ্য"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="পণ্য নির্বাচন করুন" size="large">
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

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="salePrice"
                        label="সেল প্রাইস"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          placeholder="সেল প্রাইস"
                          className="w-full"
                          min={1}
                          formatter={(value) => `৳ ${value}`}
                          parser={(value) => value.replace("৳ ", "")}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="quantity"
                        label="পরিমাণ"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          placeholder="পরিমাণ"
                          className="w-full"
                          min={1}
                          defaultValue={1}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="vat" label="ভ্যাট">
                        <InputNumber
                          placeholder="ভ্যাট"
                          className="w-full"
                          min={0}
                          formatter={(value) => `৳ ${value}`}
                          parser={(value) => value.replace("৳ ", "")}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="tax" label="ট্যাক্স">
                        <InputNumber
                          placeholder="ট্যাক্স"
                          className="w-full"
                          min={0}
                          formatter={(value) => `৳ ${value}`}
                          parser={(value) => value.replace("৳ ", "")}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    className="w-full"
                  >
                    পণ্য যোগ করুন
                  </Button>
                </Form>
              </Card>
            </Col>

            {/* Right Column - QR Scanner & Order Summary */}
            <Col xs={24} lg={12}>
              {/* QR Scanner Section */}
              <Card title="QR কোড স্ক্যানার" className="mb-6">
                <div className="text-center mb-4">
                  <Button
                    type="dashed"
                    size="large"
                    icon={<QrcodeOutlined />}
                    onClick={startQRScanner}
                    className="w-full"
                    style={{ height: "50px", fontSize: "16px" }}
                  >
                    📱 QR কোড স্ক্যান করুন
                  </Button>
                </div>

                {scanning && (
                  <div className="mb-4">
                    {cameraError ? (
                      <Alert
                        message="ক্যামেরা অ্যাক্সেস ব্যর্থ হয়েছে"
                        type="error"
                      />
                    ) : (
                      <div className="w-full h-[250px] border rounded bg-gray-50 flex items-center justify-center">
                        <div id={scannerId} className="w-full h-full" />
                      </div>
                    )}
                    <div className="text-center mt-2">
                      <Button onClick={() => setScanning(false)}>
                        স্ক্যান বাতিল করুন
                      </Button>
                    </div>
                  </div>
                )}

                {scannedProduct && (
                  <div className="p-4 border rounded bg-green-50">
                    <Title level={5}>স্ক্যান করা পণ্য:</Title>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="পণ্যের নাম">
                        {scannedProduct.productName}
                      </Descriptions.Item>
                      <Descriptions.Item label="ক্যাটাগরি">
                        {scannedProduct.category}
                      </Descriptions.Item>
                      <Descriptions.Item label="ইউনিট প্রাইস">
                        ৳{scannedProduct.unitPrice}
                      </Descriptions.Item>
                    </Descriptions>
                    <Button
                      type="primary"
                      onClick={addToOrder}
                      className="w-full mt-2"
                    >
                      অর্ডারে যোগ করুন
                    </Button>
                  </div>
                )}
              </Card>

              {/* Order Summary */}
              <Card title="অর্ডার সামারি">
                <Table
                  columns={columns}
                  dataSource={orderItems}
                  pagination={false}
                  scroll={{ x: 800 }}
                  size="small"
                />

                <Divider />

                <div className="text-right">
                  <Title level={4}>মোট Amount: ৳{totalAmount}</Title>
                </div>

                <Button
                  type="primary"
                  size="large"
                  onClick={submitOrder}
                  loading={loading}
                  className="w-full"
                  disabled={orderItems.length === 0}
                >
                  অর্ডার সাবমিট করুন
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default OrderEntry;
