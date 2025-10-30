import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, AppstoreOutlined, PlusCircleOutlined } from '@ant-design/icons';

const { Header } = Layout;

function Navigation() {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">Home</Link>,
    },
    {
      key: '/browse',
      icon: <AppstoreOutlined />,
      label: <Link to="/browse">Browse Products</Link>,
    },
    {
      key: '/register',
      icon: <PlusCircleOutlined />,
      label: <Link to="/register">Register Product</Link>,
    },
  ];

  return (
    <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
      <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '50px' }}>
        Linera SCM
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ flex: 1, minWidth: 0 }}
      />
    </Header>
  );
}

export default Navigation;
