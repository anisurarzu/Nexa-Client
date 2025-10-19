"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  Table,
  Button,
  Select,
  DatePicker,
  Row,
  Col,
  Input,
  message,
  Pagination,
  Spin,
  Space,
  Tag,
  Modal,
  Image,
  Dropdown,
  Menu,
} from "antd";
import {
  QrcodeOutlined,
  PrinterOutlined,
  DownloadOutlined,
  FilterOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  MoreOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import QRCode from "react-qr-code";
import dayjs from "dayjs";
import coreAxios from "@/utils/axiosInstance";
import jsPDF from "jspdf";

const { Option } = Select;
const { RangePicker } = DatePicker;

const QRCodePage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
  const [filters, setFilters] = useState({
    category: "",
    dateRange: [],
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);

  const printRef = useRef();
  const userInfo =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userInfo") || "{}")
      : {};

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await coreAxios.get("products");
      if (response?.status === 200) {
        const productsData = response.data?.products || [];
        setProducts(productsData);
        setFilteredProducts(productsData);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      message.error("পণ্য লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Apply filters
  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchText) {
      filtered = filtered.filter(
        (product) =>
          product.productName
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||
          product.category?.toString().includes(searchText)
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(
        (product) => product.category === filters.category
      );
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange;
      filtered = filtered.filter((product) => {
        if (!product.createdDate) return false;
        const productDate = dayjs(product.createdDate);
        return (
          productDate.isAfter(startDate.startOf("day")) &&
          productDate.isBefore(endDate.endOf("day"))
        );
      });
    }

    setFilteredProducts(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, filters, products]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: `
      @media print {
        @page { 
          size: A4; 
          margin: 10mm; 
        }
        body { 
          -webkit-print-color-adjust: exact; 
          background: white;
        }
        .no-print { 
          display: none !important; 
        }
        .page-break { 
          page-break-after: always; 
        }
        .qr-grid { 
          gap: 5mm !important; 
        }
        .qr-item { 
          break-inside: avoid; 
          border: 1px solid #ddd !important;
        }
      }
    `,
    onAfterPrint: () => setPrintMode(false),
  });

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(
      (cat) => cat.categoryCode === categoryValue
    );
    return category ? category.categoryName : categoryValue;
  };

  // Fixed QR Data Generation - Simple and compatible format
  const generateQRData = (product) => {
    const qrData = {
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      price: product.unitPrice,
      quantity: product.qty,
    };
    return JSON.stringify(qrData);
  };

  const handleBulkPrint = () => {
    if (selectedProducts.length === 0) {
      message.warning("প্রিন্ট করার জন্য অন্তত একটি পণ্য নির্বাচন করুন।");
      return;
    }
    setPrintMode(true);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  const handleSinglePrint = (product) => {
    setSelectedProducts([product]);
    setPrintMode(true);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  // SVG to PNG conversion for download
  const svgToPng = (svg, width, height) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;

      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src =
        "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    });
  };

  // Download single QR code as PNG
  const handleDownloadQR = async (product) => {
    try {
      const svg = document.getElementById(`qr-svg-${product.productId}`);
      if (svg) {
        const svgString = new XMLSerializer().serializeToString(svg);
        const pngUrl = await svgToPng(svgString, 300, 300);

        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${product.productName}-${product.productId}.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();
        message.success("QR কোড ডাউনলোড করা হয়েছে!");
      }
    } catch (error) {
      console.error("Error downloading QR code:", error);
      message.error("QR কোড ডাউনলোড করতে সমস্যা হয়েছে!");
    }
  };

  // Download PDF with all selected QR codes
  const handleDownloadPDF = async () => {
    if (selectedProducts.length === 0) {
      message.warning("PDF ডাউনলোড করার জন্য অন্তত একটি পণ্য নির্বাচন করুন।");
      return;
    }

    setLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const qrSize = 50;
      const itemsPerRow = 3;
      const itemsPerPage = 9;
      const horizontalSpacing =
        (pageWidth - 2 * margin - itemsPerRow * qrSize) / (itemsPerRow - 1);
      const verticalSpacing = 25;

      let currentPage = 0;
      let yPosition = margin + 20;

      // Add header to first page
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("পণ্যের QR কোড", pageWidth / 2, 10, { align: "center" });

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.text(
        `তৈরির তারিখ: ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        pageWidth / 2,
        16,
        { align: "center" }
      );
      pdf.text(`মোট পণ্য: ${selectedProducts.length}টি`, pageWidth / 2, 21, {
        align: "center",
      });

      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];

        // Check if we need a new page
        if (i > 0 && i % itemsPerPage === 0) {
          pdf.addPage();
          currentPage++;
          yPosition = margin;
        }

        const row = Math.floor((i % itemsPerPage) / itemsPerRow);
        const col = (i % itemsPerPage) % itemsPerRow;

        const xPosition = margin + col * (qrSize + horizontalSpacing);
        const currentY = yPosition + row * (qrSize + verticalSpacing);

        // Generate QR code as PNG
        const svg = document.getElementById(`qr-svg-${product.productId}`);
        if (svg) {
          const svgString = new XMLSerializer().serializeToString(svg);
          const pngData = await svgToPng(svgString, 300, 300);

          // Add QR code image to PDF
          pdf.addImage(pngData, "PNG", xPosition, currentY, qrSize, qrSize);

          // Add product information below QR code
          pdf.setFontSize(8);
          pdf.setFont(undefined, "bold");

          // Product name (truncate if too long)
          const productName =
            product.productName.length > 20
              ? product.productName.substring(0, 20) + "..."
              : product.productName;
          pdf.text(productName, xPosition + qrSize / 2, currentY + qrSize + 4, {
            align: "center",
          });

          pdf.setFont(undefined, "normal");
          const categoryName = getCategoryLabel(product.category);
          const categoryText =
            categoryName.length > 15
              ? categoryName.substring(0, 15) + "..."
              : categoryName;
          pdf.text(
            categoryText,
            xPosition + qrSize / 2,
            currentY + qrSize + 8,
            { align: "center" }
          );

          pdf.text(
            `ID: ${product.productId}`,
            xPosition + qrSize / 2,
            currentY + qrSize + 12,
            { align: "center" }
          );
        }
      }

      // Save PDF
      pdf.save(`product-qr-codes-${dayjs().format("YYYY-MM-DD-HH-mm")}.pdf`);
      message.success("PDF সফলভাবে ডাউনলোড হয়েছে!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      message.error("PDF ডাউনলোড করতে সমস্যা হয়েছে!");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchText("");
    setFilters({
      category: "",
      dateRange: [],
    });
    message.success("ফিল্টার রিসেট করা হয়েছে!");
  };

  const columns = [
    {
      title: "ছবি",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (imageUrl) => (
        <Image
          src={
            imageUrl
              ? `data:image/jpeg;base64,${imageUrl}`
              : "/placeholder/40/40"
          }
          alt="Product"
          width={40}
          height={40}
          style={{ borderRadius: "4px", objectFit: "cover" }}
          fallback="/placeholder/40/40"
          preview={false}
        />
      ),
    },
    {
      title: "পণ্যের নাম",
      dataIndex: "productName",
      key: "productName",
      sorter: (a, b) =>
        (a.productName || "").localeCompare(b.productName || ""),
    },
    {
      title: "ক্যাটাগরি",
      dataIndex: "category",
      key: "category",
      render: (category) => {
        const categoryLabel = getCategoryLabel(category);
        return <Tag color="blue">{categoryLabel}</Tag>;
      },
    },
    {
      title: "পরিমাণ",
      dataIndex: "qty",
      key: "qty",
      sorter: (a, b) => (a.qty || 0) - (b.qty || 0),
      render: (qty) => (
        <Tag color={qty === 0 ? "red" : qty < 5 ? "orange" : "green"}>
          {qty || 0} পিস
        </Tag>
      ),
    },
    {
      title: "মূল্য",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (price) => `৳${(price || 0).toFixed(2)}`,
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
                  key: "preview",
                  icon: <EyeOutlined />,
                  label: "প্রিভিউ দেখুন",
                  onClick: () => {
                    setPreviewProduct(record);
                    setPreviewVisible(true);
                  },
                },
                {
                  key: "print",
                  icon: <PrinterOutlined />,
                  label: "প্রিন্ট করুন",
                  onClick: () => handleSinglePrint(record),
                },
                {
                  key: "download",
                  icon: <DownloadOutlined />,
                  label: "PNG ডাউনলোড",
                  onClick: () => handleDownloadQR(record),
                },
                {
                  key: "pdf",
                  icon: <FilePdfOutlined />,
                  label: "PDF ডাউনলোড",
                  onClick: () => handleDownloadPDF([record]),
                },
              ]}
            />
          }
          trigger={["click"]}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Print component
  const PrintQRCodes = () => (
    <div ref={printRef} className="p-6 bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-2xl font-bold">পণ্যের QR কোড</h1>
        <p className="text-gray-600">
          তৈরির তারিখ: {dayjs().format("DD/MM/YYYY HH:mm")}
        </p>
        <p className="text-gray-600">মোট পণ্য: {selectedProducts.length}টি</p>
      </div>

      <div
        className="qr-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {selectedProducts.map((product, index) => (
          <div
            key={product.productId}
            className={`qr-item p-4 border rounded-lg text-center ${
              (index + 1) % 9 === 0 ? "page-break" : ""
            }`}
            style={{
              breakInside: "avoid",
              border: "1px solid #e5e7eb",
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="mb-2 flex justify-center">
              <QRCode
                id={`qr-svg-${product.productId}`}
                value={generateQRData(product)}
                size={80}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
              />
            </div>
            <div className="mt-2 text-center">
              <p
                className="font-semibold mb-1"
                style={{ fontSize: "12px", lineHeight: "1.2" }}
              >
                {product.productName}
              </p>
              <p
                className="text-gray-600"
                style={{ fontSize: "10px", lineHeight: "1.2" }}
              >
                {getCategoryLabel(product.category)}
              </p>
              <p
                className="text-gray-500 mt-1"
                style={{ fontSize: "9px", lineHeight: "1.2" }}
              >
                ID: {product.productId}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (printMode) {
    return <PrintQRCodes />;
  }

  if (userInfo?.pagePermissions?.[4]?.viewAccess !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="text-center shadow-lg border-0 w-full max-w-md">
          <QrcodeOutlined className="text-6xl text-red-500 mb-4" />
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              QR কোড জেনারেটর
            </h1>
            <p className="text-gray-600">
              আপনার পণ্যগুলির QR কোড জেনারেট এবং প্রিন্ট করুন
            </p>
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchProducts}
              className="border-blue-500 text-blue-500"
            >
              রিফ্রেশ
            </Button>
            {selectedProducts.length > 0 && (
              <>
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={handleBulkPrint}
                  className="bg-green-600 hover:bg-green-700 border-green-600"
                >
                  প্রিন্ট ({selectedProducts.length})
                </Button>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={handleDownloadPDF}
                  className="bg-red-600 hover:bg-red-700 border-red-600"
                  loading={loading}
                >
                  PDF ({selectedProducts.length})
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* Filters */}
        <Card className="shadow-md border-0 mb-6">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={6}>
              <Input.Search
                placeholder="পণ্যের নাম বা ID দিয়ে খুঁজুন..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                enterButton={<SearchOutlined />}
                size="middle"
              />
            </Col>

            <Col xs={24} md={6}>
              <Select
                placeholder="ক্যাটাগরি নির্বাচন করুন"
                value={filters.category}
                onChange={(value) =>
                  setFilters({ ...filters, category: value })
                }
                className="w-full"
                allowClear
                size="middle"
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
            </Col>

            <Col xs={24} md={8}>
              <RangePicker
                className="w-full"
                placeholder={["শুরুর তারিখ", "শেষ তারিখ"]}
                value={filters.dateRange}
                onChange={(dates) =>
                  setFilters({ ...filters, dateRange: dates })
                }
                format="DD/MM/YYYY"
                size="middle"
              />
            </Col>

            <Col xs={24} md={4}>
              <Space className="w-full" direction="vertical">
                <Button
                  icon={<FilterOutlined />}
                  onClick={resetFilters}
                  className="w-full"
                  danger
                  size="middle"
                >
                  ফিল্টার রিসেট
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="shadow-lg border-0 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(filteredProducts);
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                    />
                    <span>নির্বাচন</span>
                  </div>
                </th>
                <th className="p-2 text-left">ছবি</th>
                <th className="p-2 text-left">পণ্যের নাম</th>
                <th className="p-2 text-left">ক্যাটাগরি</th>
                <th className="p-2 text-left">পরিমাণ</th>
                <th className="p-2 text-left">মূল্য</th>
                <th className="p-2 text-left">কর্ম</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts
                .slice(
                  (pagination.current - 1) * pagination.pageSize,
                  pagination.current * pagination.pageSize
                )
                .map((product) => (
                  <tr
                    key={product.productId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.some(
                          (p) => p.productId === product.productId
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product]);
                          } else {
                            setSelectedProducts(
                              selectedProducts.filter(
                                (p) => p.productId !== product.productId
                              )
                            );
                          }
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <Image
                        src={
                          product.imageUrl
                            ? `data:image/jpeg;base64,${product.imageUrl}`
                            : "/placeholder/40/40"
                        }
                        alt="Product"
                        width={40}
                        height={40}
                        style={{ borderRadius: "4px", objectFit: "cover" }}
                        fallback="/placeholder/40/40"
                        preview={false}
                      />
                    </td>
                    <td className="p-2">{product.productName}</td>
                    <td className="p-2">
                      <Tag color="blue">
                        {getCategoryLabel(product.category)}
                      </Tag>
                    </td>
                    <td className="p-2">
                      <Tag
                        color={
                          product.qty === 0
                            ? "red"
                            : product.qty < 5
                            ? "orange"
                            : "green"
                        }
                      >
                        {product.qty || 0} পিস
                      </Tag>
                    </td>
                    <td className="p-2">
                      ৳{(product.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-2">
                      <Dropdown
                        overlay={
                          <Menu
                            items={[
                              {
                                key: "preview",
                                icon: <EyeOutlined />,
                                label: "প্রিভিউ দেখুন",
                                onClick: () => {
                                  setPreviewProduct(product);
                                  setPreviewVisible(true);
                                },
                              },
                              {
                                key: "print",
                                icon: <PrinterOutlined />,
                                label: "প্রিন্ট করুন",
                                onClick: () => handleSinglePrint(product),
                              },
                              {
                                key: "download",
                                icon: <DownloadOutlined />,
                                label: "PNG ডাউনলোড",
                                onClick: () => handleDownloadQR(product),
                              },
                              {
                                key: "pdf",
                                icon: <FilePdfOutlined />,
                                label: "PDF ডাউনলোড",
                                onClick: () => handleDownloadPDF([product]),
                              },
                            ]}
                          />
                        }
                        trigger={["click"]}
                      >
                        <Button
                          type="text"
                          icon={<MoreOutlined />}
                          size="small"
                        />
                      </Dropdown>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center mt-4">
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={filteredProducts.length}
            onChange={(page, pageSize) =>
              setPagination({
                current: page,
                pageSize: pageSize || pagination.pageSize,
              })
            }
            showSizeChanger
            pageSizeOptions={["12", "24", "48", "96"]}
            showTotal={(total, range) =>
              `মোট ${total}টি পণ্যের মধ্যে ${range[0]}-${range[1]}টি দেখানো হচ্ছে`
            }
          />
        </div>
      </Card>

      {/* QR Code Preview Modal */}
      <Modal
        title="QR কোড প্রিভিউ"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button
            key="download"
            onClick={() => handleDownloadQR(previewProduct)}
          >
            <DownloadOutlined /> PNG ডাউনলোড
          </Button>,
          <Button
            key="pdf"
            onClick={() => {
              handleDownloadPDF([previewProduct]);
              setPreviewVisible(false);
            }}
          >
            <FilePdfOutlined /> PDF ডাউনলোড
          </Button>,
          <Button
            key="print"
            type="primary"
            onClick={() => {
              handleSinglePrint(previewProduct);
              setPreviewVisible(false);
            }}
          >
            <PrinterOutlined /> প্রিন্ট
          </Button>,
        ]}
        width={400}
        centered
      >
        {previewProduct && (
          <div className="text-center p-4">
            <div className="mb-4 flex justify-center">
              <QRCode
                id={`qr-svg-preview-${previewProduct.productId}`}
                value={generateQRData(previewProduct)}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-lg mb-1">
                {previewProduct.productName}
              </h3>
              <p className="text-gray-600 mb-1">
                {getCategoryLabel(previewProduct.category)}
              </p>
              <p className="text-gray-500 text-sm">
                পণ্য ID: {previewProduct.productId}
              </p>
              <p className="text-gray-500 text-sm">
                পরিমাণ: {previewProduct.qty || 0} পিস
              </p>
              <p className="text-gray-500 text-sm">
                মূল্য: ৳{(previewProduct.unitPrice || 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Actions */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 no-print">
          <Card className="shadow-2xl border-0" bodyStyle={{ padding: "12px" }}>
            <Space direction="vertical">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">
                  {selectedProducts.length}টি পণ্য নির্বাচিত
                </div>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={handleBulkPrint}
                  size="small"
                  className="bg-green-600 hover:bg-green-700"
                >
                  প্রিন্ট
                </Button>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={handleDownloadPDF}
                  size="small"
                  className="bg-red-600 hover:bg-red-700"
                  loading={loading}
                >
                  PDF
                </Button>
                <Button
                  onClick={() => setSelectedProducts([])}
                  size="small"
                  danger
                >
                  বাতিল
                </Button>
              </Space>
            </Space>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QRCodePage;
