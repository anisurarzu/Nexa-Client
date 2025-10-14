"use client";

import { useEffect, useState } from "react";
import {
  Checkbox,
  Button,
  Modal,
  Upload,
  Table,
  Select,
  message,
  Input,
  Radio,
  Image,
  Spin,
  Pagination,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Tooltip,
  Form,
  Divider,
  Statistic,
  Avatar,
} from "antd";
import {
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useFormik } from "formik";
import coreAxios from "@/utils/axiosInstance";

const { Option } = Select;
const { TextArea } = Input;

const roleInfo = [
  { id: 1, value: "superadmin", label: "সুপার অ্যাডমিন" },
  { id: 2, value: "moderator", label: "মডারেটর" },
  { id: 3, value: "deliveryincharge", label: "ডেলিভারি ইনচার্জ" },
  { id: 4, value: "shopsupport", label: "শপ সাপোর্ট" },
];

const UserManagement = () => {
  const [visible, setVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionData, setPermissionData] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
  });
  const [showPassword, setShowPassword] = useState(false);

  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  // Pages for permission management
  const pages = [
    { id: 1, name: "ড্যাশবোর্ড" },
    { id: 2, name: "অর্ডার" },
    { id: 3, name: "ব্যবহারকারী" },
    { id: 4, name: "খরচ" },
    { id: 5, name: "ইনভেন্টরি" },
  ];

  // Open permission management modal
  const openUserPermissionsModal = (user) => {
    setSelectedUser(user);
    setPermissionModalVisible(true);

    const userPermissions = user.pagePermissions || [];

    const permissionsMap = pages.map((page) => {
      const existingPermission = userPermissions.find(
        (p) => Number(p.pageId) === page.id
      );

      return {
        id: page.id,
        name: page.name,
        view: existingPermission?.viewAccess || false,
        edit: existingPermission?.editAccess || false,
        insert: existingPermission?.insertAccess || false,
        statusUpdate: existingPermission?.statusUpdateAccess || false,
      };
    });

    setPermissionData(permissionsMap);
  };

  // Handle permission checkbox changes
  const handleCheckboxChange = (pageId, permissionType, checked) => {
    setPermissionData((prev) =>
      prev.map((item) =>
        item.id === pageId ? { ...item, [permissionType]: checked } : item
      )
    );
  };

  // Submit permissions
  const handleSubmitPermissions = async () => {
    const finalData = {
      userName: selectedUser.username,
      userLoginId: selectedUser.loginID,
      pages: permissionData.map(({ id, view, insert, edit, statusUpdate }) => ({
        pageId: id,
        viewAccess: view,
        insertAccess: insert,
        editAccess: edit,
        statusUpdateAccess: statusUpdate,
      })),
    };

    try {
      const response = await coreAxios.put(
        `/auth/${selectedUser.id}/page-permissions`,
        finalData
      );
      if (response.status === 200) {
        message.success("অনুমতিগুলি সফলভাবে আপডেট হয়েছে!");
        setPermissionModalVisible(false);
        fetchUsers();
      } else {
        message.error("অনুমতি আপডেট করতে ব্যর্থ হয়েছে।");
      }
    } catch (error) {
      message.error("অনুমতি আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  // Permission table columns
  const pageColumns = [
    {
      title: "পৃষ্ঠা",
      dataIndex: "name",
      key: "name",
      width: "25%",
    },
    {
      title: "দেখার অনুমতি",
      key: "view",
      width: "18%",
      render: (_, record) => (
        <div className="flex justify-center">
          <Checkbox
            checked={record.view}
            onChange={(e) =>
              handleCheckboxChange(record.id, "view", e.target.checked)
            }
          />
        </div>
      ),
    },
    {
      title: "যোগ করার অনুমতি",
      key: "insert",
      width: "18%",
      render: (_, record) => (
        <div className="flex justify-center">
          <Checkbox
            checked={record.insert}
            onChange={(e) =>
              handleCheckboxChange(record.id, "insert", e.target.checked)
            }
          />
        </div>
      ),
    },
    {
      title: "এডিটের অনুমতি",
      key: "edit",
      width: "18%",
      render: (_, record) => (
        <div className="flex justify-center">
          <Checkbox
            checked={record.edit}
            onChange={(e) =>
              handleCheckboxChange(record.id, "edit", e.target.checked)
            }
          />
        </div>
      ),
    },
    {
      title: "স্ট্যাটাস আপডেট",
      key: "statusUpdate",
      width: "21%",
      render: (_, record) => (
        <div className="flex justify-center">
          {record.name === "অর্ডার" ? (
            <Checkbox
              checked={record.statusUpdate}
              onChange={(e) =>
                handleCheckboxChange(
                  record.id,
                  "statusUpdate",
                  e.target.checked
                )
              }
            />
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
  ];

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await coreAxios.get("/auth/users");
      if (response.status === 200) {
        const usersData = response.data?.users || [];
        setUsers(usersData);
        setFilteredUsers(usersData);

        // Calculate statistics
        const totalUsers = usersData.length;
        const activeUsers = usersData.filter(
          (user) => user.status !== "inactive"
        ).length;
        const adminUsers = usersData.filter(
          (user) => user.role?.value === "superadmin"
        ).length;

        setStats({
          totalUsers,
          activeUsers,
          adminUsers,
        });
      }
    } catch (error) {
      message.error("ব্যবহারকারী লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Formik form handling
  const formik = useFormik({
    initialValues: {
      image: null,
      username: "",
      email: "",
      phoneNumber: "",
      password: "",
      currentAddress: "",
      role: "",
      gender: "",
      loginID: "",
    },
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        if (isEditing) {
          const newUser = {
            key: uuidv4(),
            image: values?.image,
            username: values.username,
            email: values.email,
            phoneNumber: values.phoneNumber,
            password: values?.password,
            plainPassword: values?.password,
            currentAddress: values.currentAddress,
            gender: values.gender,
            loginID: values.loginID,
            role: roleInfo.find((role) => role.value === values.role),
          };

          const response = await coreAxios.put(
            `auth/users/${editingKey}`,
            newUser
          );

          if (response?.status === 200) {
            message.success("ব্যবহারকারী সফলভাবে আপডেট হয়েছে!");
            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const userID = editingKey;
              await coreAxios.post(`/auth/image-upload/${userID}`, formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              });
            }
          }
        } else {
          const newUser = {
            key: uuidv4(),
            image: "",
            username: values.username,
            email: values.email,
            phoneNumber: values.phoneNumber,
            password: values?.password,
            plainPassword: values?.password,
            currentAddress: values.currentAddress,
            gender: values.gender,
            loginID: values.loginID,
            role: roleInfo.find((role) => role.value === values.role),
          };

          const response = await coreAxios.post("/auth/register", newUser);

          if (response?.status === 200) {
            message.success("ব্যবহারকারী সফলভাবে যোগ করা হয়েছে!");

            if (values.image) {
              const formData = new FormData();
              formData.append("image", values.image);
              const userID = response.data.userID;

              await coreAxios.post(`/auth/image-upload/${userID}`, formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              });
            }
          }
        }

        resetForm();
        setVisible(false);
        setIsEditing(false);
        setEditingKey(null);
        setShowPassword(false);
        fetchUsers();
      } catch (error) {
        message.error(
          "ব্যবহারকারী যোগ/আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
        );
      } finally {
        setLoading(false);
      }
    },
  });

  // Handle edit user
  const handleEdit = (record) => {
    setEditingKey(record?.id);
    formik.setValues({
      image: record.image,
      username: record.username,
      email: record.email,
      phoneNumber: record.phoneNumber,
      currentAddress: record.currentAddress,
      role: record.role?.value,
      gender: record.gender,
      loginID: record.loginID,
      status: "",
      password: "", // Clear password field when editing
    });
    setVisible(true);
    setIsEditing(true);
  };

  // Handle delete user
  const handleDelete = async (user) => {
    try {
      setLoading(true);
      const response = await coreAxios.delete(`auth/users/hard/${user?.id}`);
      if (response?.status === 200) {
        message.success("ব্যবহারকারী সফলভাবে মুছে ফেলা হয়েছে!");
        fetchUsers();
      }
    } catch (error) {
      message.error("ব্যবহারকারী মুছতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(value.toLowerCase()) ||
        user.email?.toLowerCase().includes(value.toLowerCase()) ||
        user.loginID?.toLowerCase().includes(value.toLowerCase()) ||
        user.phoneNumber?.includes(value)
    );
    setFilteredUsers(filtered);
    setPagination({ ...pagination, current: 1 });
  };

  // Table columns
  const columns = [
    {
      title: "প্রোফাইল",
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 80,
      render: (imageUrl, record) => {
        const defaultMaleImage =
          "https://static.vecteezy.com/system/resources/thumbnails/003/773/576/small/business-man-icon-free-vector.jpg";
        const defaultFemaleImage =
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWAtOLEsziFIaBIl6r27R6f0Rh1eU-Ha0Y-g&s";

        return (
          <Avatar
            src={
              imageUrl
                ? `data:image/jpeg;base64,${imageUrl}`
                : record.gender === "male"
                ? defaultMaleImage
                : defaultFemaleImage
            }
            alt="Profile"
            size={40}
            icon={<UserOutlined />}
            className="border-2 border-gray-200"
          />
        );
      },
    },
    {
      title: "নাম",
      dataIndex: "username",
      key: "username",
      sorter: (a, b) => a.username?.localeCompare(b.username),
    },
    {
      title: "ইউজার আইডি",
      dataIndex: "loginID",
      key: "loginID",
    },
    {
      title: "ইমেইল",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "ফোন",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
    },
    {
      title: "লিঙ্গ",
      dataIndex: "gender",
      key: "gender",
      render: (gender) => (
        <Tag
          color={
            gender === "male" ? "blue" : gender === "female" ? "pink" : "orange"
          }
        >
          {gender === "male"
            ? "পুরুষ"
            : gender === "female"
            ? "মহিলা"
            : "অন্যান্য"}
        </Tag>
      ),
    },
    {
      title: "ভূমিকা",
      dataIndex: ["role", "label"],
      key: "role",
      render: (role) => (
        <Tag
          color={
            role === "সুপার অ্যাডমিন"
              ? "red"
              : role === "মডারেটর"
              ? "blue"
              : role === "ডেলিভারি ইনচার্জ"
              ? "green"
              : "orange"
          }
        >
          {role}
        </Tag>
      ),
    },
    {
      title: "কর্ম",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {userInfo?.pagePermissions?.[2]?.editAccess && (
            <Tooltip title="এডিট করুন">
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                className="bg-blue-500 border-blue-500"
              />
            </Tooltip>
          )}
          {userInfo?.pagePermissions?.[2]?.editAccess && (
            <Tooltip title="অনুমতি ব্যবস্থাপনা">
              <Button
                type="default"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => openUserPermissionsModal(record)}
                className="bg-orange-500 border-orange-500 text-white"
              />
            </Tooltip>
          )}
          {userInfo?.pagePermissions?.[2]?.editAccess && (
            <Tooltip title="ডিলিট করুন">
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: "ব্যবহারকারী ডিলিট করুন",
                    content: `আপনি কি "${record.username}" ব্যবহারকারীকে ডিলিট করতে চান?`,
                    okText: "হ্যাঁ",
                    cancelText: "না",
                    onOk: () => handleDelete(record),
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Handle table pagination
  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  // Permission check
  if (userInfo?.pagePermissions?.[2]?.viewAccess !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="text-center shadow-lg border-0 max-w-md">
          <div className="text-6xl text-red-500 mb-4">🚫</div>
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
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              ব্যবহারকারী ব্যবস্থাপনা
            </h1>
            <p className="text-gray-600">
              সিস্টেম ব্যবহারকারীদের তৈরি, এডিট এবং ব্যবস্থাপনা করুন
            </p>
          </div>

          {userInfo?.pagePermissions?.[2]?.insertAccess && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsEditing(false);
                formik.resetForm();
                setVisible(true);
                setShowPassword(false);
              }}
              className="bg-green-600 hover:bg-green-700 border-green-600 h-12 px-6 text-lg"
              size="large"
            >
              নতুন ব্যবহারকারী
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="মোট ব্যবহারকারী"
                value={stats.totalUsers}
                prefix={<TeamOutlined className="text-blue-500" />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="সক্রিয় ব্যবহারকারী"
                value={stats.activeUsers}
                prefix={<UserOutlined className="text-green-500" />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="text-center shadow-md border-0 hover:shadow-lg transition-shadow">
              <Statistic
                title="অ্যাডমিন ব্যবহারকারী"
                value={stats.adminUsers}
                prefix={<SafetyCertificateOutlined className="text-red-500" />}
                valueStyle={{ color: "#f5222d" }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Search Section */}
      <Card className="shadow-md border-0 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <Input.Search
            placeholder="নাম, ইমেইল বা ইউজার আইডি দিয়ে খুঁজুন..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full lg:w-96"
            size="large"
            allowClear
            enterButton={
              <Button
                type="primary"
                className="bg-blue-500 border-blue-500"
                icon={<SearchOutlined />}
              >
                খুঁজুন
              </Button>
            }
          />
        </div>
      </Card>

      {/* Main Content */}
      <Card className="shadow-lg border-0" bodyStyle={{ padding: 0 }}>
        <Spin spinning={loading} size="large">
          <Table
            columns={columns}
            dataSource={filteredUsers.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )}
            rowKey="id"
            pagination={{
              ...pagination,
              total: filteredUsers.length,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `মোট ${total}জন ব্যবহারকারীর মধ্যে ${range[0]}-${range[1]}জন দেখানো হচ্ছে`,
              onChange: handleTableChange,
            }}
            scroll={{ x: 800 }}
            className="custom-table"
          />
        </Spin>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal
        title={
          <div className="text-xl font-bold">
            {isEditing ? "ব্যবহারকারী এডিট করুন" : "নতুন ব্যবহারকারী যোগ করুন"}
          </div>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          setShowPassword(false);
        }}
        footer={null}
        width={600}
        centered
        className="modern-modal"
      >
        <Form
          onFinish={formik.handleSubmit}
          layout="vertical"
          className="space-y-4"
        >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="নাম" required>
                <Input
                  name="username"
                  prefix={<UserOutlined />}
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  placeholder="ব্যবহারকারীর নাম লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="ইউজার আইডি" required>
                <Input
                  name="loginID"
                  prefix={<UserOutlined />}
                  value={formik.values.loginID}
                  onChange={formik.handleChange}
                  placeholder="ইউজার আইডি লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="ইমেইল" required>
                <Input
                  name="email"
                  prefix={<MailOutlined />}
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  placeholder="ইমেইল ঠিকানা লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="ফোন নম্বর" required>
                <Input
                  name="phoneNumber"
                  prefix={<PhoneOutlined />}
                  value={formik.values.phoneNumber}
                  onChange={formik.handleChange}
                  placeholder="ফোন নম্বর লিখুন"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Password Field - Only show when creating new user */}
          {!isEditing && (
            <Form.Item label="পাসওয়ার্ড" required>
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                prefix={<LockOutlined />}
                value={formik.values.password}
                onChange={formik.handleChange}
                placeholder="পাসওয়ার্ড লিখুন"
                size="large"
                suffix={
                  <Tooltip
                    title={
                      showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"
                    }
                  >
                    <Button
                      type="text"
                      icon={
                        showPassword ? (
                          <EyeInvisibleOutlined />
                        ) : (
                          <EyeOutlined />
                        )
                      }
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500"
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
          )}

          {/* Optional: Show password reset field for editing */}
          {isEditing && (
            <Form.Item label="পাসওয়ার্ড (ঐচ্ছিক)">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                prefix={<LockOutlined />}
                value={formik.values.password}
                onChange={formik.handleChange}
                placeholder="নতুন পাসওয়ার্ড লিখুন (ঐচ্ছিক)"
                size="large"
                suffix={
                  <Tooltip
                    title={
                      showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"
                    }
                  >
                    <Button
                      type="text"
                      icon={
                        showPassword ? (
                          <EyeInvisibleOutlined />
                        ) : (
                          <EyeOutlined />
                        )
                      }
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500"
                    />
                  </Tooltip>
                }
              />
              <div className="text-xs text-gray-500 mt-1">
                শুধুমাত্র পাসওয়ার্ড পরিবর্তন করতে চাইলে এই ফিল্ডটি পূরণ করুন
              </div>
            </Form.Item>
          )}

          <Form.Item label="ঠিকানা">
            <Input
              name="currentAddress"
              prefix={<EnvironmentOutlined />}
              value={formik.values.currentAddress}
              onChange={formik.handleChange}
              placeholder="বর্তমান ঠিকানা লিখুন"
              size="large"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="লিঙ্গ" required>
                <Radio.Group
                  name="gender"
                  value={formik.values.gender}
                  onChange={(e) =>
                    formik.setFieldValue("gender", e.target.value)
                  }
                  className="w-full"
                >
                  <Radio value="male">পুরুষ</Radio>
                  <Radio value="female">মহিলা</Radio>
                  <Radio value="other">অন্যান্য</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="ভূমিকা" required>
                <Select
                  name="role"
                  value={formik.values.role}
                  onChange={(value) => formik.setFieldValue("role", value)}
                  placeholder="ভূমিকা নির্বাচন করুন"
                  size="large"
                >
                  {roleInfo.map((role) => (
                    <Option key={role.id} value={role.value}>
                      {role.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="প্রোফাইল ছবি">
            <Upload
              name="image"
              listType="picture"
              maxCount={1}
              beforeUpload={() => false}
              onChange={({ fileList }) =>
                formik.setFieldValue("image", fileList[0]?.originFileObj)
              }
            >
              <Button icon={<UploadOutlined />}>ছবি আপলোড করুন</Button>
            </Upload>
          </Form.Item>

          <Divider />

          <Form.Item className="mb-0">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setVisible(false);
                  setShowPassword(false);
                }}
                size="large"
                className="px-6"
              >
                বাতিল করুন
              </Button>
              <Button
                loading={loading}
                type="primary"
                htmlType="submit"
                size="large"
                className="bg-green-600 hover:bg-green-700 border-green-600 px-6"
              >
                {isEditing ? "আপডেট করুন" : "যোগ করুন"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permission Management Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-orange-500" />
            <span>{selectedUser?.username} - অনুমতি ব্যবস্থাপনা</span>
          </div>
        }
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPermissionModalVisible(false)}>
            বাতিল করুন
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmitPermissions}
            className="bg-green-600 border-green-600"
          >
            পরিবর্তন সংরক্ষণ করুন
          </Button>,
        ]}
        width={800}
        centered
      >
        <Table
          columns={pageColumns}
          dataSource={permissionData}
          rowKey="id"
          pagination={false}
          className="permission-table"
          scroll={{ x: 600 }}
        />
      </Modal>

      <style jsx>{`
        .custom-table :global(.ant-table-thead > tr > th) {
          background-color: #f8fafc;
          font-weight: 600;
          color: #374151;
        }

        .modern-modal :global(.ant-modal-header) {
          border-bottom: 2px solid #10b981;
        }

        .permission-table :global(.ant-table-thead > tr > th) {
          text-align: center;
          background-color: #f0f9ff;
        }

        .permission-table :global(.ant-table-tbody > tr > td) {
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
