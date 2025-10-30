import React, { useState } from 'react';
import { Card, Typography, Button, Table, Form, Input, Space, Modal, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useManufacturers } from '../context/ManufacturerContext';

const { Title, Text } = Typography;

function ManufacturerRegistry() {
  const { getAllManufacturers, addManufacturer, removeManufacturer } = useManufacturers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      addManufacturer(values.address, values.name);
      message.success(`Manufacturer "${values.name}" registered successfully!`);
      handleCloseModal();
    }).catch(error => {
      console.error('Validation failed:', error);
    });
  };

  const handleDelete = (address) => {
    removeManufacturer(address);
    message.success('Manufacturer removed successfully!');
  };

  const columns = [
    {
      title: 'Manufacturer Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Wallet Address',
      dataIndex: 'address',
      key: 'address',
      render: (text) => <Text code copyable>{text}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Delete manufacturer"
          description="Are you sure you want to remove this manufacturer?"
          onConfirm={() => handleDelete(record.address)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const manufacturers = getAllManufacturers();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" style={{ display: 'flex' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2}>Manufacturer Registry</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenModal}
            >
              Register Manufacturer
            </Button>
          </div>

          <Text type="secondary">
            Register manufacturer names to display human-readable names instead of wallet addresses throughout the application.
          </Text>

          <Table
            columns={columns}
            dataSource={manufacturers}
            rowKey="address"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: 'No manufacturers registered yet. Click "Register Manufacturer" to add one.',
            }}
          />
        </Space>

        {/* Register Manufacturer Modal */}
        <Modal
          title="Register Manufacturer"
          open={isModalOpen}
          onCancel={handleCloseModal}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Manufacturer Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter the manufacturer name!' },
                { min: 2, message: 'Name must be at least 2 characters!' },
              ]}
            >
              <Input placeholder="e.g., Apple Inc., Samsung Electronics" />
            </Form.Item>

            <Form.Item
              label="Wallet Address"
              name="address"
              rules={[
                { required: true, message: 'Please enter the wallet address!' },
                {
                  pattern: /^(0x)?[0-9a-fA-F]{64}$/,
                  message: 'Please enter a valid wallet address (64 hex characters, with or without 0x prefix)!',
                },
              ]}
            >
              <Input placeholder="0x123abc..." />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Register
                </Button>
                <Button onClick={handleCloseModal}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}

export default ManufacturerRegistry;
