"use client";

import {
  ArrowLeftOutlined,
  PrinterOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { Alert, Button, QRCode, Spin, Watermark, message, Divider } from "antd";
import html2pdf from "html2pdf.js";
import moment from "moment";
import coreAxios from "@/utils/axiosInstance";

const Invoice = ({ params }) => {
  const [loading, setLoading] = useState(false);
  const [productOrder, setProductOrder] = useState(null);
  const { id } = params;

  const fetchInvoiceInfo = async () => {
    try {
      setLoading(true);
      const response = await coreAxios.get(`/productOrders/${id}`);
      if (response?.status === 200) {
        setProductOrder(response?.data?.data);
        setLoading(false);
      } else {
        message.error("ডেটা লোড করতে ব্যর্থ হয়েছে");
        setLoading(false);
      }
    } catch (error) {
      console.error("ইনভয়েস লোড করতে ত্রুটি:", error);
      message.error("ইনভয়েস ডেটা লোড করতে ত্রুটি হয়েছে");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoiceInfo();
    }
  }, [id]);

  const print = () => {
    // Check if window is defined (client-side)
    if (typeof window === "undefined") return;

    const printContent = document.getElementById("invoice-card");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((el) => el.outerHTML)
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>ইনভয়েস - ${productOrder?.orderNo || "N/A"}</title>
          ${styles}
          <style>
            @media print {
              body {
                padding: 0;
                margin: 0;
                background: white;
                font-size: 12px;
                width: 100%;
                height: 100vh;
              }
              .no-print {
                display: none !important;
              }
              #invoice-card {
                box-shadow: none;
                border: none;
                padding: 10px;
                margin: 0;
                width: 100%;
                min-height: 100vh;
              }
              .page-break {
                page-break-inside: avoid;
              }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div id="print-container">
            ${printContent.outerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadPDF = () => {
    // Check if window is defined (client-side)
    if (typeof window === "undefined") return;

    const element = document.getElementById("invoice-card");
    if (!element) return;

    const options = {
      margin: 0.2,
      filename: `ইনভয়েস-${productOrder?.orderNo || "N/A"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
      },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(options).save();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Watermark content="NEXA Inventory" font={{ color: "rgba(0,0,0,0.1)" }}>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <Spin size="large" tip="ইনভয়েস ডেটা লোড হচ্ছে..." />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 py-4">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Action Buttons */}
            <div className="flex gap-2 mb-4 no-print">
              <Button
                type="primary"
                onClick={downloadPDF}
                icon={<DownloadOutlined />}
                style={{
                  backgroundColor: "#16a34a",
                  borderColor: "#16a34a",
                }}
                size="middle"
              >
                পিডিএফ ডাউনলোড
              </Button>
              <Button
                type="primary"
                onClick={print}
                icon={<PrinterOutlined />}
                style={{
                  backgroundColor: "#059669",
                  borderColor: "#059669",
                }}
                size="middle"
              >
                ইনভয়েস প্রিন্ট
              </Button>
            </div>

            {/* Invoice Card - Single Page Design */}
            <div
              id="invoice-card"
              className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
              style={{
                fontSize: "14px",
                minHeight: "29.7cm", // A4 height
                margin: "0 auto",
              }}
            >
              {/* Header Section */}
              <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="h-16 w-16 bg-white rounded-lg p-1 flex items-center justify-center mr-3">
                      <div className="text-center">
                        <div className="text-green-800 font-bold text-lg">
                          NEXA
                        </div>
                        <div className="text-green-600 text-xs font-semibold">
                          Inventory
                        </div>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">NEXA Inventory</h1>
                      <p className="text-green-100 text-sm">
                        পণ্য বিক্রয় বিভাগ
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      অর্ডার নং: {productOrder?.orderNo}
                    </p>
                    <p className="text-green-100 text-sm">
                      তারিখ:{" "}
                      {moment(productOrder?.orderDate).format("DD/MM/YYYY")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Store Information */}
              <div className="bg-green-50 border-b border-green-200 p-3">
                <div className="text-center">
                  <h2 className="font-bold text-green-800 text-lg">
                    মেসার্স বন্ধু ফার্নিচার মার্ট
                  </h2>
                  <p className="text-green-700 text-sm">
                    তক্তারচালা নতুন বাজার, সখিপুর, টাংগাইল
                  </p>
                  <div className="flex justify-center gap-4 mt-1 text-xs text-green-600">
                    <span>ইমেইল: abdullahbinasad3005@gmail.com</span>
                    <span>ফোন: ০১৭৯৫৪৬৯৭৩৯</span>
                  </div>
                </div>
              </div>

              {/* Company & Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                    প্রেরক:
                  </h3>
                  <div className="bg-green-50 p-3 rounded border border-green-200 text-xs text-black">
                    <p className="font-semibold text-green-800 ">
                      NEXA Inventory
                    </p>
                    <p>তক্তারচালা নতুন বাজার</p>
                    <p>সখিপুর, টাংগাইল</p>
                    <p>ফোন: ০১৭৯৫৪৬৯৭৩৯</p>
                    <p>ইমেইল: abdullahbinasad3005@gmail.com</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                    গ্রহীতা:
                  </h3>
                  <div className="bg-green-50 p-3 rounded border border-green-200 text-xs text-black">
                    <p className="font-semibold text-green-800">
                      {productOrder?.customerName || "ওয়াক-ইন কাস্টমার"}
                    </p>
                    <p>ফোন: {productOrder?.customerPhone || "প্রযোজ্য নয়"}</p>
                    <p>
                      ঠিকানা: {productOrder?.customerAddress || "প্রযোজ্য নয়"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Details Table */}
              <div className="p-4 page-break">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                  পণ্যের বিবরণ
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-green-700 text-white">
                        <th className="p-2 text-left font-semibold border border-green-600">
                          পণ্য আইডি
                        </th>
                        <th className="p-2 text-left font-semibold border border-green-600">
                          পণ্যের নাম
                        </th>
                        <th className="p-2 text-left font-semibold border border-green-600">
                          ইউনিট মূল্য
                        </th>
                        <th className="p-2 text-left font-semibold border border-green-600">
                          পরিমাণ
                        </th>
                        <th className="p-2 text-left font-semibold border border-green-600">
                          ইউনিট
                        </th>
                        <th className="p-2 text-left font-semibold border border-green-600">
                          মোট
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-green-50 text-black">
                        <td className="p-2 border border-green-300 font-mono bg-green-50">
                          {productOrder?.productId}
                        </td>
                        <td className="p-2 border border-green-300 font-semibold bg-white">
                          {productOrder?.productName}
                        </td>
                        <td className="p-2 border border-green-300 text-right bg-green-50">
                          {formatCurrency(productOrder?.salePrice)}
                        </td>
                        <td className="p-2 border border-green-300 text-center bg-white">
                          {productOrder?.quantity}
                        </td>
                        <td className="p-2 border border-green-300 text-center uppercase bg-green-50">
                          {productOrder?.unit}
                        </td>
                        <td className="p-2 border border-green-300 text-right font-semibold bg-white">
                          {formatCurrency(productOrder?.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 border-t border-green-200">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                    পেমেন্ট তথ্য
                  </h3>
                  <div className="space-y-1 bg-white p-3 rounded border border-green-200 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-700">পেমেন্ট পদ্ধতি:</span>
                      <span className="font-semibold text-green-700">
                        {productOrder?.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">অর্ডার স্ট্যাটাস:</span>
                      <span
                        className={`font-semibold ${
                          productOrder?.status === "Completed"
                            ? "text-green-600"
                            : productOrder?.status === "Pending"
                            ? "text-orange-600"
                            : "text-gray-600"
                        }`}
                      >
                        {productOrder?.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">প্রসেসড বাই:</span>
                      <span className="font-semibold text-green-700">
                        {productOrder?.createdBy}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                    অর্থের সারাংশ
                  </h3>
                  <div className="space-y-1 bg-white p-3 rounded border border-green-200 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-700">
                        মোট Amount:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(productOrder?.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base border-t border-gray-200 pt-1 mt-1">
                      <span className="font-bold text-gray-800">
                        গ্র্যান্ড টোটাল:
                      </span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(productOrder?.grandTotal)}
                      </span>
                    </div>
                    {productOrder?.status === "Completed" && (
                      <div className="flex justify-between text-xs text-green-600 mt-1">
                        <span>পেমেন্ট স্ট্যাটাস:</span>
                        <span className="font-semibold">পরিশোধিত</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="bg-green-50 p-3 rounded border border-green-200 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-gray-700">
                        টাকার অংক:
                      </span>
                      <span className="text-green-700 font-semibold ml-2">
                        {productOrder?.grandTotal &&
                          new Intl.NumberFormat("bn-BD").format(
                            productOrder.grandTotal
                          )}{" "}
                        টাকা মাত্র
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-700">
                        স্বাক্ষর
                      </div>
                      <div className="border-t border-gray-400 mt-1 pt-1 w-24 mx-auto">
                        <div className="text-xs text-gray-500">
                          প্রস্তুতকারী
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Seal */}
              <div className="p-4 border-t border-green-200 bg-white">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-600">
                    <p>
                      ইনভয়েস জেনারেট: {moment().format("DD/MM/YYYY hh:mm A")}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    {productOrder?.status === "Completed" ||
                    productOrder?.paymentMethod === "Cash" ? (
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-green-500 flex flex-col items-center justify-center rotate-[-8deg] shadow-lg bg-green-50">
                          <span className="text-green-600 font-bold text-sm tracking-widest">
                            পরিশোধিত
                          </span>
                          <span className="text-green-500 text-xs mt-1 font-semibold">
                            {moment(productOrder?.orderDate).format("DD/MM/YY")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-400 flex flex-col items-center justify-center rotate-[-8deg] shadow-lg bg-orange-50">
                          <span className="text-orange-500 font-bold text-xs tracking-widest">
                            মুলতুবি
                          </span>
                          <span className="text-orange-400 text-xs mt-1">
                            পেমেন্ট বাকি
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-green-800 text-white p-3 mt-auto">
                <div className="text-center">
                  <p className="font-semibold mb-1 text-sm">
                    আপনার ব্যবসার জন্য ধন্যবাদ!
                  </p>
                  <p className="text-green-200 text-xs">
                    এটি একটি কম্পিউটার জেনারেটেড ইনভয়েস এবং ফিজিক্যাল সই এর
                    প্রয়োজন নেই।
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-4 text-center text-gray-600 text-sm no-print">
              <p>
                সাহায্য প্রয়োজন? সাপোর্টে যোগাযোগ করুন:
                abdullahbinasad3005@gmail.com অথবা কল করুন ০১৭৯৫৪৬৯৭৩৯
              </p>
            </div>
          </div>

          {/* Print Styles */}
          {/* <style jsx global>{`
            @media print {
              body {
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                font-size: 11px !important;
                width: 100% !important;
                height: 100vh !important;
              }
              .no-print {
                display: none !important;
              }
              #invoice-card {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 10px !important;
                width: 100% !important;
                min-height: 100vh !important;
                border-radius: 0 !important;
              }
              .bg-gradient-to-r {
                background: #059669 !important;
              }
              .container {
                max-width: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style> */}
        </div>
      )}
    </Watermark>
  );
};

export default Invoice;
