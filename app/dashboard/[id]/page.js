"use client";

import { PrinterOutlined, DownloadOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { Alert, Button, Spin, message } from "antd";
import coreAxios from "@/utils/axiosInstance";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Image } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const OrderInvoice = ({ params }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const { id } = params;

  const fetchOrderInfo = async () => {
    try {
      setLoading(true);
      const response = await coreAxios.get(`/getOrdersByInvoiceNo/${id}`);
      if (response?.status === 200) {
        setData(response.data);
        setLoading(false);
      } else {
        message.error("Failed to load data");
        setLoading(false);
      }
    } catch (error) {
      message.error("Error fetching data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderInfo();
  }, [id]);

  const print = () => {
    window.print();
  };

  const downloadPDF = async () => {
    const element = document.getElementById("invoice-card");
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`Order-Invoice-${id}.pdf`);
  };

  // Merge product details from all orders
  const mergedProducts = data.flatMap((order) => ({
    productName: order.productName,
    addOnType: order.addOnType,
    productDescription: order.productDescription,
    totalBill: order.totalBill,
    imageUrl: order.imageUrl,
  }));

  // Merge calculations
  const totalBill = data.reduce(
    (sum, order) => sum + (order.totalBill || 0),
    0
  );
  const deliveryCharge = data.reduce(
    (sum, order) => sum + (order.deliveryCharge || 0),
    0
  );
  const addOnPrice = data.reduce(
    (sum, order) => sum + (order.addOnPrice || 0),
    0
  );
  const notePrice = data.reduce(
    (sum, order) => sum + (order.notePrice || 0),
    0
  );
  const grandTotal = data.reduce(
    (sum, order) => sum + (order.grandTotal || 0),
    0
  );
  const amountPaid = data.reduce(
    (sum, order) => sum + (order.amountPaid || 0),
    0
  );
  const totalDue = data.reduce((sum, order) => sum + (order.totalDue || 0), 0);

  return (
    <div>
      {loading ? (
        <Spin tip="Loading...">
          <Alert
            message="Loading Order Details"
            description="Please wait while we fetch the order information."
            type="info"
          />
        </Spin>
      ) : (
        <div>
          <div className="mx-28">
            <div className="flex gap-8 w-full mt-8 mx-0">
              <Button
                type="primary"
                onClick={print}
                className="p-mb-3 hide-print-button"
                icon={<PrinterOutlined />}>
                Print
              </Button>
              <Button
                type="primary"
                onClick={downloadPDF}
                className="p-mb-3 hide-print-button"
                icon={<DownloadOutlined />}>
                Download PDF
              </Button>
            </div>
          </div>

          <div
            id="invoice-card"
            className="bg-white p-4 w-full mt-4"
            style={{ fontSize: "12px" }}>
            {/* Logo at the Top */}
            <div className="flex justify-between">
              <div>
                <div className="flex justify-center mb-1">
                  <img
                    src="https://i.ibb.co.com/Zz3RL25Q/Whats-App-Image-2025-03-01-at-16-18-20.jpg"
                    alt="Company Logo"
                    width={150}
                    height={80}
                    className="rounded-lg"
                  />
                </div>
                <h4 className="text-lg font-bold my-3 text-gray-900">
                  Flowers Pick
                </h4>
                <div className="grid grid-cols-2 gap-8 mt-1">
                  <div>
                    <p className="text-gray-600">Bill To:</p>
                    <p className="text-gray-600 font-bold">
                      {data[0]?.customerName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ship To:</p>
                    <p className="text-gray-600 font-bold">
                      {data[0]?.receiverAddress || "N/A"}
                    </p>
                    <p className="text-gray-900 font-bold mt-4">
                      {data[0]?.receiverPhoneNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-right">
                  <h4 className="text-black text-2xl">INVOICE</h4>
                  <h3 className="font-bold text-gray-600">
                    #{data[0]?.orderNo || "N/A"}
                  </h3>

                  <div className="grid grid-cols-2 gap-8 mt-8">
                    <p className="text-gray-600">Date:</p>
                    <p className="text-gray-600">
                      {data[0]?.issueDate
                        ? dayjs(data[0].issueDate)
                            .tz("Asia/Dhaka")
                            .format("MMM D YYYY, hh:mm A")
                        : "N/A"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mt-2">
                    <p className="text-gray-600">Payment Terms:</p>
                    <p className="text-gray-600">
                      {data[0]?.paymentMethod || "N/A"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mt-2">
                    <p className="text-gray-600">Order Date:</p>
                    <p className="text-gray-600">
                      {data[0]?.issueDate
                        ? dayjs(data[0].issueDate)
                            .tz("Asia/Dhaka")
                            .format("MMM D YYYY, hh:mm A")
                        : "N/A"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mt-2">
                    <p className="text-gray-600">Balance Due:</p>
                    <p className="text-gray-600 font-bold">BDT {totalDue}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details Table */}
            <div className="mt-8 text-black">
              <p className="font-bold text-md">Order Details:</p>
              <table
                className="table-auto w-full border-collapse border border-gray-400 mt-4 text-left text-xs"
                style={{ fontSize: "10px" }}>
                <thead>
                  <tr
                    className="bg-black text-white print:!bg-black print:!text-white"
                    style={{
                      WebkitPrintColorAdjust: "exact",
                      colorAdjust: "exact",
                    }}>
                    <th className="border border-gray-400 px-2 pb-2">Image</th>
                    <th className="border border-gray-400 px-2 pb-2">
                      Product Name
                    </th>
                    <th className="border border-gray-400 px-2 pb-2">
                     Additional Requirement
                    </th>
                    <th className="border border-gray-400 px-2 pb-2">Qty</th>
                    <th className="border border-gray-400 px-2 pb-2">Rate</th>
                    <th className="border border-gray-400 px-2 pb-2">
                      Bouquet Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mergedProducts.map((product, index) => (
                    <tr key={index}>
                      <td className="border border-gray-400 px-2">
                        <Image
                          src={
                            product.imageUrl
                              ? `data:image/jpeg;base64,${product.imageUrl}`
                              : ""
                          }
                          alt="Profile"
                          width={40}
                          height={40}
                          style={{ borderRadius: "50%" }}
                        />
                      </td>
                      <td className="border border-gray-400 px-2 pb-2">
                        {product.productName || "N/A"}
                      </td>
                      <td className="border border-gray-400 px-2 pb-2">
                        {product.addOnType || "N/A"}
                      </td>
                      <td className="border border-gray-400 px-2 pb-2">1</td>
                      <td className="border border-gray-400 px-2 pb-2">
                        {product.totalBill || "N/A"}
                      </td>
                      <td className="border border-gray-400 px-2 pb-2">
                        {product.totalBill || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Merged Calculations */}
            <div className="flex justify-end">
              <div>
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <p className="text-gray-600">Sub Total:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {totalBill}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2">
                  <p className="text-gray-600">Note:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {notePrice}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2">
                  <p className="text-gray-600">Shipping:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {deliveryCharge}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2">
                  <p className="text-gray-600">Add on:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {addOnPrice}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2">
                  <p className="text-gray-600">Total:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {grandTotal}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2">
                  <p className="text-gray-600">Amount Paid:</p>
                  <p className="text-gray-600 font-bold text-right">
                    BDT {amountPaid}
                  </p>
                </div>
              </div>
            </div>

            {/* Show "Attached" if notes are available */}
            {data.length > 0 && (
              <div className="mt-4 text-black">
                <p className="font-bold text-md">Notes:</p>
                <div className="flex flex-wrap gap-4">
                  {data.map((note, index) => (
                    <div key={index} className="flex flex-col items-center">
                      {note.noteImageUrl && (
                        <Image
                          src={`data:image/jpeg;base64,${note.noteImageUrl}`}
                          alt={`Note Image ${index + 1}`}
                          width={70}
                          height={60}
                          style={{ borderRadius: "20%" }}
                        />
                      )}
                      {note.noteText && (
                        <p className="mt-2 text-center">{`"${note.noteText}"`}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="mt-8 text-black">
              <p className="font-bold text-md">Terms and Conditions:</p>
              <ol className="list-decimal pl-5">
                <li>Order 3 hours before the delivery time</li>
                <li>Pay some advance to confirm the order</li>
                <li>
                  No refund will be given if the order is cancelled after the
                  making
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderInvoice;
