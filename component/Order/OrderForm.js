import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Radio,
  DatePicker,
  Button,
  Image,
  Row,
  Col,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import coreAxios from "@/utils/axiosInstance";
import dayjs from "dayjs"; // Import dayjs for date handling

const { Option } = Select;
const { TextArea } = Input;

const OrderForm = ({ formik, products, handleAddNewProduct }) => {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productName: "",
    category: "",
    image: null,
  });

  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalDue, setTotalDue] = useState(0);

  // State for controlling file lists in Upload components
  const [productImageFileList, setProductImageFileList] = useState([]);
  const [noteImageFileList, setNoteImageFileList] = useState([]);

  // Function to fetch invoice data by invoice number
  const fetchInvoiceData = async (invoiceNo) => {
    try {
      const response = await coreAxios.get(
        `/getOrdersByInvoiceNo/${invoiceNo}`
      ); // Replace with your API endpoint
      const invoiceData = response.data?.[0];

      // Convert deliveryDateTime string to a dayjs object
      const deliveryDateTime = dayjs(invoiceData.deliveryDateTime);

      // Auto-fill form fields with the fetched data
      formik.setValues({
        ...formik.values,
        prevInvoiceNo: invoiceNo,
        customerName: invoiceData.customerName,
        customerInformation: invoiceData.customerInformation,
        receiverName: invoiceData.receiverName,
        receiverAddress: invoiceData.receiverAddress,
        receiverPhoneNumber: invoiceData.receiverPhoneNumber,
        totalBill: 0,
        deliveryCharge: 0,
        paymentMethod: invoiceData.paymentMethod,
        discount: 0,
        amountPaid: 0,
        notePrice: 0,
        grandTotal: 0,
        deliveryDateTime: deliveryDateTime, // Use the dayjs object here
      });

      message.success("Invoice data loaded successfully!");
    } catch (error) {
      message.error(
        "Failed to fetch invoice data. Please check the invoice number."
      );
      console.error("Error fetching invoice data:", error);
    }
  };

  useEffect(() => {
    if (!formik.values.image) {
      setProductImageFileList([]); // Clear product image file list
    }
    if (!formik.values.noteImageUrl) {
      setNoteImageFileList([]); // Clear note image file list
    }
  }, [formik.values.image, formik.values.noteImageUrl]);

  // Calculate total, grandTotal, and totalDue
  useEffect(() => {
    const totalBill = parseFloat(formik.values.totalBill) || 0;
    const deliveryCharge = parseFloat(formik.values.deliveryCharge) || 0;
    const addOnPrice = parseFloat(formik.values.addOnPrice) || 0;
    const notePrice = parseFloat(formik.values.notePrice) || 0;

    const calculatedTotal = totalBill + deliveryCharge + addOnPrice + notePrice;
    const discount = parseFloat(formik.values.discount) || 0;
    const calculatedGrandTotal = calculatedTotal - discount;

    setTotal(calculatedTotal);
    setGrandTotal(calculatedGrandTotal);

    const amountPaid = parseFloat(formik.values.amountPaid) || 0;
    const calculatedTotalDue = calculatedGrandTotal - amountPaid;
    setTotalDue(calculatedTotalDue);

    formik.setFieldValue("total", calculatedTotal);
    formik.setFieldValue("grandTotal", calculatedGrandTotal);
    formik.setFieldValue("totalDue", calculatedTotalDue);
  }, [
    formik.values.totalBill,
    formik.values.deliveryCharge,
    formik.values.addOnPrice,
    formik.values.notePrice,
    formik.values.discount,
    formik.values.amountPaid,
  ]);

  // Handle adding a new product
  const handleAddProductClick = () => {
    setIsAddingProduct(true);
  };

  // Handle saving the new product
  const handleSaveNewProduct = () => {
    setIsAddingProduct(false);
    setNewProduct({ productName: "", category: "", image: null });
  };

  // Handle image upload for note image
  const handleNoteImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      formik.setFieldValue("noteImage", e.target.result);
    };
    reader.readAsDataURL(file);
    return false;
  };

  // Check if prevInvoiceNo is available
  const isPrevInvoiceNoAvailable = !!formik.values.prevInvoiceNo;

  return (
    <Form onFinish={formik.handleSubmit} layout="vertical">
      {/* Prev Invoice No. Field */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Prev Invoice No.">
            <Input
              name="prevInvoiceNo"
              placeholder="Enter previous invoice number"
              value={formik.values.prevInvoiceNo} // Bind to Formik's state
              onChange={(e) => {
                formik.handleChange(e); // Update Formik's state
                fetchInvoiceData(e.target.value); // Fetch data when a valid invoice number is entered
              }}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Customer Info Fields */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Customer Name">
            <Input
              name="customerName"
              value={formik.values.customerName}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Customer Information">
            <Input
              name="customerInformation"
              value={formik.values.customerInformation}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Receiver Name">
            <Input
              name="receiverName"
              value={formik.values.receiverName}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Receiver Address">
            <Input
              name="receiverAddress"
              value={formik.values.receiverAddress}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Receiver Phone Number">
            <Input
              name="receiverPhoneNumber"
              value={formik.values.receiverPhoneNumber}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Product Fields */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Product Name">
            <Input
              name="productName"
              value={formik.values.productName}
              onChange={formik.handleChange}
              disabled={false} // Always enabled
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Description">
            <Input
              name="productDescription"
              value={formik.values.productDescription}
              onChange={formik.handleChange}
              disabled={false} // Always enabled
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Image">
            <Upload
              name="image"
              listType="picture"
              fileList={productImageFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => {
                setProductImageFileList(fileList);
                formik.setFieldValue("image", fileList[0]?.originFileObj);
              }}
              disabled={false} // Always enabled
            >
              <Button icon={<UploadOutlined />}>Upload</Button>
            </Upload>
            {formik.values.imageUrl && (
              <Image
                src={`data:image/jpeg;base64,${formik.values.imageUrl}`}
                alt="Uploaded Image"
                width={100}
                height={100}
                style={{ marginTop: 10 }}
              />
            )}
          </Form.Item>
        </Col>
      </Row>

      {/* Additional Fields */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Bouquet Price">
            <Input
              name="totalBill"
              value={formik.values.totalBill}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Delivery Charge">
            <Input
              name="deliveryCharge"
              value={formik.values.deliveryCharge}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Additional Requirement">
            <Radio.Group
              name="addOnRequirement"
              value={formik.values.addOnRequirement}
              onChange={(e) =>
                formik.setFieldValue("addOnRequirement", e.target.value)
              }
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            >
              <Radio value={true}>Yes</Radio>
              <Radio value={false}>No</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      {formik.values.addOnRequirement && (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Additional Req. Name ">
              <Input
                name="addOnType"
                value={formik.values.addOnType}
                onChange={formik.handleChange}
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Additional Price">
              <Input
                name="addOnPrice"
                value={formik.values.addOnPrice}
                onChange={formik.handleChange}
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Note">
              <Radio.Group
                name="note"
                value={formik.values.note}
                onChange={(e) => formik.setFieldValue("note", e.target.value)}
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              >
                <Radio value={true}>Yes</Radio>
                <Radio value={false}>No</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      )}

      {formik.values.note && (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Note Text">
              <TextArea
                name="noteText"
                value={formik.values.noteText}
                onChange={formik.handleChange}
                placeholder="Enter note text"
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Note Price">
              <Input
                name="notePrice"
                value={formik.values.notePrice}
                onChange={formik.handleChange}
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Note Image">
              <Upload
                name="noteImageUrl"
                listType="picture"
                fileList={noteImageFileList}
                beforeUpload={() => false}
                onChange={({ fileList }) => {
                  setNoteImageFileList(fileList);
                  formik.setFieldValue(
                    "noteImageUrl",
                    fileList[0]?.originFileObj
                  );
                }}
                disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
              >
                <Button icon={<UploadOutlined />}>Upload</Button>
              </Upload>
              {formik.values.noteImageUrl && (
                <Image
                  src={`data:image/jpeg;base64,${formik.values.noteImageUrl}`}
                  alt="Uploaded Image"
                  width={100}
                  height={100}
                  style={{ marginTop: 10 }}
                />
              )}
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Total, Grand Total, Amount Paid, Total Due */}
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Payment Method">
            <Select
              name="paymentMethod"
              value={formik.values.paymentMethod}
              onChange={(value) => formik.setFieldValue("paymentMethod", value)}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            >
              <Option value="Cash on Delivery">Cash on Delivery</Option>
              <Option value="Partially Paid">Partially Paid</Option>
              <Option value="Fully Paid">Fully Paid</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Discount">
            <Input
              name="discount"
              value={formik.values.discount}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Total">
            <Input name="total" value={total} disabled />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Amount Paid">
            <Input
              name="amountPaid"
              value={formik.values.amountPaid}
              onChange={formik.handleChange}
              disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Grand Total">
            <Input name="grandTotal" value={grandTotal} disabled />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Total Due">
            <Input name="totalDue" value={totalDue} disabled />
          </Form.Item>
        </Col>
      </Row>

      {/* Delivery Date & Time */}
      <Form.Item label="Delivery Date & Time">
        <DatePicker
          showTime={{
            format: "HH:mm",
          }}
          format="YYYY-MM-DD HH:mm"
          value={formik.values.deliveryDateTime}
          onChange={(value) => formik.setFieldValue("deliveryDateTime", value)}
          disabled={isPrevInvoiceNoAvailable} // Disable if prevInvoiceNo is available
        />
      </Form.Item>

      {/* Submit Button */}
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className="bg-[#8ABF55] hover:bg-[#7DA54E] text-white">
          {formik.isEditing ? "Update" : "Create"}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default OrderForm;
