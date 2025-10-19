"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Pagination,
  Dropdown,
  Menu,
  Tag,
  Input,
  Select,
  Tooltip,
  DatePicker,
  Card,
  Space,
  Form,
  Row,
  Col,
  InputNumber,
  Alert,
  Spin,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  SyncOutlined,
  ExportOutlined,
  QrcodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as XLSX from "xlsx";
import coreAxios from "@/utils/axiosInstance";
import jsQR from "jsqr";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;

// ==================== CONSTANTS ====================
const INITIAL_PAGINATION = { current: 1, pageSize: 10 };
const PAYMENT_METHODS = ["Cash on Delivery", "Online Payment", "Bank Transfer"];
const ORDER_STATUSES = ["Pending", "On Process", "Dispatched", "Delivered"];

// ==================== HELPER FUNCTIONS ====================
const getUserInfo = () => {
  if (typeof window === "undefined") return {};
  return JSON.parse(localStorage.getItem("userInfo") || "{}");
};

const formatDeliveryDateTime = (dateTime) => {
  if (!dateTime) return "-";
  return dayjs.utc(dateTime).tz("Asia/Dhaka").format("DD MMM, hh:mm A");
};

const getStatusColor = (status) => {
  const statusColors = {
    pending: "gold",
    "on process": "blue",
    dispatched: "orange",
    delivered: "green",
  };
  return statusColors[status?.toLowerCase()] || "default";
};

const parseQRCode = (qrData) => {
  try {
    // Try to parse as JSON first
    const productData = JSON.parse(qrData);
    return productData.productId || productData.id || productData.product_id;
  } catch (e) {
    // If JSON parsing fails, try to extract product ID from string
    if (qrData.includes("productId:")) {
      return parseInt(qrData.split("productId:")[1]);
    } else if (qrData.includes("id=")) {
      return parseInt(qrData.split("id=")[1]);
    }
    // If it's just a number, parse it directly
    return parseInt(qrData);
  }
};

// ==================== MAIN COMPONENT ====================
const OrderEntry = () => {
  // User Info
  const userInfo = getUserInfo();

  // State Management
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // UI State
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  // QR Scanner State
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle"); // 'idle', 'scanning', 'success', 'error'
  const [scanMessage, setScanMessage] = useState("");

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanningRef = useRef(false);

  // ==================== DATA FETCHING ====================
  const fetchProducts = useCallback(async () => {
    try {
      const response = await coreAxios.get("/products");
      if (response?.status === 200) {
        setProducts(response.data?.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      message.error("পণ্য লোড করতে সমস্যা হয়েছে");
    }
  }, []);

  const fetchCategories = useCallback(async () => {
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
      message.error("ক্যাটাগরি লোড করতে সমস্যা হয়েছে");
    }
  }, []);

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
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
        console.error("Error fetching orders:", error);
        message.error("অর্ডার লোড করতে ব্যর্থ হয়েছে");
      } finally {
        setLoading(false);
        setInitialLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [statusFilter, dateFilter]
  );

  // Initial Data Load
  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCategories();
  }, [fetchOrders, fetchProducts, fetchCategories]);

  // ==================== IMPROVED QR SCANNER LOGIC ====================
  const startScanner = useCallback(async () => {
    setScanning(true);
    setScanStatus("scanning");
    setScanMessage("ক্যামেরা শুরু হচ্ছে...");
    scanningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanMessage("QR কোড স্ক্যান করার জন্য ক্যামেরার সামনে ধরুন...");
        requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setScanStatus("error");
      setScanMessage(
        "ক্যামেরা এক্সেস করতে সমস্যা হয়েছে! ক্যামেরা পারমিশন চেক করুন।"
      );
      setScanning(false);
      scanningRef.current = false;
    }
  }, []);

  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    setScanStatus("idle");
    setScanMessage("");

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanQRCode = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code?.data) {
          handleScannedQRCode(code.data);
          return;
        }
      } catch (error) {
        console.error("QR scanning error:", error);
      }
    }

    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode);
    }
  }, [products]);

  const handleScannedQRCode = useCallback(
    (qrData) => {
      stopScanner();
      setScanStatus("success");
      console.log("Scanned QR Data:", qrData);

      const productId = parseQRCode(qrData);

      if (!productId || isNaN(productId)) {
        setScanStatus("error");
        setScanMessage(
          "QR কোড থেকে সঠিক Product ID পাওয়া যায়নি! অনুগ্রহ করে ভিন্ন QR কোড ব্যবহার করুন।"
        );
        message.error("QR কোড থেকে সঠিক Product ID পাওয়া যায়নি!");
        return;
      }

      const product = products.find((p) => p.productId === productId);

      if (product) {
        setScannedProduct(product);
        setScanMessage(`সফলভাবে স্ক্যান হয়েছে: ${product.productName}`);
        message.success(`পণ্য স্ক্যান সফল: ${product.productName}`);

        // Auto-fill the form with scanned product data
        formik.setValues({
          ...formik.values,
          productId: product.productId,
          productName: product.productName,
          productDescription: product.description || "",
          category: product.category,
          totalBill: product.unitPrice || 0,
        });

        // Close scan modal after 1.5 seconds and open order form
        setTimeout(() => {
          setIsScanModalVisible(false);
          setVisible(true);
          setScanStatus("idle");
          setScanMessage("");
        }, 1500);
      } else {
        setScanStatus("error");
        setScanMessage(
          `Product ID ${productId} খুঁজে পাওয়া যায়নি! ডাটাবেসে এই পণ্য নেই।`
        );
        message.error(`Product ID ${productId} খুঁজে পাওয়া যায়নি!`);
      }
    },
    [products, stopScanner]
  );

  // Scanner Modal Effect
  useEffect(() => {
    if (isScanModalVisible) {
      startScanner();
    } else {
      stopScanner();
      setScanStatus("idle");
      setScanMessage("");
    }

    return () => stopScanner();
  }, [isScanModalVisible, startScanner, stopScanner]);

  // ==================== FORM LOGIC ====================
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

        const orderData = {
          ...values,
          deliveryDateTime: values.deliveryDateTime.format(
            "YYYY-MM-DD HH:mm:ss"
          ),
          createdBy: userInfo?.loginID || "system",
          updatedBy: userInfo?.loginID || "system",
        };

        const response = isEditing
          ? await coreAxios.put(`orders/${editingKey}`, orderData)
          : await coreAxios.post("orders", orderData);

        if (response?.status === 200) {
          message.success(
            isEditing ? "অর্ডার আপডেট সফল হয়েছে!" : "অর্ডার তৈরি সফল হয়েছে!"
          );
          fetchOrders();
          resetForm();
          setVisible(false);
          setIsEditing(false);
          setEditingKey(null);
          setScannedProduct(null);
        }
      } catch (error) {
        console.error("Order submission error:", error);
        message.error(
          error.response?.data?.error || "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
        );
      } finally {
        setLoading(false);
      }
    },
  });

  // Auto Calculate Grand Total
  useEffect(() => {
    const totalBill = parseFloat(formik.values.totalBill) || 0;
    const discount = parseFloat(formik.values.discount) || 0;
    const deliveryCharge = parseFloat(formik.values.deliveryCharge) || 0;
    const addOnPrice = formik.values.addOnRequirement
      ? parseFloat(formik.values.addOnPrice) || 0
      : 0;

    const grandTotal = totalBill - discount + deliveryCharge + addOnPrice;
    const amountPaid = parseFloat(formik.values.amountPaid) || 0;
    const totalDue = grandTotal - amountPaid;

    formik.setFieldValue("grandTotal", grandTotal);
    formik.setFieldValue("totalDue", totalDue);
  }, [
    formik.values.totalBill,
    formik.values.discount,
    formik.values.deliveryCharge,
    formik.values.addOnRequirement,
    formik.values.addOnPrice,
    formik.values.amountPaid,
  ]);

  // ==================== CRUD OPERATIONS ====================
  const handleEdit = useCallback(
    (record) => {
      setEditingKey(record._id);
      formik.setValues({
        ...record,
        deliveryDateTime: dayjs(record.deliveryDateTime),
        updatedBy: userInfo?.loginID,
      });
      setVisible(true);
      setIsEditing(true);
    },
    [userInfo]
  );

  const handleDelete = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const response = await coreAxios.delete(`orders/${id}`);
        if (response?.status === 200) {
          message.success("অর্ডার ডিলিট সফল হয়েছে!");
          fetchOrders();
        }
      } catch (error) {
        console.error("Delete error:", error);
        message.error("অর্ডার ডিলিট করতে ব্যর্থ হয়েছে");
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders]
  );

  // ==================== SEARCH & FILTER ====================
  const handleSearch = useCallback(
    (value) => {
      setSearchText(value);
      const filtered = orders.filter(
        (order) =>
          order.orderNo?.includes(value) ||
          order?.customerName?.toLowerCase()?.includes(value?.toLowerCase())
      );
      setFilteredOrders(filtered);
      setPagination({ ...INITIAL_PAGINATION });
    },
    [orders]
  );

  // ==================== EXPORT ====================
  const exportToExcel = useCallback(async () => {
    try {
      setLoading(true);
      message.loading({
        content: "এক্সপোর্ট প্রস্তুত হচ্ছে...",
        key: "export",
      });

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
        message.warning("গত মাসের কোন অর্ডার পাওয়া যায়নি");
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
        "Grand Total": order.grandTotal,
        "Amount Paid": order.amountPaid,
        "Total Due": order.totalDue,
        "Payment Method": order.paymentMethod,
        Status: order.status,
        "Delivery Date": formatDeliveryDateTime(order.deliveryDateTime),
        "Created By": order.createdBy,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet["!cols"] = Array(18).fill({ wch: 20 });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

      const fileName = `Orders_${firstDayOfLastMonth.format("MMM_YYYY")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success({ content: "এক্সপোর্ট সফল হয়েছে!", key: "export" });
    } catch (error) {
      console.error("Export error:", error);
      message.error({ content: "এক্সপোর্ট ব্যর্থ হয়েছে", key: "export" });
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== HELPER FUNCTIONS ====================
  const getCategoryLabel = useCallback(
    (categoryValue) => {
      const category = categories.find(
        (cat) => cat.categoryCode === categoryValue
      );
      return category ? category.categoryName : categoryValue;
    },
    [categories]
  );

  // ==================== TABLE COLUMNS ====================
  const columns = [
    {
      title: "অর্ডার নং",
      dataIndex: "orderNo",
      key: "orderNo",
      width: 120,
      fixed: "left",
    },
    {
      title: "গ্রাহকের নাম",
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
    },
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      width: 180,
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>,
    },
    {
      title: "মোট বিল",
      dataIndex: "totalBill",
      key: "totalBill",
      width: 120,
      render: (amount) => `৳${(amount || 0).toFixed(2)}`,
    },
    {
      title: "ডেলিভারি তারিখ",
      dataIndex: "deliveryDateTime",
      key: "deliveryDateTime",
      width: 180,
      render: formatDeliveryDateTime,
    },
    {
      title: "কর্ম",
      key: "actions",
      width: 100,
      fixed: "right",
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
                  disabled: !userInfo?.pagePermissions?.[1]?.updateAccess,
                },
                {
                  key: "delete",
                  icon: <DeleteOutlined />,
                  label: "ডিলিট",
                  onClick: () => handleDelete(record._id),
                  disabled: !userInfo?.pagePermissions?.[1]?.deleteAccess,
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

  // ==================== ORDER FORM COMPONENT ====================
  const OrderForm = () => (
    <Form layout="vertical" onFinish={formik.handleSubmit}>
      {/* QR Scanner Button */}
      <Form.Item label="QR কোড স্ক্যান করুন">
        <Button
          type="dashed"
          icon={<QrcodeOutlined />}
          onClick={() => setIsScanModalVisible(true)}
          block
          size="large"
          style={{ height: "50px", fontSize: "16px" }}
        >
          📱 পণ্য স্ক্যান করুন
        </Button>
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
          QR কোড স্ক্যান করে পণ্যের তথ্য অটো ফিল করুন
        </div>
      </Form.Item>

      {/* Scanned Product Info */}
      {scannedProduct && (
        <Alert
          message="পণ্য সফলভাবে স্ক্যান হয়েছে!"
          description={
            <Row gutter={16} style={{ marginTop: "8px" }}>
              <Col span={8}>
                <strong>পণ্য:</strong> {scannedProduct.productName}
              </Col>
              <Col span={8}>
                <strong>ক্যাটাগরি:</strong>{" "}
                {getCategoryLabel(scannedProduct.category)}
              </Col>
              <Col span={8}>
                <strong>মূল্য:</strong> ৳{scannedProduct.unitPrice}
              </Col>
            </Row>
          }
          type="success"
          showIcon
          style={{ marginBottom: "16px" }}
        />
      )}

      {/* Customer Information */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="গ্রাহকের নাম" required>
            <Input
              name="customerName"
              value={formik.values.customerName}
              onChange={formik.handleChange}
              placeholder="গ্রাহকের নাম"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="ফোন নম্বর">
            <Input
              name="customerInformation"
              value={formik.values.customerInformation}
              onChange={formik.handleChange}
              placeholder="ফোন নম্বর"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Receiver Information */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="প্রাপকের নাম">
            <Input
              name="receiverName"
              value={formik.values.receiverName}
              onChange={formik.handleChange}
              placeholder="প্রাপকের নাম"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="প্রাপকের ফোন">
            <Input
              name="receiverPhoneNumber"
              value={formik.values.receiverPhoneNumber}
              onChange={formik.handleChange}
              placeholder="প্রাপকের ফোন"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="ঠিকানা">
        <Input.TextArea
          name="receiverAddress"
          value={formik.values.receiverAddress}
          onChange={formik.handleChange}
          placeholder="সম্পূর্ণ ঠিকানা"
          rows={2}
        />
      </Form.Item>

      {/* Product Selection */}
      <Row gutter={16}>
        <Col span={16}>
          <Form.Item label="পণ্য নির্বাচন করুন" required>
            <Select
              value={formik.values.productId || undefined}
              onChange={(value) => {
                const product = products.find((p) => p.productId === value);
                if (product) {
                  formik.setValues({
                    ...formik.values,
                    productId: value,
                    productName: product.productName,
                    productDescription: product.description || "",
                    category: product.category,
                    totalBill: product.unitPrice || 0,
                  });
                  setScannedProduct(product);
                }
              }}
              placeholder="পণ্য নির্বাচন করুন বা QR স্ক্যান করুন"
              showSearch
              optionFilterProp="children"
              disabled={!!scannedProduct}
            >
              {products.map((product) => (
                <Option key={product.productId} value={product.productId}>
                  {product.productName} - ৳{product.unitPrice}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="ক্যাটাগরি">
            <Input value={getCategoryLabel(formik.values.category)} disabled />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="পণ্যের বিবরণ">
        <Input.TextArea
          name="productDescription"
          value={formik.values.productDescription}
          onChange={formik.handleChange}
          rows={2}
        />
      </Form.Item>

      {/* Billing Information */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="মোট বিল">
            <InputNumber
              value={formik.values.totalBill}
              onChange={(value) =>
                formik.setFieldValue("totalBill", value || 0)
              }
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
              parser={(value) => value.replace(/৳\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="ডিসকাউন্ট">
            <InputNumber
              value={formik.values.discount}
              onChange={(value) => formik.setFieldValue("discount", value || 0)}
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
              parser={(value) => value.replace(/৳\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="ডেলিভারি চার্জ">
            <InputNumber
              value={formik.values.deliveryCharge}
              onChange={(value) =>
                formik.setFieldValue("deliveryCharge", value || 0)
              }
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
              parser={(value) => value.replace(/৳\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Payment Information */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="গ্র্যান্ড টোটাল">
            <InputNumber
              value={formik.values.grandTotal}
              style={{ width: "100%" }}
              formatter={(value) => `৳ ${value}`}
              disabled
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="পরিশোধিত অর্থ">
            <InputNumber
              value={formik.values.amountPaid}
              onChange={(value) =>
                formik.setFieldValue("amountPaid", value || 0)
              }
              style={{ width: "100%" }}
              min={0}
              formatter={(value) => `৳ ${value}`}
              parser={(value) => value.replace(/৳\s?|(,*)/g, "")}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="বাকি অর্থ">
            <InputNumber
              value={formik.values.totalDue}
              style={{ width: "100%" }}
              formatter={(value) => `৳ ${value}`}
              disabled
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Delivery & Payment Method */}
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
              value={formik.values.paymentMethod}
              onChange={(value) => formik.setFieldValue("paymentMethod", value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <Option key={method} value={method}>
                  {method}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Form Actions */}
      <Form.Item>
        <Space>
          <Button
            onClick={() => {
              setVisible(false);
              setScannedProduct(null);
              formik.resetForm();
            }}
          >
            বাতিল
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEditing ? "আপডেট করুন" : "অর্ডার তৈরি করুন"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // ==================== IMPROVED QR SCANNER MODAL ====================
  const QRScannerModal = () => (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>QR কোড স্ক্যান করুন</span>
        </Space>
      }
      open={isScanModalVisible}
      onCancel={() => {
        stopScanner();
        setIsScanModalVisible(false);
        setScanStatus("idle");
        setScanMessage("");
      }}
      width={600}
      footer={[
        <Button
          key="close"
          onClick={() => {
            stopScanner();
            setIsScanModalVisible(false);
            setScanStatus("idle");
            setScanMessage("");
          }}
        >
          বাতিল
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        {/* Scan Status Messages */}
        {scanStatus === "success" && (
          <Alert
            message="স্ক্যান সফল!"
            description={scanMessage}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
          />
        )}

        {scanStatus === "error" && (
          <Alert
            message="স্ক্যান ব্যর্থ"
            description={scanMessage}
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            style={{ marginBottom: 20 }}
          />
        )}

        {scanStatus === "scanning" && (
          <Alert
            message="স্ক্যান চলছে..."
            description={scanMessage}
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Scanner UI */}
        {!scanning ? (
          <div style={{ padding: "40px 0" }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: "#8c8c8c" }}>
              ক্যামেরা লোড হচ্ছে...
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  height: "auto",
                  border:
                    scanStatus === "scanning"
                      ? "3px solid #1890ff"
                      : scanStatus === "success"
                      ? "3px solid #52c41a"
                      : scanStatus === "error"
                      ? "3px solid #ff4d4f"
                      : "3px solid #d9d9d9",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
                playsInline
                muted
              />
              {scanStatus === "scanning" && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "60%",
                    height: "60%",
                    border: "2px dashed #52c41a",
                    borderRadius: "8px",
                    pointerEvents: "none",
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {scanStatus === "scanning" && (
              <p style={{ marginTop: 16, color: "#52c41a", fontWeight: 500 }}>
                📱 QR কোড ক্যামেরার সামনে ধরুন...
              </p>
            )}
            <p style={{ fontSize: 12, color: "#8c8c8c", marginTop: 8 }}>
              QR কোড সবুজ বক্সের মধ্যে রাখুন
            </p>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }
      `}</style>
    </Modal>
  );

  // ==================== RENDER ====================
  if (!userInfo?.pagePermissions?.[1]?.viewAccess) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Card
          style={{
            textAlign: "center",
            width: 400,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600, color: "#ff4d4f" }}>
            🚫 অ্যাক্সেস নিষিদ্ধ
          </div>
          <div style={{ marginTop: 16, color: "#595959" }}>
            আপনার এই পেজ দেখার অনুমতি নেই
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <style>{`
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
      `}</style>

      {/* Header Card with Filters */}
      <Card style={{ marginBottom: 20 }} bodyStyle={{ padding: "16px 24px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <Input.Search
            placeholder="অর্ডার নং বা নাম দিয়ে খুঁজুন..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
            prefix={<SearchOutlined />}
          />

          {/* Status Filter */}
          <Select
            style={{ width: 180 }}
            placeholder="স্ট্যাটাস ফিল্টার"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            suffixIcon={<FilterOutlined />}
          >
            {ORDER_STATUSES.map((status) => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>

          {/* Date Filter */}
          <DatePicker
            style={{ width: 200 }}
            value={dateFilter}
            onChange={setDateFilter}
            format="YYYY-MM-DD"
            placeholder="ডেলিভারি তারিখ"
            suffixIcon={<CalendarOutlined />}
            allowClear
          />

          <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
            {/* Refresh Button */}
            <Tooltip title="রিফ্রেশ করুন">
              <Button
                icon={<SyncOutlined spin={refreshing} />}
                onClick={() => fetchOrders(true)}
                loading={refreshing}
              >
                রিফ্রেশ
              </Button>
            </Tooltip>

            {/* Export Button */}
            {userInfo?.pagePermissions?.[1]?.insertAccess && (
              <Tooltip title="গত মাসের ডেটা এক্সপোর্ট করুন">
                <Button
                  icon={<ExportOutlined />}
                  onClick={exportToExcel}
                  loading={loading}
                >
                  এক্সপোর্ট
                </Button>
              </Tooltip>
            )}

            {/* Add Order Button */}
            {userInfo?.pagePermissions?.[1]?.insertAccess && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  formik.resetForm();
                  setVisible(true);
                  setIsEditing(false);
                  setScannedProduct(null);
                }}
              >
                নতুন অর্ডার
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredOrders.slice(
            (pagination.current - 1) * pagination.pageSize,
            pagination.current * pagination.pageSize
          )}
          rowKey="_id"
          pagination={false}
          loading={initialLoading}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: "কোন অর্ডার পাওয়া যায়নি",
          }}
        />

        {/* Pagination */}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={filteredOrders.length}
            onChange={(page, pageSize) => {
              setPagination({ current: page, pageSize });
            }}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} দেখানো হচ্ছে, মোট ${total} টি`
            }
            pageSizeOptions={["10", "20", "50", "100"]}
          />
        </div>
      </Card>

      {/* Order Form Modal */}
      <Modal
        width={900}
        title={
          <Space>
            {isEditing ? <EditOutlined /> : <PlusOutlined />}
            <span>
              {isEditing ? "অর্ডার এডিট করুন" : "নতুন অর্ডার তৈরি করুন"}
            </span>
          </Space>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          formik.resetForm();
          setScannedProduct(null);
        }}
        footer={null}
        destroyOnClose
      >
        <OrderForm />
      </Modal>

      {/* QR Scanner Modal */}
      <QRScannerModal />
    </div>
  );
};

export default OrderEntry;
