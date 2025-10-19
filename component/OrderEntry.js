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
  Spin,
  Alert,
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
  CloseCircleOutlined,
  CameraOutlined,
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

// ----------------- Helpers -----------------
const INITIAL_PAGINATION = { current: 1, pageSize: 10 };
const PAYMENT_METHODS = ["Cash on Delivery", "Online Payment", "Bank Transfer"];
const ORDER_STATUSES = ["Pending", "On Process", "Dispatched", "Delivered"];

const getUserInfo = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}");
  } catch {
    return {};
  }
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
  // তোমার আগের parse logic রিইউজ করা হলো — প্রয়োজনে আরও কাস্টমাইজ করো
  try {
    const productData = JSON.parse(qrData);
    return productData.productId || productData.id || productData.product_id;
  } catch (e) {
    if (typeof qrData === "string") {
      if (qrData.includes("productId:")) {
        const v = qrData.split("productId:")[1];
        return parseInt(v);
      } else if (qrData.includes("id=")) {
        return parseInt(qrData.split("id=")[1]);
      }
      const intVal = parseInt(qrData);
      return isNaN(intVal) ? null : intVal;
    }
    return null;
  }
};

// ----------------- Component -----------------
const OrderEntryRefined = () => {
  const userInfo = getUserInfo();

  // --- State ---
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);

  // QR Scanner state
  const [isScanModalVisible, setIsScanModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [scannerError, setScannerError] = useState(null);

  // refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const rafRef = useRef(null);

  // ----------------- Data fetchers (kept similar to original) -----------------
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
          setOrders(response.data || []);
          setFilteredOrders(response.data || []);
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

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCategories();
  }, [fetchOrders, fetchProducts, fetchCategories]);

  // ----------------- QR: Utilities -----------------
  const isSecureContext =
    typeof window !== "undefined" && window.isSecureContext;

  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setAvailableCameras([]);
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setAvailableCameras(videoInputs);
      // auto choose an 'environment' like camera if possible:
      if (videoInputs.length > 0) {
        // try to find camera labeled with back/environment
        const env = videoInputs.find((d) =>
          /back|rear|environment|গোপন|পেছনে/i.test(d.label || "")
        );
        setSelectedCameraId(
          (prev) => prev || (env ? env.deviceId : videoInputs[0].deviceId)
        );
      } else {
        setSelectedCameraId(null);
      }
    } catch (err) {
      console.error("enumerateDevices error:", err);
      setAvailableCameras([]);
    }
  }, []);

  // call enumerate when modal opens
  useEffect(() => {
    if (isScanModalVisible) enumerateCameras();
  }, [isScanModalVisible, enumerateCameras]);

  // ----------------- Start / Stop Scanner -----------------
  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    setScannerError(null);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const startScanner = useCallback(
    async (deviceId = null) => {
      setScannerError(null);

      if (typeof window === "undefined") return;
      if (!isSecureContext) {
        setScannerError(
          "ক্যামেরা কাজ করার জন্য HTTPS প্রয়োজন (বা localhost) — ব্রাউজার নিরাপদ নয়।"
        );
        message.error("অবশ্যই HTTPS/localhost এ চালান।");
        return;
      }

      // try permission first
      try {
        // Try to open with selected deviceId if provided
        const constraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        scanningRef.current = true;
        setScanning(true);
        setScannerError(null);

        // start scanning loop
        const loop = () => {
          if (!scanningRef.current) return;
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (
              video &&
              canvas &&
              video.readyState === video.HAVE_ENOUGH_DATA
            ) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              try {
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "attemptBoth",
                  }
                );

                if (code && code.data) {
                  // found!
                  handleScannedQRCode(code.data);
                  return; // stop scanning loop (handleScannedQRCode will stop camera)
                }
              } catch (err) {
                // sometimes cross-origin or read errors happen
                console.warn("canvas read error:", err);
              }
            }
          } catch (err) {
            console.error("scan loop error:", err);
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("startScanner error:", err);
        // permission denied or not found
        if (err && err.name === "NotAllowedError") {
          setScannerError(
            "ক্যামেরা অনুমতি পাওয়া যায়নি — ব্রাউজার সেটিংসে গিয়ে Allow করে আবার চেষ্টা করুন।"
          );
          message.error("ক্যামেরা অনুমতি ব্লক আছে।");
        } else if (err && err.name === "NotFoundError") {
          setScannerError("কোন ক্যামেরা ডিভাইস পাওয়া যায়নি।");
        } else {
          setScannerError("ক্যামেরা চালু করতে সমস্যা হয়েছে। কনসোলে চেক করুন।");
        }
        stopScanner();
      }
    },
    [isSecureContext, stopScanner]
  );

  // ----------------- Handle scanned data -----------------
  const handleScannedQRCode = useCallback(
    (qrData) => {
      // stop scanner first
      stopScanner();
      setIsScanModalVisible(false);
      console.log("Scanned QR Data:", qrData);

      const productId = parseQRCode(qrData);

      if (!productId) {
        message.error("QR কোড থেকে সঠিক Product ID পাওয়া যায়নি!");
        return;
      }

      const product = products.find(
        (p) => p.productId === productId || p.productId === Number(productId)
      );
      if (product) {
        setScannedProduct(product);
        message.success(`পণ্য স্ক্যান সফল: ${product.productName}`);
        // auto open order modal and set form values
        formik.setValues({
          ...formik.values,
          productId: product.productId,
          productName: product.productName,
          productDescription: product.description || "",
          category: product.category,
          totalBill: product.unitPrice || 0,
        });
        setVisible(true);
      } else {
        message.error(`Product ID ${productId} খুঁজে পাওয়া যায়নি!`);
      }
    },
    [products, stopScanner]
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // ----------------- Formik (kept similar) -----------------
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

  // auto calculate totals
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
    formik.setFieldValue("grandTotal", grandTotal, false);
    formik.setFieldValue("totalDue", totalDue, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formik.values.totalBill,
    formik.values.discount,
    formik.values.deliveryCharge,
    formik.values.addOnRequirement,
    formik.values.addOnPrice,
    formik.values.amountPaid,
  ]);

  // ----------------- CRUD helpers (edit/delete kept similar) -----------------
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
    [userInfo, formik]
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

  // ----------------- Export (kept similar) -----------------
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

  // ----------------- UI helpers -----------------
  const getCategoryLabel = useCallback(
    (categoryValue) => {
      const category = categories.find(
        (cat) => cat.categoryCode === categoryValue
      );
      return category ? category.categoryName : categoryValue;
    },
    [categories]
  );

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

  // ----------------- QR Scanner Modal UI -----------------
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
      }}
      width={720}
      footer={[
        <Button
          key="close"
          onClick={() => {
            stopScanner();
            setIsScanModalVisible(false);
          }}
        >
          বাতিল
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          {/* camera area */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              width: "100%",
              maxWidth: 560,
            }}
          >
            <div
              style={{
                borderRadius: 8,
                overflow: "hidden",
                border: "2px solid #e6f7ff",
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  height: "auto",
                  display: scanning ? "block" : "none",
                  background: "#000",
                }}
                playsInline
                muted
              />
              {!scanning && (
                <div
                  style={{
                    padding: 40,
                    minHeight: 220,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CameraOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />
                  <div style={{ marginTop: 12, color: "#8c8c8c" }}>
                    {scannerError ? scannerError : "ক্যামেরা লোড হচ্ছে..."}
                  </div>
                </div>
              )}
              {/* green dashed box overlay */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "60%",
                  height: "60%",
                  border: "2px dashed #52c41a",
                  borderRadius: 8,
                  pointerEvents: "none",
                }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>

        <div style={{ width: 260 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div>
              <strong>ক্যামেরা নির্বাচন</strong>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: "100%" }}
                  placeholder={
                    availableCameras.length
                      ? "ক্যামেরা সিলেক্ট করুন"
                      : "কোন ক্যামেরা পাওয়া যায়নি"
                  }
                  value={selectedCameraId}
                  onChange={(val) => {
                    setSelectedCameraId(val);
                  }}
                  allowClear
                >
                  {availableCameras.map((cam) => (
                    <Option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${cam.deviceId}`}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <strong>নির্দেশ</strong>
              <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                <li>QR কোড সবুজ বক্সের মধ্যে রাখুন</li>
                <li>আলো ভালো রাখলে স্ক্যান দ্রুত হবে</li>
                <li>মোবাইলে পেছনের ক্যামেরা বেশি ভাল কাজ করে</li>
              </ul>
            </div>

            <div>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button
                  type="primary"
                  icon={<QrcodeOutlined />}
                  onClick={() => {
                    // start scanner with selected device or fallback
                    setScannerError(null);
                    startScanner(selectedCameraId || null);
                  }}
                  block
                  disabled={scanning}
                >
                  স্ক্যান শুরু করুন
                </Button>

                <Button
                  onClick={() => {
                    stopScanner();
                  }}
                  block
                  danger
                >
                  স্টপ করুন
                </Button>

                <Button
                  onClick={() => {
                    // refresh camera list
                    enumerateCameras();
                    message.info("ক্যামেরা তালিকা আপডেট করা হচ্ছে...");
                  }}
                  block
                >
                  ক্যামেরা রিফ্রেশ
                </Button>

                {/* show status */}
                <div style={{ marginTop: 8 }}>
                  {scanning ? (
                    <Tag color="green">Scanning...</Tag>
                  ) : (
                    <Tag color="default">Idle</Tag>
                  )}
                  {scannerError && (
                    <div style={{ marginTop: 8 }}>
                      <Alert message={scannerError} type="error" />
                    </div>
                  )}
                </div>
              </Space>
            </div>
          </Space>
        </div>
      </div>
    </Modal>
  );

  // ----------------- Order Form component (same as original but a bit trimmed) -----------------
  const OrderForm = () => (
    <Form layout="vertical" onFinish={formik.handleSubmit}>
      <Form.Item label="QR স্ক্যান করুন">
        <Button
          type="dashed"
          icon={<QrcodeOutlined />}
          onClick={() => {
            setScannerError(null);
            setIsScanModalVisible(true);
          }}
          block
          size="large"
        >
          পণ্য স্ক্যান করুন
        </Button>
      </Form.Item>

      {scannedProduct && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderColor: "#52c41a",
            backgroundColor: "#f6ffed",
          }}
        >
          <Row gutter={16}>
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
        </Card>
      )}

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

      {/* product select */}
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
              placeholder="পণ্য নির্বাচন করুন"
              showSearch
              optionFilterProp="children"
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

      {/* billing rows */}
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

  // ----------------- Final render -----------------
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
    <div style={{ padding: 24 }}>
      <style>{`
        .ant-table-thead > tr > th {
          background-color: #fafafa !important;
          font-weight: 600 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
      `}</style>

      <Card style={{ marginBottom: 20 }} bodyStyle={{ padding: "16px 24px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Input.Search
            placeholder="অর্ডার নং বা নাম দিয়ে খুঁজুন..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
            prefix={<SearchOutlined />}
          />

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

          <DatePicker
            style={{ width: 200 }}
            value={dateFilter}
            onChange={setDateFilter}
            format="YYYY-MM-DD"
            placeholder="ডেলিভারি তারিখ"
            suffixIcon={<CalendarOutlined />}
            allowClear
          />

          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <Tooltip title="রিফ্রেশ করুন">
              <Button
                icon={<SyncOutlined spin={refreshing} />}
                onClick={() => fetchOrders(true)}
                loading={refreshing}
              >
                রিফ্রেশ
              </Button>
            </Tooltip>

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
          locale={{ emptyText: "কোন অর্ডার পাওয়া যায়নি" }}
        />

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={filteredOrders.length}
            onChange={(page, pageSize) =>
              setPagination({ current: page, pageSize })
            }
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} দেখানো হচ্ছে, মোট ${total} টি`
            }
            pageSizeOptions={["10", "20", "50", "100"]}
          />
        </div>
      </Card>

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

      <QRScannerModal />
    </div>
  );
};

export default OrderEntryRefined;
