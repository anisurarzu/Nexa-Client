"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Modal,
  Table,
  message,
  Popconfirm,
  Pagination,
  Form,
  Input,
  Dropdown,
  Menu,
  Tooltip,
  Card,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  CopyOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useFormik } from "formik";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import coreAxios from "@/utils/axiosInstance";
import CopyToClipboard from "react-copy-to-clipboard";
import Link from "next/link";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

const ExpenseInfo = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [invoiceInfo, setInvoiceInfo] = useState({});
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalCashInHand: 0,
    averageCost: 0,
  });
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  const fetchExpense = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await coreAxios.get("expense");
      if (response?.status === 200) {
        setExpenses(response.data?.expenses);
        setFilteredExpenses(response.data?.expenses);
        calculateStats(response.data?.expenses);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch expenses. Please try again.";
      message.error(errorMessage);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const calculateStats = (expenses) => {
    const totalExpenses = expenses.reduce(
      (sum, item) => sum + Number(item.totalCost),
      0
    );
    const totalCashInHand = expenses.reduce(
      (sum, item) => sum + Number(item.cashInHand),
      0
    );
    const averageCost =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;

    setStats({
      totalExpenses,
      totalCashInHand,
      averageCost,
    });
  };

  useEffect(() => {
    fetchExpense();
  }, []);

  const fetchGrandTotal = async (invoiceNo) => {
    try {
      const response = await coreAxios.get(`/getOrderInfo/${invoiceNo}`);
      if (response?.status === 200) {
        setInvoiceInfo(response?.data);
        return response.data.grandTotal;
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to fetch invoice info. Please check the invoice number.";
      message.error(errorMessage);
      return null;
    }
  };

  const calculateTotalCost = (values) => {
    const { flowerCost, deliveryCost, additionalCost } = values;
    return Number(flowerCost) + Number(deliveryCost) + Number(additionalCost);
  };

  const calculateCashInHand = (grandTotal, totalCost) => {
    return Number(grandTotal) - Number(totalCost);
  };

  const formatCurrency = (value) => {
    return (
      new Intl.NumberFormat("en-BD", {
        minimumFractionDigits: 2,
      }).format(value) + " ৳"
    );
  };

  const formik = useFormik({
    initialValues: {
      invoiceNo: "",
      grandTotal: 0,
      flowerCost: 0,
      deliveryCost: 0,
      additionalCost: 0,
      totalCost: 0,
      cashInHand: 0,
      createdBy: userInfo?.loginID,
      createdDate: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      invoiceId: "",
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        const totalCost = calculateTotalCost(values);
        const cashInHand = calculateCashInHand(values.grandTotal, totalCost);
        const newExpense = {
          ...values,
          totalCost,
          cashInHand,
          invoiceId: invoiceInfo?._id,
        };

        let res;
        if (isEditing) {
          res = await coreAxios.put(`expense/${editingKey}`, newExpense);
        } else {
          res = await coreAxios.post("expense", newExpense);
        }

        if (res?.status === 200) {
          message.success(isEditing ? "Expense updated!" : "Expense added!");
          fetchExpense();
          resetForm();
          setVisible(false);
          setIsEditing(false);
          setEditingKey(null);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          "Failed to save expense. Please try again.";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleFieldChange = async (fieldName, value) => {
    await formik.setFieldValue(fieldName, value);
    const latestValues = { ...formik.values, [fieldName]: value };

    if (fieldName === "invoiceNo") {
      const grandTotal = await fetchGrandTotal(value);
      if (grandTotal !== null) {
        await formik.setFieldValue("grandTotal", grandTotal);
        latestValues.grandTotal = grandTotal;
      }
    }

    const totalCost = calculateTotalCost(latestValues);
    await formik.setFieldValue("totalCost", totalCost);

    const cashInHand = calculateCashInHand(latestValues.grandTotal, totalCost);
    await formik.setFieldValue("cashInHand", cashInHand);
  };

  const handleEdit = (record) => {
    setEditingKey(record._id);
    formik.setValues({
      invoiceNo: record.invoiceNo,
      grandTotal: record.grandTotal,
      flowerCost: record.flowerCost,
      deliveryCost: record.deliveryCost,
      additionalCost: record.additionalCost,
      totalCost: record.totalCost,
      cashInHand: record.cashInHand,
      createdBy: record.createdBy,
      createdDate: record.createdDate,
      invoiceId: record._id,
    });
    setVisible(true);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const res = await coreAxios.delete(`expense/${id}`);
      if (res?.status === 200) {
        message.success("Expense deleted successfully!");
        fetchExpense();
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to delete expense. Please try again.";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchExpense(true);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = expenses.filter(
      (item) =>
        item.invoiceNo.toLowerCase().includes(value.toLowerCase()) ||
        item.createdBy.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredExpenses(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  const formatDeliveryDateTime = (dateTime) => {
    if (!dateTime) return "-";
    return dayjs.utc(dateTime).tz("Asia/Dhaka").format("DD MMM YYYY, hh:mm A");
  };

  const TableSkeleton = () => (
    <Card>
      <div style={{ display: "flex", marginBottom: 16 }}>
        {Array(7)
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
            {Array(7)
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

  const StatsSkeleton = () => (
    <Card>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        {Array(3)
          .fill()
          .map((_, i) => (
            <Card
              key={i}
              style={{ flex: 1, border: "1px solid #f0f0f0", borderRadius: 8 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          ))}
      </div>
    </Card>
  );

  const columns = [
    {
      title: "Created Date",
      dataIndex: "createdDate",
      key: "createdDate",
      width: 180,
      render: (text) => formatDeliveryDateTime(text),
    },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 150,
      fixed: "left",
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
      title: "Grand Total",
      dataIndex: "grandTotal",
      key: "grandTotal",
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: "Total Cost",
      dataIndex: "totalCost",
      key: "totalCost",
      width: 120,
      render: (text) => formatCurrency(text),
    },
    {
      title: "Cash In Hand",
      dataIndex: "cashInHand",
      key: "cashInHand",
      width: 140,
      render: (text) => (
        <span
          style={{ color: text > 0 ? "#52c41a" : "#cf1322", fontWeight: 500 }}>
          {formatCurrency(text)}
        </span>
      ),
    },
    {
      title: "Created By",
      dataIndex: "createdBy",
      key: "createdBy",
      width: 150,
    },
    {
      title: "Actions",
      key: "actions",
      // fixed: "right",
      width: 100,
      render: (_, record) => (
        <Dropdown
          overlay={
            <Menu>
              {userInfo.pagePermissions?.[2]?.editAccess && (
                <Menu.Item
                  key="edit"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}>
                  Edit
                </Menu.Item>
              )}
              {userInfo.pagePermissions?.[2]?.editAccess && (
                <Menu.Item key="delete" icon={<DeleteOutlined />}>
                  <Popconfirm
                    title="Are you sure you want to delete this expense?"
                    onConfirm={() => handleDelete(record._id)}
                    okText="Yes"
                    cancelText="No">
                    Delete
                  </Popconfirm>
                </Menu.Item>
              )}
            </Menu>
          }
          trigger={["click"]}>
          <Button type="text" size="small" icon={<DownOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const renderForm = () => (
    <Form onFinish={formik.handleSubmit} layout="vertical">
      <Form.Item label="Invoice Number" required>
        <Input
          name="invoiceNo"
          value={formik.values.invoiceNo}
          onChange={(e) => handleFieldChange("invoiceNo", e.target.value)}
          placeholder="Enter invoice number"
        />
      </Form.Item>
      <Form.Item label="Grand Total">
        <Input
          name="grandTotal"
          value={formatCurrency(formik.values.grandTotal)}
          disabled
        />
      </Form.Item>
      <Form.Item label="Flower Cost" required>
        <Input
          name="flowerCost"
          value={formik.values.flowerCost}
          onChange={(e) => handleFieldChange("flowerCost", e.target.value)}
          type="number"
          placeholder="Enter flower cost"
        />
      </Form.Item>
      <Form.Item label="Delivery Cost" required>
        <Input
          name="deliveryCost"
          value={formik.values.deliveryCost}
          onChange={(e) => handleFieldChange("deliveryCost", e.target.value)}
          type="number"
          placeholder="Enter delivery cost"
        />
      </Form.Item>
      <Form.Item label="Additional Cost">
        <Input
          name="additionalCost"
          value={formik.values.additionalCost}
          onChange={(e) => handleFieldChange("additionalCost", e.target.value)}
          type="number"
          placeholder="Enter additional cost"
        />
      </Form.Item>
      <Form.Item label="Total Cost">
        <Input
          name="totalCost"
          value={formatCurrency(formik.values.totalCost)}
          disabled
        />
      </Form.Item>
      <Form.Item label="Cash In Hand">
        <Input
          name="cashInHand"
          value={formatCurrency(formik.values.cashInHand)}
          disabled
        />
      </Form.Item>
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ width: "100%" }}>
          {isEditing ? "Update Expense" : "Create Expense"}
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div>
      {userInfo?.pagePermissions?.[2]?.viewAccess === true ? (
        <div style={{ padding: "16px" }}>
          <style>{`
            .stats-card {
              transition: all 0.3s ease;
              border-radius: 8px;
              border: 1px solid #f0f0f0;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .stats-card:hover {
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              transform: translateY(-2px);
              border-color: #d9d9d9;
            }
            .stats-title {
              color: #595959;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .stats-value {
              font-size: 22px;
              font-weight: 600;
            }
            .positive-value {
              color: #389e0d;
            }
            .negative-value {
              color: #cf1322;
            }
          `}</style>

          {/* Stats Cards */}
          {initialLoading ? (
            <StatsSkeleton />
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div className="flex flex-wrap justify-between gap-4">
                {/* Total Expenses Card */}
                <Card className="stats-card" style={{ flex: 1 }}>
                  <div className="stats-title">Total Expenses</div>
                  <div className="stats-value negative-value">
                    {formatCurrency(stats.totalExpenses)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Across all records</Text>
                  </div>
                </Card>

                {/* Cash In Hand Card */}
                <Card className="stats-card" style={{ flex: 1 }}>
                  <div className="stats-title">Total Cash In Hand</div>
                  <div
                    className={`stats-value ${
                      stats.totalCashInHand >= 0
                        ? "positive-value"
                        : "negative-value"
                    }`}>
                    {formatCurrency(stats.totalCashInHand)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Net profit from orders</Text>
                  </div>
                </Card>

                {/* Average Cost Card */}
                <Card className="stats-card" style={{ flex: 1 }}>
                  <div className="stats-title">Average Cost</div>
                  <div className="stats-value">
                    {formatCurrency(stats.averageCost)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Per expense record</Text>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <Card
            style={{ marginBottom: 20 }}
            bodyStyle={{ padding: "16px 24px" }}>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <Input.Search
                placeholder="Search by Invoice No or Created By"
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 300 }}
                allowClear
                prefix={<SearchOutlined />}
              />

              <Space>
                <Button
                  icon={<SyncOutlined spin={refreshing} />}
                  onClick={handleRefresh}
                  disabled={refreshing}>
                  Refresh
                </Button>
                {userInfo.pagePermissions?.[2]?.insertAccess && (
                  <Button
                    type="primary"
                    onClick={() => {
                      formik.resetForm();
                      formik.setFieldValue("invoiceNo", "");
                      formik.setFieldValue("grandTotal", 0);
                      formik.setFieldValue("flowerCost", 0);
                      formik.setFieldValue("deliveryCost", 0);
                      formik.setFieldValue("additionalCost", 0);
                      setVisible(true);
                      setIsEditing(false);
                    }}
                    icon={<PlusOutlined />}>
                    Add Expense
                  </Button>
                )}
              </Space>
            </div>
          </Card>

          {/* Main Table */}
          {initialLoading ? (
            <TableSkeleton />
          ) : (
            <Card
              title="Expense Records"
              extra={
                <div style={{ color: "#8c8c8c", fontSize: 14 }}>
                  Showing {filteredExpenses.length} records
                </div>
              }>
              <Table
                columns={columns}
                dataSource={filteredExpenses.slice(
                  (pagination.current - 1) * pagination.pageSize,
                  pagination.current * pagination.pageSize
                )}
                rowKey="_id"
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: filteredExpenses.length,
                  showSizeChanger: true,
                  pageSizeOptions: ["10", "20", "50", "100"],
                  showTotal: (total) => `Total ${total} items`,
                  onChange: (page, pageSize) => {
                    setPagination({ current: page, pageSize });
                  },
                }}
                scroll={{ x: 1200 }}
                loading={loading}
              />
            </Card>
          )}

          {/* Expense Form Modal */}
          <Modal
            title={isEditing ? "Edit Expense" : "Create Expense"}
            open={visible}
            onCancel={() => {
              setVisible(false);
              formik.resetForm();
            }}
            footer={null}
            width={600}
            destroyOnClose>
            {renderForm()}
          </Modal>
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
              {`You don't have permission to access this page`}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ExpenseInfo;
