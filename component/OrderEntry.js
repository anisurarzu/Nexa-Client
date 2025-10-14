import { useState, useEffect } from "react";
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

const { Option } = Select;

// Extend Day.js with UTC and Timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

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
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedOrderForStatusUpdate, setSelectedOrderForStatusUpdate] =
    useState(null);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState(null);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

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

  const fetchProducts = async () => {
    try {
      const response = await coreAxios.get("/productsDropdown");
      if (response?.status === 200) {
        setProducts(response?.data?.products);
      }
    } catch (error) {
      message.error("Failed to fetch products. Please try again.");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [statusFilter, dateFilter]);

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

      // Calculate date range (last month from today)
      const today = dayjs();
      const firstDayOfLastMonth = today.subtract(1, "month").startOf("month");
      const lastDayOfLastMonth = today.subtract(1, "month").endOf("month");

      // Fetch orders from last month
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

      // Prepare data for Excel
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

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const wscols = [
        { wch: 12 }, // Invoice No
        { wch: 20 }, // Customer Name
        { wch: 15 }, // Customer Phone
        { wch: 20 }, // Receiver Name
        { wch: 30 }, // Receiver Address
        { wch: 15 }, // Receiver Phone
        { wch: 20 }, // Product Name
        { wch: 25 }, // Product Description
        { wch: 10 }, // Total Bill
        { wch: 10 }, // Discount
        { wch: 15 }, // Delivery Charge
        { wch: 20 }, // Add On
        { wch: 12 }, // Grand Total
        { wch: 12 }, // Amount Paid
        { wch: 12 }, // Total Due
        { wch: 15 }, // Payment Method
        { wch: 12 }, // Status
        { wch: 20 }, // Delivery Date
        { wch: 15 }, // Created By
        { wch: 15 }, // Updated By
        { wch: 30 }, // Notes
        { wch: 30 }, // Cancel Reason
      ];
      worksheet["!cols"] = wscols;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

      // Generate file name with current date
      const fileName = `Orders_${firstDayOfLastMonth.format("MMM_YYYY")}.xlsx`;

      // Export the workbook
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
        };

        let res;

        if (isEditing) {
          res = await coreAxios.put(`orders/${editingKey}`, newOrder);
          if (res?.status === 200) {
            message.success("Order updated successfully!");
            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const id = editingKey;
              const imageResponse = await coreAxios.post(
                `/image-upload/${id}`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                }
              );

              if (imageResponse.status === 200) {
                message.success("Image uploaded successfully!");
                formik?.resetForm();
              } else {
                setVisible(false);
                fetchOrders();
                message.error("Failed to upload image.");
              }
            }
            if (values.noteImageUrl) {
              const formData = new FormData();
              formData.append("noteImageUrl", values.noteImageUrl);
              const id = editingKey;
              const imageResponse = await coreAxios.post(
                `/note-image-upload/${id}`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                }
              );

              if (imageResponse.status === 200) {
                message.success("Image uploaded successfully!");
                formik?.resetForm();
              } else {
                fetchOrders();
                setVisible(false);
                message.error("Failed to upload image.");
              }
            }

            message.success("Order updated successfully!");
            fetchOrders();
          }
        } else {
          res = await coreAxios.post("orders", newOrder);
          if (res?.status === 200) {
            message.success("Order Created successfully!");
            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const id = res.data._id;
              const imageResponse = await coreAxios.post(
                `/image-upload/${id}`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                }
              );

              if (imageResponse.status === 200) {
                message.success("Image uploaded successfully!");
                formik?.resetForm();
              } else {
                fetchOrders();
                message.error("Failed to upload image.");
                setVisible(false);
              }
            }
            if (values?.noteImageUrl) {
              const formData = new FormData();
              formData.append("noteImageUrl", values.noteImageUrl);
              const id = res.data._id;
              const imageResponse = await coreAxios.post(
                `/note-image-upload/${id}`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                }
              );

              if (imageResponse.status === 200) {
                message.success("Image uploaded successfully!");
                formik?.resetForm();
              } else {
                message.error("Failed to upload image.");
                setVisible(false);
                fetchOrders;
              }
            }

            fetchOrders();
          }
        }

        resetForm();
        setVisible(false);
        setIsEditing(false);
        setEditingKey(null);
      } catch (error) {
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          setVisible(false);
          fetchOrders();
          message.error(error.response.data.error);
        } else {
          setVisible(false);
          fetchOrders();
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

  const TableSkeleton = () => (
    <Card>
      <div style={{ display: "flex", marginBottom: 16 }}>
        {Array(12)
          .fill()
          .map((_, i) => (
            <div key={i} style={{ flex: 1, padding: "0 8px" }}>
              <Skeleton.Input active style={{ width: "100%", height: 24 }} />
            </div>
          ))}
      </div>
      {Array(5)
        .fill()
        .map((_, i) => (
          <div key={i} style={{ display: "flex", marginBottom: 12 }}>
            {Array(12)
              .fill()
              .map((_, j) => (
                <div key={j} style={{ flex: 1, padding: "0 8px" }}>
                  <Skeleton.Input
                    active
                    style={{ width: "100%", height: 22 }}
                  />
                </div>
              ))}
          </div>
        ))}
    </Card>
  );

  const StatusFilterSkeleton = () => (
    <Skeleton.Input
      active
      style={{
        width: 200,
        height: 32,
        borderRadius: 6,
      }}
    />
  );

  const columns = [
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 150,
      // fixed: "left",
      render: (invoiceNo, record) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link
            target="_blank"
            href={`/dashboard/${record.invoiceNo}`}
            passHref>
            <p
              style={{
                color: "#1890ff",
                cursor: "pointer",
                marginRight: 8,
                fontWeight: 500,
              }}>
              {invoiceNo}
            </p>
          </Link>
          <Tooltip title="Click to copy">
            <CopyToClipboard
              text={invoiceNo}
              onCopy={() => message.success("Copied!")}>
              <CopyOutlined style={{ cursor: "pointer", color: "#1890ff" }} />
            </CopyToClipboard>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Add Expense",
      key: "expense",
      width: 120,
      // fixed: "left",
      render: (_, record) =>
        userInfo.pagePermissions?.[2]?.insertAccess && (
          <Button
            type="primary"
            size="small"
            onClick={() => handleExpenseClick(record.invoiceNo, record._id)}
            disabled={record?.isExpenseAdded}
            icon={<PlusOutlined />}>
            {record?.isExpenseAdded ? "Added" : "Expense"}
          </Button>
        ),
    },
    {
      title: "Customer Name",
      dataIndex: "customerName",
      key: "customerName",
      width: 150,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: "Receiver Name",
      dataIndex: "receiverName",
      key: "receiverName",
      width: 150,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      width: 150,
    },
    {
      title: "Product Image",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 120,
      render: (imageUrl) => (
        <Image
          src={
            imageUrl
              ? `data:image/jpeg;base64,${imageUrl}`
              : "https://i.ibb.co.com/fVp7LQj1/no-image-available-icon-vector.jpg"
          }
          alt="Product"
          width={40}
          height={40}
          style={{ borderRadius: "4px" }}
          preview={
            imageUrl
              ? {
                  src: `data:image/jpeg;base64,${imageUrl}`,
                }
              : false
          }
        />
      ),
    },
    {
      title: "Grand Total",
      dataIndex: "grandTotal",
      key: "grandTotal",
      width: 120,
      render: (text) => <span style={{ fontWeight: 500 }}>৳{text}</span>,
    },
    {
      title: "Total Due",
      dataIndex: "totalDue",
      key: "totalDue",
      width: 120,
      render: (text) => (
        <span
          style={{ color: text > 0 ? "#ff4d4f" : "#52c41a", fontWeight: 500 }}>
          ৳{text}
        </span>
      ),
    },

    {
      title: "Additional Req.",
      dataIndex: "addOnRequirement",
      key: "addOnRequirement",
      width: 120,
      render: (addOnRequirement) => (
        <Tag color={addOnRequirement ? "blue" : "default"}>
          {addOnRequirement ? "Yes" : "No"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status, record) => (
        <div>
          <Tag color={getStatusColor(status)} style={{ fontWeight: 500 }}>
            {status.toUpperCase()}
          </Tag>
          {record.dispatchInfo && (
            <div style={{ marginTop: 5, color: "#666", fontSize: "12px" }}>
              {record.dispatchInfo}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Delivery Date & Time",
      dataIndex: "deliveryDateTime",
      key: "deliveryDateTime",
      width: 180,
      render: (text) => (
        <div style={{ whiteSpace: "nowrap" }}>
          {formatDeliveryDateTime(text)}
        </div>
      ),
    },
    {
      title: "Action By",
      key: "actionBy",
      width: 150,
      render: (_, record) => {
        let actionBy = "";
        let actionLabel = "";

        switch (record.status.toLowerCase()) {
          case "pending":
            actionBy = record.createdBy;
            actionLabel = "Created By";
            break;
          case "on process":
            actionBy = record.updatedBy;
            actionLabel = "Updated By";
            break;
          case "dispatched":
            actionBy = record.updatedBy;
            actionLabel = "Updated By";
            break;
          case "delivered":
            actionBy = record.updatedBy;
            actionLabel = "Updated By";
            break;
          default:
            actionBy = record.updatedBy;
            actionLabel = "Updated By";
        }

        return (
          <div style={{ fontSize: "12px" }}>
            <div style={{ color: "#8c8c8c" }}>{actionLabel}</div>
            <div style={{ fontWeight: 500 }}>{actionBy}</div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      // fixed: "right",
      width: 100,
      render: (_, record) => {
        const menu = (
          <Menu>
            {record.status !== "Delivered" && (
              <>
                {userInfo.pagePermissions?.[1]?.editAccess === true && (
                  <Menu.Item
                    key="edit"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}>
                    Edit
                  </Menu.Item>
                )}
                {userInfo?.pagePermissions?.[1]?.statusUpdateAccess && (
                  <Menu.Item
                    key="updateStatus"
                    icon={<EditOutlined />}
                    onClick={() => openStatusUpdateModal(record)}>
                    Update Status
                  </Menu.Item>
                )}
              </>
            )}
            {userInfo.pagePermissions?.[1]?.editAccess === true && (
              <Menu.Item key="delete" icon={<DeleteOutlined />}>
                <Popconfirm
                  title="Are you sure you want to delete this order?"
                  onConfirm={() => handleDelete(record._id)}
                  okText="Yes"
                  cancelText="No">
                  Delete
                </Popconfirm>
              </Menu.Item>
            )}
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={["click"]}>
            <Button type="text" size="small" icon={<DownOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      {userInfo?.pagePermissions?.[1]?.viewAccess === true ? (
        <div>
          <style>{tableStyle}</style>

          <Card
            style={{ marginBottom: 20 }}
            bodyStyle={{ padding: "16px 24px" }}>
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
                {loading ? (
                  <StatusFilterSkeleton />
                ) : (
                  <Select
                    style={{ width: 200 }}
                    placeholder="Filter by Status"
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                    suffixIcon={<FilterOutlined />}>
                    <Option value={null}>All Status</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="On Process">On Process</Option>
                    <Option value="Dispatched">Dispatched</Option>
                    <Option value="Delivered">Delivered</Option>
                  </Select>
                )}

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
                    disabled={loading}>
                    Export Last Month
                  </Button>
                )}

                {/* <Button
                    icon={<SyncOutlined spin={refreshing} />}
                    onClick={handleRefresh}
                    disabled={refreshing}>
                    Refresh
                  </Button> */}

                {userInfo.pagePermissions?.[1]?.insertAccess && (
                  <Button
                    type="primary"
                    onClick={() => {
                      formik.resetForm();
                      setVisible(true);
                      setIsEditing(false);
                    }}
                    icon={<PlusOutlined />}>
                    Add Order
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            {initialLoading ? (
              <TableSkeleton />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredOrders.slice(
                  (pagination.current - 1) * pagination.pageSize,
                  pagination.current * pagination.pageSize
                )}
                rowKey="_id"
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: filteredOrders.length,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50", "100"],
                  showTotal: (total) => `Total ${total} items`,
                  onChange: (page, pageSize) => {
                    setPagination({ current: page, pageSize });
                  },
                }}
                scroll={{ x: 1500 }}
                rowClassName={rowClassName}
                loading={loading}
              />
            )}
          </Card>

          <Modal
            width={1000}
            title={isEditing ? "Edit Order" : "Create Order"}
            open={visible}
            onCancel={() => {
              setVisible(false);
              formik.resetForm();
              formik.setFieldValue("image", null);
              formik.setFieldValue("noteImageUrl", null);
            }}
            footer={null}
            destroyOnClose>
            <OrderForm
              formik={formik}
              products={products}
              handleAddNewProduct={() => setIsProductModalVisible(true)}
            />
          </Modal>

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
            }}>
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
