import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { HomeOutlined, AppstoreOutlined, PlusCircleOutlined, TeamOutlined } from '@ant-design/icons';

const { Header } = Layout;

function Navigation() {
  const location = useLocation();

  // Preserve query parameters when navigating
  const queryString = location.search;

  // Extract the base path (chain ID portion)
  const pathParts = location.pathname.split('/');
  const basePath = pathParts.length > 1 ? `/${pathParts[1]}` : '';

  // Get the current page path (without chain ID)
  const currentPage = pathParts.length > 2 ? `/${pathParts[2]}` : '/';

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to={`${basePath}${queryString}`}>Home</Link>,
    },
    {
      key: '/browse',
      icon: <AppstoreOutlined />,
      label: <Link to={`${basePath}/browse${queryString}`}>Browse Products</Link>,
    },
    {
      key: '/register',
      icon: <PlusCircleOutlined />,
      label: <Link to={`${basePath}/register${queryString}`}>Register Product</Link>,
    },
    {
      key: '/manufacturers',
      icon: <TeamOutlined />,
      label: <Link to={`${basePath}/manufacturers${queryString}`}>Manufacturers</Link>,
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
        selectedKeys={[currentPage]}
        items={menuItems}
        style={{ flex: 1, minWidth: 0 }}
      />
    </Header>
  );
}

export default Navigation;
