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
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as XLSX from "xlsx";
import coreAxios from "@/utils/axiosInstance";
import OrderForm from "./Order/OrderForm";
import Link from "next/link";
import CopyToClipboard from "react-copy-to-clipboard";
import StatusUpdateModal from "./Order/StatusUpdateModal";
import ExpenseForm from "./Expense/ExpenseForm";
import QRCode from "react-qr-code";
import jsQR from "jsqr";

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

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

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

  // QR Code Scanner Functions
  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      scanQRCode();
    } catch (error) {
      console.error("Error accessing camera:", error);
      message.error("ক্যামেরা এক্সেস করতে সমস্যা হয়েছে!");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        handleScannedQRCode(code.data);
        return;
      }
    }

    requestAnimationFrame(scanQRCode);
  };

  const handleScannedQRCode = async (qrData) => {
    try {
      const productData = JSON.parse(qrData);
      const productId = productData.productId;

      // Find product in the products list
      const product = products.find((p) => p.productId === productId);

      if (product) {
        setScannedProduct(product);
        stopScanner();
        setIsScanModalVisible(false);
        message.success("পণ্য সফলভাবে স্ক্যান হয়েছে!");

        // Auto-fill the order form with scanned product data
        formik.setValues({
          ...formik.values,
          productId: product.productId,
          productName: product.productName,
          productDescription: product.description,
          category: product.category,
          totalBill: product.unitPrice || 0,
          grandTotal: product.unitPrice || 0,
        });

        setVisible(true);
      } else {
        message.error("স্ক্যান করা পণ্য ডাটাবেসে খুঁজে পাওয়া যায়নি!");
      }
    } catch (error) {
      console.error("Error parsing QR code:", error);
      message.error("QR কোড পড়তে সমস্যা হয়েছে!");
    }
  };

  const openScanner = () => {
    setIsScanModalVisible(true);
    setScannedProduct(null);
  };

  const closeScanner = () => {
    stopScanner();
    setIsScanModalVisible(false);
    setScannedProduct(null);
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
            // Handle image uploads...
            fetchOrders();
          }
        } else {
          res = await coreAxios.post("orders", newOrder);
          if (res?.status === 200) {
            message.success("Order Created successfully!");
            // Handle image uploads...
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
        order.orderNo.includes(value) ||
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
    switch (status.toLowerCase()) {
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

  // Updated OrderForm with QR Scan functionality
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

  // QR Scanner Modal
  const QRScannerModal = () => (
    <Modal
      title="QR কোড স্ক্যান করুন"
      open={isScanModalVisible}
      onCancel={closeScanner}
      width={500}
      footer={[
        <Button key="cancel" onClick={closeScanner}>
          বাতিল
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
        {!scanning ? (
          <div style={{ padding: "40px 0" }}>
            <QrcodeOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
            <p style={{ marginTop: 16, color: "#8c8c8c" }}>
              স্ক্যান শুরু করতে "স্ক্যান শুরু করুন" বাটনে ক্লিক করুন
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
              }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <p style={{ marginTop: 8, color: "#52c41a" }}>
              QR কোড ক্যামেরার সামনে ধরুন...
            </p>
          </div>
        )}
      </div>
    </Modal>
  );

  // Rest of your existing columns and table code remains the same...
  // [Keep all your existing columns and table rendering code]

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

          {/* Your existing table code */}

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

          <StatusUpdateModal
            visible={isStatusModalVisible}
            onCancel={() => setIsStatusModalVisible(false)}
            onUpdateStatus={updateOrderStatus}
            selectedOrder={selectedOrderForStatusUpdate}
          />

          <ExpenseForm
            visible={isExpenseModalVisible}
            onCancel={() => setIsExpenseModalVisible(false)}
            invoiceNo={selectedInvoiceNo}
            invoiceId={selectedInvoiceId}
            fetchExpenses={fetchOrders}
          />
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
