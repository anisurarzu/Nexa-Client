"use client";

import { useState, useEffect, useRef } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Popconfirm,
  Pagination,
  Dropdown,
  Menu,
  Tag,
  Input,
  Select,
  Tooltip,
  DatePicker,
  Image,
  Card,
  Skeleton,
  Space,
  Form,
  Row,
  Col,
  InputNumber,
  Alert,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  CopyOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  SyncOutlined,
  ExportOutlined,
  QrcodeOutlined,
  CameraOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as XLSX from "xlsx";
import coreAxios from "@/utils/axiosInstance";

// Extend Day.js with UTC and Timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;

const OrderEntry = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedOrderForStatusUpdate, setSelectedOrderForStatusUpdate] =
    useState(null);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState(null);
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanError, setScanError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const userInfo =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userInfo") || "{}")
      : {};

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await coreAxios.get("/products");
      if (response?.status === 200) {
        setProducts(response.data?.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await coreAxios.get("/categories");
      if (response?.status === 200) {
        const activeCategories = response.data.filter(
          (cat) => cat.status === "active" && cat.statusCode !== 255
        );
        setCategories(activeCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        status: statusFilter,
        deliveryDate: dateFilter
          ? dayjs(dateFilter).format("YYYY-MM-DD")
          : null,
      };
      const response = await coreAxios.get("orders", { params });
      if (response?.status === 200) {
        setOrders(response.data);
        setFilteredOrders(response.data);
      }
    } catch (error) {
      message.error("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCategories();
  }, [statusFilter, dateFilter]);

  // Improved QR Code Scanner Functions
  const startScanner = async () => {
    setScanning(true);
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        startScanning();
      };
    } catch (error) {
      console.error("Error accessing camera:", error);
      setScanError(
        "ক্যামেরা এক্সেস করতে সমস্যা হয়েছে! ক্যামেরা পারমিশন চেক করুন।"
      );
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  // Simple QR code detection without external library
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Simple QR code pattern detection (basic implementation)
    // This is a simplified version - for production, use a proper QR library
    try {
      // Check for QR code patterns in the image
      const qrData = attemptQRCodeDetection(imageData);
      return qrData;
    } catch (error) {
      console.error("QR detection error:", error);
      return null;
    }
  };

  const attemptQRCodeDetection = (imageData) => {
    // This is a basic implementation
    // In a real scenario, you would use a proper QR code library
    const { data, width, height } = imageData;

    // Look for QR code finder patterns (simplified)
    // Real QR codes have specific patterns in corners
    for (let y = 0; y < height - 10; y += 5) {
      for (let x = 0; x < width - 10; x += 5) {
        // Check for potential QR code pattern
        if (isPotentialQRPattern(data, width, x, y)) {
          // Extract data from the potential QR code area
          return extractDataFromArea(data, width, x, y, 100, 100);
        }
      }
    }
    return null;
  };

  const isPotentialQRPattern = (data, width, x, y) => {
    // Simplified pattern detection
    // Real implementation would use proper QR code pattern recognition
    const patterns = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    // Check for pattern match (simplified)
    for (let py = 0; py < 5; py++) {
      for (let px = 0; px < 5; px++) {
        const pixelIndex = ((y + py) * width + (x + px)) * 4;
        const brightness =
          (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        const expected = patterns[py][px] === 1 ? 0 : 255; // 1 = dark, 0 = light

        if (Math.abs(brightness - expected) > 100) {
          return false;
        }
      }
    }
    return true;
  };

  const extractDataFromArea = (data, width, x, y, areaWidth, areaHeight) => {
    // Simplified data extraction
    // This would need proper QR code decoding in real implementation
    let extractedData = "";

    for (let dy = 0; dy < areaHeight; dy += 10) {
      for (let dx = 0; dx < areaWidth; dx += 10) {
        const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
        const brightness =
          (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;

        // Simple threshold for demo purposes
        if (brightness < 128) {
          extractedData += "1";
        } else {
          extractedData += "0";
        }
      }
    }

    return extractedData.length > 0 ? `demo:${x},${y}` : null;
  };

  const startScanning = () => {
    scanIntervalRef.current = setInterval(() => {
      const qrData = detectQRCode();
      if (qrData) {
        handleScannedQRCode(qrData);
      }
    }, 500); // Check every 500ms
  };

  // Alternative manual QR code input method
  const handleManualQRInput = () => {
    Modal.confirm({
      title: "ম্যানুয়াল QR কোড ইনপুট",
      content: (
        <Input.TextArea
          placeholder="QR কোডের ডাটা এখানে পেস্ট করুন..."
          rows={4}
          id="manualQRInput"
        />
      ),
      onOk() {
        const input = document.getElementById("manualQRInput");
        if (input && input.value) {
          handleScannedQRCode(input.value);
        }
      },
      okText: "সাবমিট",
      cancelText: "বাতিল",
    });
  };

  const handleScannedQRCode = async (qrData) => {
    try {
      console.log("Scanned QR Data:", qrData);

      // Check if it's a demo QR code (for testing)
      if (qrData.startsWith("demo:")) {
        // For demo purposes, use a sample product
        const sampleProduct = products[0];
        if (sampleProduct) {
          processScannedProduct(sampleProduct);
          return;
        }
      }

      // Try to parse as JSON (actual QR code data)
      let productData;
      try {
        productData = JSON.parse(qrData);
      } catch (parseError) {
        // If not JSON, try to extract product ID from string
        const productIdMatch = qrData.match(/productId[": ]+(\d+)/i);
        if (productIdMatch) {
          productData = { productId: parseInt(productIdMatch[1]) };
        } else {
          throw new Error("Invalid QR code format");
        }
      }

      const productId = productData.productId;

      // Find product in the products list
      const product = products.find((p) => p.productId === productId);

      if (product) {
        processScannedProduct(product);
      } else {
        message.error("স্ক্যান করা পণ্য ডাটাবেসে খুঁজে পাওয়া যায়নি!");
      }
    } catch (error) {
      console.error("Error parsing QR code:", error);
      setScanError(
        "QR কোড পড়তে সমস্যা হয়েছে! ম্যানুয়ালি ইনপুট করুন অথবা অন্য QR কোড ট্রাই করুন।"
      );
    }
  };

  const processScannedProduct = (product) => {
    setScannedProduct(product);
    stopScanner();
    setIsScanModalVisible(false);
    message.success("পণ্য সফলভাবে স্ক্যান হয়েছে!");

    // Auto-fill the order form with scanned product data
    formik.setValues({
      ...formik.values,
      productId: product.productId,
      productName: product.productName,
      productDescription: product.description || "",
      category: product.category,
      totalBill: product.unitPrice || 0,
      grandTotal: product.unitPrice || 0,
    });

    setVisible(true);
  };

  const openScanner = () => {
    setIsScanModalVisible(true);
    setScannedProduct(null);
    setScanError("");
  };

  const closeScanner = () => {
    stopScanner();
    setIsScanModalVisible(false);
    setScannedProduct(null);
    setScanError("");
  };

  const handleExpenseClick = (invoiceNo, invoiceId) => {
    setSelectedInvoiceNo(invoiceNo);
    setSelectedInvoiceId(invoiceId);
    setIsExpenseModalVisible(true);
  };

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const exportToExcel = async () => {
    try {
      setLoading(true);
      message.loading({ content: "Preparing export...", key: "export" });

      const today = dayjs();
      const firstDayOfLastMonth = today.subtract(1, "month").startOf("month");
      const lastDayOfLastMonth = today.subtract(1, "month").endOf("month");

      const params = {
        startDate: firstDayOfLastMonth.format("YYYY-MM-DD"),
        endDate: lastDayOfLastMonth.format("YYYY-MM-DD"),
      };

      const response = await coreAxios.get("orders", { params });
      const ordersToExport = response.data || [];

      if (ordersToExport.length === 0) {
        message.warning("No orders found for the last month to export");
        return;
      }

      const excelData = ordersToExport.map((order) => ({
        "Invoice No": order.invoiceNo,
        "Customer Name": order.customerName,
        "Customer Phone": order.customerInformation,
        "Receiver Name": order.receiverName,
        "Receiver Address": order.receiverAddress,
        "Receiver Phone": order.receiverPhoneNumber,
        "Product Name": order.productName,
        "Product Description": order.productDescription,
        "Total Bill": order.totalBill,
        Discount: order.discount,
        "Delivery Charge": order.deliveryCharge,
        "Add On": order.addOnRequirement
          ? `${order.addOnType} (৳${order.addOnPrice})`
          : "No",
        "Grand Total": order.grandTotal,
        "Amount Paid": order.amountPaid,
        "Total Due": order.totalDue,
        "Payment Method": order.paymentMethod,
        Status: order.status,
        "Delivery Date": formatDeliveryDateTime(order.deliveryDateTime),
        "Created By": order.createdBy,
        "Updated By": order.updatedBy || "N/A",
        Notes: order.noteText || "N/A",
        "Cancel Reason": order.cancelReason || "N/A",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      const wscols = [
        { wch: 12 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 25 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
        { wch: 30 },
      ];
      worksheet["!cols"] = wscols;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      const fileName = `Orders_${firstDayOfLastMonth.format("MMM_YYYY")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success({
        content: "Export completed successfully!",
        key: "export",
        duration: 4,
      });
    } catch (error) {
      console.error("Export error:", error);
      message.error({
        content: "Failed to export orders. Please try again.",
        key: "export",
      });
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      prevInvoiceNo: "",
      customerName: "",
      customerInformation: "",
      receiverName: "",
      receiverAddress: "",
      receiverPhoneNumber: "",
      productId: 0,
      productName: "",
      totalBill: 0,
      discount: 0,
      deliveryCharge: 0,
      addOnRequirement: false,
      addOnType: "",
      addOnPrice: 0,
      note: false,
      noteText: "",
      notePrice: "",
      paymentMethod: "Cash on Delivery",
      grandTotal: 0,
      amountPaid: 0,
      totalDue: 0,
      deliveryDateTime: dayjs(),
      createdBy: userInfo?.loginID,
      updatedBy: "",
      canceledBy: "",
      cancelReason: "",
      productDescription: "",
      category: "",
      status: "Pending",
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        const newOrder = {
          prevInvoiceNo: values.prevInvoiceNo,
          customerName: values.customerName,
          customerInformation: values.customerInformation,
          receiverName: values.receiverName,
          receiverAddress: values.receiverAddress,
          receiverPhoneNumber: values.receiverPhoneNumber,
          productId: values.productId,
          productName: values.productName,
          totalBill: values.totalBill,
          discount: values.discount,
          deliveryCharge: values.deliveryCharge,
          addOnRequirement: values.addOnRequirement,
          addOnType: values.addOnType,
          addOnPrice: values.addOnPrice,
          note: values.note,
          noteText: values.noteText,
          notePrice: values.notePrice,
          paymentMethod: values.paymentMethod,
          grandTotal: values.grandTotal,
          amountPaid: values.amountPaid,
          totalDue: values.totalDue,
          status: values.status,
          deliveryDateTime: values.deliveryDateTime.format(
            "YYYY-MM-DD HH:mm:ss"
          ),
          createdBy: userInfo?.loginID || "someUser",
          updatedBy: userInfo?.loginID || "someUser",
          canceledBy: values.canceledBy,
          cancelReason: values.cancelReason,
          productDescription: values.productDescription,
          category: values.category,
        };

        let res;

        if (isEditing) {
          res = await coreAxios.put(`orders/${editingKey}`, newOrder);
          if (res?.status === 200) {
            message.success("Order updated successfully!");
            fetchOrders();
          }
        } else {
          res = await coreAxios.post("orders", newOrder);
          if (res?.status === 200) {
            message.success("Order Created successfully!");
            fetchOrders();
          }
        }

        resetForm();
        setVisible(false);
        setIsEditing(false);
        setEditingKey(null);
      } catch (error) {
        if (error.response?.data?.error) {
          message.error(error.response.data.error);
        } else {
          message.error("An error occurred. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const handleEdit = (record) => {
    setEditingKey(record._id);
    formik.setValues({
      ...record,
      deliveryDateTime: dayjs(record.deliveryDateTime),
      updatedBy: userInfo?.loginID,
      canceledBy: userInfo?.loginID,
    });
    setVisible(true);
    setIsEditing(true);
  };

  const handleDelete = async (key) => {
    setLoading(true);
    try {
      const res = await coreAxios.delete(`orders/${key}`);
      if (res?.status === 200) {
        message.success("Order deleted successfully!");
        fetchOrders();
      }
    } catch (error) {
      message.error("Failed to delete order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = orders.filter(
      (order) =>
        order.orderNo?.includes(value) ||
        order?.customerName?.toLowerCase()?.includes(value?.toLowerCase())
    );
    setFilteredOrders(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const openStatusUpdateModal = (order) => {
    setSelectedOrderForStatusUpdate(order);
    setIsStatusModalVisible(true);
  };

  const updateOrderStatus = async (orderId, updatedData) => {
    try {
      setLoading(true);
      const res = await coreAxios.put(`orders/${orderId}`, updatedData);
      if (res?.status === 200) {
        message.success("Order status updated successfully!");
        fetchOrders();
      }
    } catch (error) {
      message.error("Failed to update order status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDeliveryDateTime = (dateTime) => {
    if (!dateTime) return "-";
    return dayjs.utc(dateTime).tz("Asia/Dhaka").format("DD MMM, hh:mm A");
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "gold";
      case "on process":
        return "blue";
      case "dispatched":
        return "orange";
      case "delivered":
        return "green";
      default:
        return "default";
    }
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(
      (cat) => cat.categoryCode === categoryValue
    );
    return category ? category.categoryName : categoryValue;
  };

  const rowClassName = (record) => {
    return record.isExpenseAdded ? "green-row" : "";
  };

  const tableStyle = `
    .green-row {
      background-color: #f6ffed !important;
      border-left: 3px solid #52c41a;
    }
    .ant-table-thead > tr > th {
      background-color: #fafafa !important;
      font-weight: 600 !important;
    }
    .ant-table-tbody > tr:hover > td {
      background-color: #f5f5f5 !important;
    }
  `;

  // Enhanced OrderForm with QR Scan functionality
  const EnhancedOrderForm = ({ formik, products, categories }) => (
    <Form layout="vertical" onFinish={formik.handleSubmit}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="QR স্ক্যান করুন">
            <Button
              type="dashed"
              icon={<QrcodeOutlined />}
              onClick={openScanner}
              style={{ width: "100%" }}
              size="large"
            >
              পণ্য স্ক্যান করুন
            </Button>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="ম্যানুয়াল ইনপুট">
            <Button
              type="dashed"
              icon={<EditOutlined />}
              onClick={handleManualQRInput}
              style={{ width: "100%" }}
              size="large"
            >
              ম্যানুয়ালি ডাটা ইনপুট করুন
            </Button>
          </Form.Item>
        </Col>
      </Row>

      {scannedProduct && (
        <Card
          title="স্ক্যান করা পণ্যের তথ্য"
          style={{ marginBottom: 16, borderColor: "#52c41a" }}
          size="small"
        >
          <Row gutter={16}>
            <Col span={8}>
              <strong>পণ্যের নাম:</strong> {scannedProduct.productName}
            </Col>
            <Col span={8}>
              <strong>ক্যাটাগরি:</strong>{" "}
              {getCategoryLabel(scannedProduct.category)}
            </Col>
            <Col span={8}>
              <strong>মূল্য:</strong> ৳{scannedProduct.unitPrice}
            </Col>
          </Row>
        </Card>
      )}

      {/* Rest of your form remains the same */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="গ্রাহকের নাম" required>
            <Input
              name="customerName"
              value={formik.values.customerName}
              onChange={formik.handleChange}
              placeholder="গ্রাহকের নাম লিখুন"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="ফোন নম্বর">
            <Input
              name="customerInformation"
              value={formik.values.customerInformation}
              onChange={formik.handleChange}
              placeholder="ফোন নম্বর লিখুন"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="প্রাপকের নাম">
            <Input
              name="receiverName"
              value={formik.values.receiverName}
              onChange={formik.handleChange}
              placeholder="প্রাপকের নাম লিখুন"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="প্রাপকের ফোন">
            <Input
              name="receiverPhoneNumber"
              value={formik.values.receiverPhoneNumber}
              onChange={formik.handleChange}
              placeholder="প্রাপকের ফোন নম্বর"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="ঠিকানা">
        <Input.TextArea
          name="receiverAddress"
          value={formik.values.receiverAddress}
          onChange={formik.handleChange}
          placeholder="সম্পূর্ণ ঠিকানা লিখুন"
          rows={3}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="পণ্য" required>
            <Select
              value={formik.values.productId}
              onChange={(value) => {
                const product = products.find((p) => p.productId === value);
                formik.setValues({
                  ...formik.values,
                  productId: value,
                  productName: product?.productName || "",
                  productDescription: product?.description || "",
                  category: product?.category || "",
                  totalBill: product?.unitPrice || 0,
                  grandTotal: product?.unitPrice || 0,
                });
              }}
              placeholder="পণ্য নির্বাচন করুন"
            >
              {products.map((product) => (
                <Option key={product.productId} value={product.productId}>
                  {product.productName} - ৳{product.unitPrice}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="ক্যাটাগরি">
            <Input
              value={getCategoryLabel(formik.values.category)}
              disabled
              placeholder="অটো ফিল্ড"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="পণ্যের বিবরণ">
        <Input.TextArea
          name="productDescription"
          value={formik.values.productDescription}
          onChange={formik.handleChange}
          placeholder="পণ্যের বিস্তারিত বিবরণ"
          rows={2}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="মোট বিল">
            <InputNumber
              name="totalBill"
              value={formik.values.totalBill}
              onChange={(value) => formik.setFieldValue("totalBill", value)}
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="ডিসকাউন্ট">
            <InputNumber
              name="discount"
              value={formik.values.discount}
              onChange={(value) => formik.setFieldValue("discount", value)}
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="ডেলিভারি চার্জ">
            <InputNumber
              name="deliveryCharge"
              value={formik.values.deliveryCharge}
              onChange={(value) =>
                formik.setFieldValue("deliveryCharge", value)
              }
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="গ্র্যান্ড টোটাল">
            <InputNumber
              value={formik.values.grandTotal}
              style={{ width: "100%" }}
              formatter={(value) => `৳ ${value}`}
              disabled
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="পরিশোধিত অর্থ">
            <InputNumber
              name="amountPaid"
              value={formik.values.amountPaid}
              onChange={(value) => formik.setFieldValue("amountPaid", value)}
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="বাকি অর্থ">
        <InputNumber
          value={formik.values.totalDue}
          style={{ width: "100%" }}
          formatter={(value) => `৳ ${value}`}
          disabled
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="ডেলিভারি তারিখ ও সময়">
            <DatePicker
              value={formik.values.deliveryDateTime}
              onChange={(date) =>
                formik.setFieldValue("deliveryDateTime", date)
              }
              style={{ width: "100%" }}
              showTime
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="পেমেন্ট মেথড">
            <Select
              name="paymentMethod"
              value={formik.values.paymentMethod}
              onChange={(value) => formik.setFieldValue("paymentMethod", value)}
            >
              <Option value="Cash on Delivery">Cash on Delivery</Option>
              <Option value="Online Payment">Online Payment</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Space>
          <Button
            onClick={() => setVisible(false)}
            disabled={formik.isSubmitting}
          >
            বাতিল
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={formik.isSubmitting}
          >
            {isEditing ? "আপডেট করুন" : "অর্ডার তৈরি করুন"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // Improved QR Scanner Modal
  const QRScannerModal = () => (
    <Modal
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>QR কোড স্ক্যান করুন</span>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={closeScanner}
            size="small"
          />
        </div>
      }
      open={isScanModalVisible}
      onCancel={closeScanner}
      width={500}
      footer={[
        <Button key="manual" onClick={handleManualQRInput}>
          ম্যানুয়াল ইনপুট
        </Button>,
        <Button
          key="scan"
          type="primary"
          onClick={scanning ? stopScanner : startScanner}
          icon={<CameraOutlined />}
        >
          {scanning ? "স্ক্যান বন্ধ করুন" : "স্ক্যান শুরু করুন"}
        </Button>,
      ]}
    >
      <div style={{ textAlign: "center" }}>
        {scanError && (
          <Alert
            message={scanError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!scanning ? (
          <div style={{ padding: "40px 0" }}>
            <QrcodeOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
            <p style={{ marginTop: 16, color: "#8c8c8c" }}>
              স্ক্যান শুরু করতে "স্ক্যান শুরু করুন" বাটনে ক্লিক করুন
            </p>
            <p style={{ marginTop: 8, fontSize: 12, color: "#bfbfbf" }}>
              অথবা ম্যানুয়ালি QR কোড ডাটা ইনপুট করুন
            </p>
          </div>
        ) : (
          <div>
            <video
              ref={videoRef}
              style={{
                width: "100%",
                maxWidth: "400px",
                border: "2px solid #1890ff",
                borderRadius: "8px",
                background: "#000",
              }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <p style={{ marginTop: 8, color: "#52c41a" }}>
              QR কোড ক্যামেরার সামনে ধরুন...
            </p>
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: "#389e0d" }}>
                💡 টিপ: QR কোড ক্যামেরার ১৫-২০ সেমি দূরত্বে ধরুন
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  // Rest of your columns and return statement remain the same
  const columns = [
    {
      title: "অর্ডার নং",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 100,
    },
    {
      title: "গ্রাহকের নাম",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      key: "status",
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: "মোট বিল",
      dataIndex: "totalBill",
      key: "totalBill",
      render: (amount) => `৳${(amount || 0).toFixed(2)}`,
    },
    {
      title: "ডেলিভারি তারিখ",
      dataIndex: "deliveryDateTime",
      key: "deliveryDateTime",
      render: (dateTime) => formatDeliveryDateTime(dateTime),
    },
    {
      title: "কর্ম",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Dropdown
          overlay={
            <Menu
              items={[
                {
                  key: "edit",
                  icon: <EditOutlined />,
                  label: "এডিট",
                  onClick: () => handleEdit(record),
                  disabled:
                    userInfo?.pagePermissions?.[1]?.updateAccess !== true,
                },
                {
                  key: "status",
                  icon: <SyncOutlined />,
                  label: "স্ট্যাটাস আপডেট",
                  onClick: () => openStatusUpdateModal(record),
                },
                {
                  key: "expense",
                  icon: <PlusOutlined />,
                  label: "খরচ যোগ করুন",
                  onClick: () =>
                    handleExpenseClick(record.invoiceNo, record._id),
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "ডিলিট",
                  onClick: () => handleDelete(record._id),
                  disabled:
                    userInfo?.pagePermissions?.[1]?.deleteAccess !== true,
                  danger: true,
                },
              ]}
            />
          }
          trigger={["click"]}
        >
          <Button type="text" icon={<DownOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {userInfo?.pagePermissions?.[1]?.viewAccess === true ? (
        <div>
          <style>{tableStyle}</style>

          <Card
            style={{ marginBottom: 20 }}
            bodyStyle={{ padding: "16px 24px" }}
          >
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex flex-wrap gap-4">
                <Input.Search
                  placeholder="Search...."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                  prefix={<SearchOutlined />}
                />

                <Select
                  style={{ width: 200 }}
                  placeholder="Filter by Status"
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value={null}>All Status</Option>
                  <Option value="Pending">Pending</Option>
                  <Option value="On Process">On Process</Option>
                  <Option value="Dispatched">Dispatched</Option>
                  <Option value="Delivered">Delivered</Option>
                </Select>

                <DatePicker
                  style={{ width: 200 }}
                  value={dateFilter}
                  onChange={(date) => setDateFilter(date)}
                  format="YYYY-MM-DD"
                  placeholder="Select Delivery Date"
                  suffixIcon={<CalendarOutlined />}
                />

                {userInfo?.pagePermissions?.[1]?.insertAccess === true && (
                  <Button
                    type="default"
                    onClick={exportToExcel}
                    icon={<ExportOutlined />}
                    loading={loading}
                    disabled={loading}
                  >
                    Export Last Month
                  </Button>
                )}

                {userInfo.pagePermissions?.[1]?.insertAccess && (
                  <Button
                    type="primary"
                    onClick={() => {
                      formik.resetForm();
                      setVisible(true);
                      setIsEditing(false);
                    }}
                    icon={<PlusOutlined />}
                  >
                    Add Order
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Table
            columns={columns}
            dataSource={filteredOrders.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )}
            rowKey="_id"
            pagination={false}
            loading={initialLoading}
            rowClassName={rowClassName}
            scroll={{ x: 800 }}
          />

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={filteredOrders.length}
              onChange={handleTableChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `Showing ${range[0]}-${range[1]} of ${total} items`
              }
            />
          </div>

          <Modal
            width={800}
            title={isEditing ? "Edit Order" : "Create Order"}
            open={visible}
            onCancel={() => {
              setVisible(false);
              formik.resetForm();
            }}
            footer={null}
            destroyOnClose
          >
            <EnhancedOrderForm
              formik={formik}
              products={products}
              categories={categories}
            />
          </Modal>

          <QRScannerModal />

          {/* Add your StatusUpdateModal and ExpenseForm components here */}
        </div>
      ) : (
        <div className="flex justify-center items-center h-[80vh]">
          <Card
            style={{
              textAlign: "center",
              width: 400,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600, color: "#ff4d4f" }}>
              Access Denied
            </div>
            <div style={{ marginTop: 16, color: "#595959" }}>
              {` You don't have permission to access this page`}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrderEntry;
