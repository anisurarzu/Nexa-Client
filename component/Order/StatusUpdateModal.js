import React, { useEffect, useState } from "react";
import { Modal, Select, Input, Form, message } from "antd";
import dayjs from "dayjs";

const { Option } = Select;

const StatusUpdateModal = ({
  visible,
  onCancel,
  onUpdateStatus,
  selectedOrder,
}) => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState("");
  const [dispatchInfo, setDispatchInfo] = useState("");

  // Reset form and state when the modal is opened or the selected order changes
  useEffect(() => {
    if (visible && selectedOrder) {
      setStatus(selectedOrder.status || "");
      setDispatchInfo(selectedOrder.dispatchInfo || "");
      form.setFieldsValue({
        status: selectedOrder.status || "",
        dispatchInfo: selectedOrder.dispatchInfo || "",
      });
    }
  }, [visible, selectedOrder, form]);

  const handleStatusChange = (value) => {
    setStatus(value);
    if (value !== "Dispatched") {
      setDispatchInfo(""); // Clear dispatch info if status is not "Dispatched"
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields(); // Validate form fields
      const updatedData = {
        status,

        updatedBy: JSON.parse(localStorage.getItem("userInfo"))?.loginID,
      };

      // Add dispatch info if status is "Dispatched"
      if (status === "Dispatched") {
        updatedData.dispatchInfo = dispatchInfo;
      }
      if (status === "Delivered") {
        updatedData.deliveredDate = dayjs();
      }

      onUpdateStatus(selectedOrder._id, updatedData); // Call parent function to update status
      onCancel(); // Close the modal
    } catch (error) {
      message.error("Please fill all required fields!");
    }
  };

  return (
    <Modal
      title="Update Order Status"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="Update"
      width={400}>
      <Form form={form} layout="vertical">
        <Form.Item
          label="Select Status"
          name="status"
          rules={[{ required: true, message: "Status is required!" }]}>
          <Select
            placeholder="Select Status"
            value={status}
            onChange={handleStatusChange}>
            <Option value="Pending">Pending</Option>
            <Option value="On Process">On Process</Option>
            <Option value="Dispatched">Dispatched</Option>
            <Option value="Delivered">Delivered</Option>
          </Select>
        </Form.Item>

        {status === "Dispatched" && (
          <Form.Item
            label="Dispatch Information"
            name="dispatchInfo"
            rules={[
              { required: true, message: "Dispatch information is required!" },
            ]}>
            <Input
              placeholder="Enter dispatch information"
              value={dispatchInfo}
              onChange={(e) => setDispatchInfo(e.target.value)}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default StatusUpdateModal;
