import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, Typography, Button, Card, Row, Col, Space } from 'antd';
import {
  SafetyOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function LandingPage() {
  const features = [
    {
      icon: <SafetyOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      title: 'Tamper-Proof Tracking',
      description: 'Immutable blockchain records ensure complete transparency and auditability of your supply chain.',
    },
    {
      icon: <GlobalOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: 'Cross-Chain Transfers',
      description: 'Seamlessly transfer products between different facilities and parties across multiple chains.',
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: '48px', color: '#faad14' }} />,
      title: 'Real-Time Updates',
      description: 'Instant visibility into product status, location, and custody changes across your supply chain.',
    },
    {
      icon: <CheckCircleOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: 'Quality Verification',
      description: 'Built-in verification workflows ensure product quality and compliance at every checkpoint.',
    },
  ];

  return (
    <Content style={{ padding: '0' }}>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '100px 50px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <Title level={1} style={{ color: 'white', fontSize: '48px', marginBottom: '20px' }}>
          Linera Supply Chain Management
        </Title>
        <Paragraph style={{ fontSize: '20px', color: 'white', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          Track, verify, and manage your products across the entire supply chain with
          blockchain-powered transparency and security.
        </Paragraph>
        <Space size="large">
          <Link to="/browse">
            <Button type="primary" size="large" style={{ height: '50px', fontSize: '18px', padding: '0 40px' }}>
              Browse Products
            </Button>
          </Link>
          <Link to="/register">
            <Button size="large" style={{ height: '50px', fontSize: '18px', padding: '0 40px', background: 'white', color: '#667eea' }}>
              Register Product
            </Button>
          </Link>
        </Space>
      </div>

      {/* Features Section */}
      <div style={{ padding: '80px 50px', background: '#f0f2f5' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '60px' }}>
          Why Choose Linera SCM?
        </Title>
        <Row gutter={[32, 32]} justify="center">
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                hoverable
                style={{
                  textAlign: 'center',
                  height: '100%',
                  borderRadius: '8px',
                }}
              >
                <div style={{ marginBottom: '20px' }}>{feature.icon}</div>
                <Title level={4}>{feature.title}</Title>
                <Text type="secondary">{feature.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Use Cases Section */}
      <div style={{ padding: '80px 50px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '60px' }}>
          Real-World Applications
        </Title>
        <Row gutter={[32, 32]} justify="center">
          <Col xs={24} md={8}>
            <Card title="Manufacturing" bordered={false}>
              <Paragraph>
                Register products at the point of manufacture, track components and materials,
                and maintain complete production history.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Logistics & Distribution" bordered={false}>
              <Paragraph>
                Monitor products as they move through warehouses, distribution centers,
                and carriers with real-time checkpoint updates.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Quality Assurance" bordered={false}>
              <Paragraph>
                Implement verification checkpoints, record inspections, and maintain
                compliance documentation throughout the supply chain.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      {/* CTA Section */}
      <div
        style={{
          background: '#001529',
          padding: '80px 50px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <Title level={2} style={{ color: 'white', marginBottom: '20px' }}>
          Ready to Get Started?
        </Title>
        <Paragraph style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '40px' }}>
          Begin tracking your supply chain on the Linera blockchain today.
        </Paragraph>
        <Link to="/register">
          <Button type="primary" size="large" style={{ height: '50px', fontSize: '18px', padding: '0 40px' }}>
            Register Your First Product
          </Button>
        </Link>
      </div>
    </Content>
  );
}

export default LandingPage;
