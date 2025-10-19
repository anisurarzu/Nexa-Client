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
} from "antd";
import { QrcodeOutlined, LoadingOutlined } from "@ant-design/icons";
import { Html5Qrcode } from "html5-qrcode";
import coreAxios from "@/utils/axiosInstance";

const { Title, Text } = Typography;

const ProductQRScanner = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef(null);
  const scannerId = "product-qr-reader";

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
        // Stop scanner
        await scannerRef.current.stop();
        setScanning(false);

        // Process the scanned product ID
        const productId = parseQRCode(decodedText);
        if (productId) {
          const details = await fetchProductDetails(productId);
          if (details) {
            setProductDetails(details);
            setStep(2);
            message.success("পণ্য আইডি সফলভাবে স্ক্যান করা হয়েছে!");
          }
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

  // Parse QR code data to extract product ID
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
      const parsedId = parseInt(qrData);
      return isNaN(parsedId) ? null : parsedId;
    }
  };

  const fetchProductDetails = async (productId) => {
    setLoading(true);
    try {
      const response = await coreAxios.get(`/products/${productId}`);
      const productData = response.data;

      if (productData) {
        return {
          productId: productData.productId,
          productName: productData.productName,
          description: productData.description,
          category: productData.category,
          unitPrice: productData.unitPrice,
          stockQuantity: productData.stockQuantity,
          status: productData.status,
          image: productData.image,
          createdAt: productData.createdAt,
          updatedAt: productData.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching product details:", error);
      message.error("পণ্যের তথ্য পাওয়া যায়নি। আইডি চেক করুন।");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleProductIDSubmit = async (values) => {
    try {
      const productId = parseQRCode(values.productID);
      if (productId) {
        const details = await fetchProductDetails(productId);
        if (details) {
          setProductDetails(details);
          setStep(2);
        }
      } else {
        message.error("অবৈধ পণ্য আইডি ফরম্যাট!");
      }
    } catch (error) {
      console.error("Error processing product details:", error);
    }
  };

  const resetForm = () => {
    setProductDetails(null);
    setStep(1);
  };

  const startQRScanner = () => {
    setScanning(true);
    setCameraError(false);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      active: "green",
      inactive: "red",
      outofstock: "orange",
      discontinued: "gray",
    };
    return statusColors[status?.toLowerCase()] || "default";
  };

  const getStatusText = (status) => {
    const statusTexts = {
      active: "সক্রিয়",
      inactive: "নিষ্ক্রিয়",
      outofstock: "স্টক নেই",
      discontinued: "বন্ধ",
    };
    return statusTexts[status?.toLowerCase()] || status;
  };

  return (
    <div className="min-h-screen bg-blue-50 py-8 px-4 pt-20">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-blue-200">
          <Title level={3} className="text-center mb-6 text-blue-800">
            পণ্য তথ্য স্ক্যানার
          </Title>

          <Alert
            message="📌 কিভাবে স্ক্যান করবেন"
            description={
              <div className="text-blue-700">
                <p className="mb-2">
                  পণ্যের QR কোড স্ক্যান করে দ্রুত তথ্য দেখুন:
                </p>
                <ul className="pl-5 space-y-1">
                  <li>
                    <span className="font-bold">*</span> পণ্যের QR কোড ক্যামেরার
                    সামনে ধরুন
                  </li>
                  <li>
                    <span className="font-bold">*</span> অটোমেটিক স্ক্যান হবে
                    এবং পণ্যের তথ্য দেখাবে
                  </li>
                  <li>
                    <span className="font-bold">*</span> ম্যানুয়ালি পণ্য আইডি
                    দিয়েও খুঁজতে পারেন
                  </li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            className="mb-6 border-blue-300 bg-blue-50"
          />

          {scanning && (
            <div className="mb-6">
              <p className="text-center font-semibold text-blue-700 mb-2">
                পণ্যের QR কোড স্ক্যান করুন
              </p>
              {cameraError ? (
                <div className="text-center p-4 border rounded bg-gray-50">
                  <p className="text-red-500 mb-2">
                    ক্যামেরা অ্যাক্সেস ব্যর্থ হয়েছে
                  </p>
                  <Button
                    type="primary"
                    onClick={() => {
                      setCameraError(false);
                      setScanning(true);
                    }}
                  >
                    ক্যামেরা অ্যাক্সেস পুনরায় চেষ্টা করুন
                  </Button>
                </div>
              ) : (
                <div className="w-full h-[250px] border rounded bg-gray-50 flex items-center justify-center">
                  <div id={scannerId} className="w-full h-full" />
                </div>
              )}
              <div className="text-center mt-4">
                <Button onClick={() => setScanning(false)}>
                  স্ক্যান বাতিল করুন
                </Button>
              </div>
            </div>
          )}

          {!scanning && step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Button
                  type="primary"
                  size="large"
                  icon={<QrcodeOutlined />}
                  onClick={startQRScanner}
                  className="bg-blue-600 hover:bg-blue-700 border-blue-700 mb-4"
                  style={{ height: "50px", fontSize: "16px" }}
                >
                  📱 QR কোড স্ক্যান করুন
                </Button>
                <div className="text-gray-600 text-sm">
                  অথবা ম্যানুয়ালি পণ্য আইডি লিখুন
                </div>
              </div>

              <Divider>অথবা</Divider>

              <div className="mb-6">
                <label
                  htmlFor="productID"
                  className="block text-sm font-medium text-blue-700 mb-2"
                >
                  পণ্য আইডি লিখুন
                </label>
                <Input
                  placeholder="যেমন: 12345 বা productId:12345"
                  size="large"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleProductIDSubmit({ productID: e.target.value });
                    }
                  }}
                  className="border-blue-300"
                />
                <div className="text-gray-500 text-sm mt-1">
                  পণ্য আইডি, JSON ডাটা, বা productId:12345 ফরম্যাটে লিখুন
                </div>
              </div>
            </div>
          )}

          {!scanning && step === 2 && productDetails && (
            <div>
              {loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <>
                  <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
                    <Row gutter={16} align="middle" className="mb-4">
                      <Col>
                        {productDetails.image && (
                          <Image
                            src={productDetails.image}
                            alt={productDetails.productName}
                            className="w-20 h-20 rounded-lg object-cover"
                            preview={false}
                          />
                        )}
                      </Col>
                      <Col flex={1}>
                        <Title level={4} className="mb-0 text-blue-800">
                          {productDetails.productName}
                        </Title>
                        <Text className="text-blue-600">
                          পণ্য আইডি: {productDetails.productId}
                        </Text>
                      </Col>
                      <Col>
                        <Tag color={getStatusColor(productDetails.status)}>
                          {getStatusText(productDetails.status)}
                        </Tag>
                      </Col>
                    </Row>

                    <Descriptions
                      bordered
                      column={1}
                      size="small"
                      className="mb-4"
                    >
                      <Descriptions.Item label="পণ্যের নাম">
                        {productDetails.productName}
                      </Descriptions.Item>
                      <Descriptions.Item label="বর্ণনা">
                        {productDetails.description || "কোন বর্ণনা নেই"}
                      </Descriptions.Item>
                      <Descriptions.Item label="ক্যাটাগরি">
                        {productDetails.category}
                      </Descriptions.Item>
                      <Descriptions.Item label="ইউনিট প্রাইস">
                        <span className="font-semibold text-green-600">
                          ৳{productDetails.unitPrice}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="স্টক পরিমাণ">
                        <span
                          className={
                            productDetails.stockQuantity > 0
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {productDetails.stockQuantity} পিস
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="স্ট্যাটাস">
                        <Tag color={getStatusColor(productDetails.status)}>
                          {getStatusText(productDetails.status)}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>

                    {productDetails.stockQuantity === 0 && (
                      <Alert
                        message="স্টক নেই"
                        description="এই পণ্যটির বর্তমানে কোন স্টক নেই।"
                        type="warning"
                        showIcon
                        className="mb-4"
                      />
                    )}

                    <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                      <Text strong className="text-blue-700">
                        পণ্য স্ক্যান সফল হয়েছে
                      </Text>
                      <p className="text-lg font-bold text-blue-700 my-2">
                        {productDetails.productName}
                      </p>
                      <Text className="text-blue-600">
                        পণ্যের সকল তথ্য উপরে দেখানো হয়েছে
                      </Text>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      type="primary"
                      size="large"
                      className="bg-blue-600 hover:bg-blue-700 border-blue-700"
                      onClick={resetForm}
                    >
                      নতুন পণ্য স্ক্যান করুন
                    </Button>
                    <Button
                      onClick={resetForm}
                      size="large"
                      className="ml-4 border-blue-500 text-blue-700 hover:border-blue-700"
                    >
                      পিছনে
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProductQRScanner;
