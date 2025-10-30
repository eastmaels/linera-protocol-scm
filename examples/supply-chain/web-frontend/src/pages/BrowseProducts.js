import { useState } from 'react';
import React from 'react';
import {
  gql,
  useMutation,
  useLazyQuery,
  useSubscription,
} from '@apollo/client';
import {
  Card,
  Typography,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Alert,
  Descriptions,
  Timeline,
  Tag,
  Tabs,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useClient } from '../GraphQLProvider';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GET_OWNED_PRODUCTS = gql`
  query OwnedProducts($owner: AccountOwner!) {
    ownedProducts(owner: $owner)
  }
`;

const GET_PRODUCT_HISTORY = gql`
  query ProductHistory($tokenId: String!) {
    productHistory(tokenId: $tokenId) {
      timestamp
      location
      status
      party
      notes
    }
  }
`;

const GET_VERIFICATION_RECORDS = gql`
  query VerificationRecords($tokenId: String!) {
    verificationRecords(tokenId: $tokenId) {
      verifier
      timestamp
      passed
      details
    }
  }
`;

const TRANSFER_CUSTODY = gql`
  mutation TransferCustody(
    $sourceOwner: AccountOwner!
    $tokenId: String!
    $targetAccount: FungibleAccount!
  ) {
    transferCustody(
      sourceOwner: $sourceOwner
      tokenId: $tokenId
      targetAccount: $targetAccount
    )
  }
`;

const ADD_CHECKPOINT = gql`
  mutation AddCheckpoint(
    $tokenId: String!
    $location: String!
    $status: ProductStatus!
    $notes: String
  ) {
    addCheckpoint(
      tokenId: $tokenId
      location: $location
      status: $status
      notes: $notes
    )
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateStatus(
    $tokenId: String!
    $newStatus: ProductStatus!
    $location: String!
    $notes: String
  ) {
    updateStatus(
      tokenId: $tokenId
      newStatus: $newStatus
      location: $location
      notes: $notes
    )
  }
`;

const VERIFY_PRODUCT = gql`
  mutation VerifyProduct(
    $tokenId: String!
    $passed: Boolean!
    $details: String!
  ) {
    verifyProduct(
      tokenId: $tokenId
      passed: $passed
      details: $details
    )
  }
`;

const REJECT_PRODUCT = gql`
  mutation RejectProduct(
    $tokenId: String!
    $reason: String!
  ) {
    rejectProduct(
      tokenId: $tokenId
      reason: $reason
    )
  }
`;

const NOTIFICATION_SUBSCRIPTION = gql`
  subscription Notifications($chainId: ID!) {
    notifications(chainId: $chainId)
  }
`;

const getStatusColor = (status) => {
  const colors = {
    Registered: 'blue',
    InTransit: 'orange',
    Delivered: 'green',
    Verified: 'cyan',
    Rejected: 'red',
  };
  return colors[status] || 'default';
};

const getStatusIcon = (status) => {
  const icons = {
    Registered: <CheckCircleOutlined />,
    InTransit: <SyncOutlined spin />,
    Delivered: <CheckCircleOutlined />,
    Verified: <CheckCircleOutlined />,
    Rejected: <CloseCircleOutlined />,
  };
  return icons[status] || <ClockCircleOutlined />;
};

function BrowseProducts({ chainId, owner }) {
  const { appClient } = useClient();

  // Errors
  const [transferError, setTransferError] = useState('');
  const [checkpointError, setCheckpointError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Dialog controls
  const [isTransferOpen, setTransferOpen] = useState(false);
  const [isCheckpointOpen, setCheckpointOpen] = useState(false);
  const [isStatusOpen, setStatusOpen] = useState(false);
  const [isVerifyOpen, setVerifyOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);

  // Selected product for operations
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form state
  const [tokenID, setTokenID] = useState('');
  const [targetChainID, setTargetChainID] = useState('');
  const [targetOwner, setTargetOwner] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('IN_TRANSIT');
  const [notes, setNotes] = useState('');
  const [verifyPassed, setVerifyPassed] = useState(true);
  const [verifyDetails, setVerifyDetails] = useState('');

  // Forms
  const [transferForm] = Form.useForm();
  const [checkpointForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [verifyForm] = Form.useForm();

  // Query owned products
  let [
    getOwnedProducts,
    { data: ownedProductsData, called: ownedProductsCalled, loading: ownedProductsLoading },
  ] = useLazyQuery(GET_OWNED_PRODUCTS, {
    client: appClient,
    fetchPolicy: 'network-only',
    variables: { owner: owner.startsWith('0x') ? owner : `0x${owner}` },
    onCompleted: (data) => {
      console.log('Query completed. Raw data:', data);
    },
    onError: (error) => {
      console.error('Query error:', error);
    },
  });

  // Query product history
  let [
    getProductHistory,
    { data: productHistoryData, loading: productHistoryLoading },
  ] = useLazyQuery(GET_PRODUCT_HISTORY, {
    client: appClient,
    fetchPolicy: 'network-only',
  });

  // Query verification records
  let [
    getVerificationRecords,
    { data: verificationRecordsData, loading: verificationRecordsLoading },
  ] = useLazyQuery(GET_VERIFICATION_RECORDS, {
    client: appClient,
    fetchPolicy: 'network-only',
  });

  // Mutations
  const [transferCustody, { loading: transferLoading }] = useMutation(
    TRANSFER_CUSTODY,
    {
      client: appClient,
      fetchPolicy: 'no-cache',
      onError: (error) => setTransferError('Transfer Error: ' + error.message),
      onCompleted: () => {
        handleTransferClose();
        getOwnedProducts();
      },
    }
  );

  const [addCheckpoint, { loading: checkpointLoading }] = useMutation(ADD_CHECKPOINT, {
    client: appClient,
    fetchPolicy: 'no-cache',
    onError: (error) => setCheckpointError('Checkpoint Error: ' + error.message),
    onCompleted: () => {
      handleCheckpointClose();
      getOwnedProducts();
    },
  });

  const [updateStatus, { loading: statusLoading }] = useMutation(UPDATE_STATUS, {
    client: appClient,
    fetchPolicy: 'no-cache',
    onError: (error) => setStatusError('Status Update Error: ' + error.message),
    onCompleted: () => {
      handleStatusClose();
      getOwnedProducts();
    },
  });

  const [verifyProduct, { loading: verifyLoading }] = useMutation(VERIFY_PRODUCT, {
    client: appClient,
    fetchPolicy: 'no-cache',
    onError: (error) => setVerifyError('Verify Error: ' + error.message),
    onCompleted: () => {
      handleVerifyClose();
      getOwnedProducts();
    },
  });

  const [rejectProduct] = useMutation(REJECT_PRODUCT, {
    client: appClient,
    fetchPolicy: 'no-cache',
    onError: (error) => setVerifyError('Reject Error: ' + error.message),
    onCompleted: () => {
      handleVerifyClose();
      getOwnedProducts();
    },
  });

  if (!ownedProductsCalled) {
    void getOwnedProducts();
  }

  useSubscription(NOTIFICATION_SUBSCRIPTION, {
    client: appClient,
    variables: { chainId: chainId },
    onData: () => getOwnedProducts(),
  });

  // Dialog handlers
  const handleTransferOpen = (product) => {
    setSelectedProduct(product);
    setTokenID(product.token_id);
    setTransferOpen(true);
  };
  const handleTransferClose = () => {
    setTransferOpen(false);
    resetTransferDialog();
  };

  const handleCheckpointOpen = (product) => {
    setSelectedProduct(product);
    setTokenID(product.token_id);
    setCheckpointOpen(true);
  };
  const handleCheckpointClose = () => {
    setCheckpointOpen(false);
    resetCheckpointDialog();
  };

  const handleStatusOpen = (product) => {
    setSelectedProduct(product);
    setTokenID(product.token_id);
    setStatusOpen(true);
  };
  const handleStatusClose = () => {
    setStatusOpen(false);
    resetStatusDialog();
  };

  const handleVerifyOpen = (product) => {
    setSelectedProduct(product);
    setTokenID(product.token_id);
    setVerifyOpen(true);
  };
  const handleVerifyClose = () => {
    setVerifyOpen(false);
    resetVerifyDialog();
  };

  const handleDetailsOpen = (product) => {
    setSelectedProduct(product);
    setTokenID(product.token_id);
    getProductHistory({ variables: { tokenId: product.token_id } });
    getVerificationRecords({ variables: { tokenId: product.token_id } });
    setDetailsOpen(true);
  };
  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedProduct(null);
  };

  // Reset handlers
  const resetTransferDialog = () => {
    setTokenID('');
    setTargetChainID('');
    setTargetOwner('');
    setTransferError('');
    transferForm.resetFields();
  };

  const resetCheckpointDialog = () => {
    setLocation('');
    setStatus('IN_TRANSIT');
    setNotes('');
    setCheckpointError('');
    checkpointForm.resetFields();
  };

  const resetStatusDialog = () => {
    setLocation('');
    setStatus('IN_TRANSIT');
    setNotes('');
    setStatusError('');
    statusForm.resetFields();
  };

  const resetVerifyDialog = () => {
    setVerifyPassed(true);
    setVerifyDetails('');
    setVerifyError('');
    verifyForm.resetFields();
  };

  // Submit handlers
  const handleTransferSubmit = () => {
    // Ensure owner addresses have 0x prefix
    const formattedSourceOwner = owner.startsWith('0x') ? owner : `0x${owner}`;
    const formattedTargetOwner = targetOwner.startsWith('0x') ? targetOwner : `0x${targetOwner}`;

    transferCustody({
      variables: {
        sourceOwner: formattedSourceOwner,
        tokenId: tokenID,
        targetAccount: {
          chainId: targetChainID,
          owner: formattedTargetOwner,
        },
      },
    }).then((r) => {
      if ('errors' in r) {
        console.log(
          'Error while transferring custody: ' + JSON.stringify(r, null, 2)
        );
      } else {
        console.log('Custody transferred: ' + JSON.stringify(r, null, 2));
      }
    });
  };

  const handleCheckpointSubmit = () => {
    addCheckpoint({
      variables: {
        tokenId: tokenID,
        location: location,
        status: status,
        notes: notes || null,
      },
    }).then((r) => {
      if ('errors' in r) {
        console.log(
          'Error while adding checkpoint: ' + JSON.stringify(r, null, 2)
        );
      } else {
        console.log('Checkpoint added: ' + JSON.stringify(r, null, 2));
      }
    });
  };

  const handleStatusSubmit = () => {
    updateStatus({
      variables: {
        tokenId: tokenID,
        newStatus: status,
        location: location,
        notes: notes || null,
      },
    }).then((r) => {
      if ('errors' in r) {
        console.log(
          'Error while updating status: ' + JSON.stringify(r, null, 2)
        );
      } else {
        console.log('Status updated: ' + JSON.stringify(r, null, 2));
      }
    });
  };

  const handleVerifySubmit = () => {
    if (verifyPassed) {
      verifyProduct({
        variables: {
          tokenId: tokenID,
          passed: true,
          details: verifyDetails,
        },
      }).then((r) => {
        if ('errors' in r) {
          console.log(
            'Error while verifying product: ' + JSON.stringify(r, null, 2)
          );
        } else {
          console.log('Product verified: ' + JSON.stringify(r, null, 2));
        }
      });
    } else {
      rejectProduct({
        variables: {
          tokenId: tokenID,
          reason: verifyDetails,
        },
      }).then((r) => {
        if ('errors' in r) {
          console.log(
            'Error while rejecting product: ' + JSON.stringify(r, null, 2)
          );
        } else {
          console.log('Product rejected: ' + JSON.stringify(r, null, 2));
        }
      });
    }
  };

  // Value change handlers
  const onTransferValuesChange = (values) => {
    if (values.target_chain_id !== undefined) {
      setTargetChainID(values.target_chain_id);
    }
    if (values.target_owner !== undefined) {
      setTargetOwner(values.target_owner);
    }
  };

  const onCheckpointValuesChange = (values) => {
    if (values.location !== undefined) setLocation(values.location);
    if (values.status !== undefined) setStatus(values.status);
    if (values.notes !== undefined) setNotes(values.notes);
  };

  const onStatusValuesChange = (values) => {
    if (values.location !== undefined) setLocation(values.location);
    if (values.new_status !== undefined) setStatus(values.new_status);
    if (values.notes !== undefined) setNotes(values.notes);
  };

  const onVerifyValuesChange = (values) => {
    if (values.passed !== undefined) setVerifyPassed(values.passed);
    if (values.details !== undefined) setVerifyDetails(values.details);
  };

  // Table columns
  const columns = [
    {
      title: 'Token Id',
      dataIndex: 'token_id',
      key: 'token_id',
      render: (text) => <Text code copyable>{text.substring(0, 16)}...</Text>,
    },
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      render: (text) => <Text code>{text.substring(0, 16)}...</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, product) => (
        <Space>
          <Button size="small" onClick={() => handleDetailsOpen(product)}>
            View Details
          </Button>
          <Button size="small" onClick={() => handleCheckpointOpen(product)}>
            Add Checkpoint
          </Button>
          <Button size="small" onClick={() => handleStatusOpen(product)}>
            Update Status
          </Button>
          <Button size="small" onClick={() => handleVerifyOpen(product)}>
            Verify
          </Button>
          <Button size="small" onClick={() => handleTransferOpen(product)}>
            Transfer
          </Button>
        </Space>
      ),
    },
  ];

  const userInfoItems = [
    {
      key: 'account',
      label: 'Account',
      children: <Text code copyable>{owner}</Text>,
    },
    {
      key: 'chain',
      label: 'Chain',
      children: <Text code copyable>{chainId}</Text>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space
          direction='vertical'
          style={{
            display: 'flex',
          }}
        >
          <Title level={2}>Browse Products</Title>
          <Descriptions title='User Info' items={userInfoItems} column={1} />

          <Typography style={{ fontWeight: 'bold', marginTop: '20px' }}>
            Your Products:
          </Typography>
          <Table
            columns={columns}
            loading={ownedProductsLoading}
            dataSource={
              ownedProductsData && ownedProductsData.ownedProducts
                ? (() => {
                    console.log('Products data:', ownedProductsData.ownedProducts);
                    return Object.entries(ownedProductsData.ownedProducts).map(
                      ([token_id, product]) => {
                        return {
                          key: token_id,
                          token_id: token_id,
                          name: product.name,
                          status: product.status,
                          manufacturer: product.manufacturer,
                          checkpoints: product.checkpoints,
                          verifications: product.verifications,
                        };
                      }
                    );
                  })()
                : []
            }
          />
        </Space>

        {/* Transfer Custody Modal */}
        <Modal
          title='Transfer Custody'
          open={isTransferOpen}
          footer={null}
          onCancel={handleTransferClose}
          width={600}
        >
          <Form
            name='transfer'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            initialValues={{ token_id: tokenID }}
            form={transferForm}
            autoComplete='off'
            onValuesChange={onTransferValuesChange}
            disabled={transferLoading}
          >
            {transferError ? (
              <Alert message='Error' description={transferError} type='error' showIcon />
            ) : null}
            <Form.Item label='Token Id' name='token_id'>
              <Input disabled />
            </Form.Item>

            <Form.Item
              label='Target Chain Id'
              name='target_chain_id'
              rules={[{ required: true, message: 'Please input the target chain ID!' }]}
            >
              <Input placeholder="Chain ID" />
            </Form.Item>

            <Form.Item
              label='Target Owner'
              name='target_owner'
              rules={[{ required: true, message: 'Please input the target owner!' }]}
            >
              <Input placeholder="Owner address" />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button type='primary' onClick={handleTransferSubmit} loading={transferLoading}>
                  Submit
                </Button>
                <Button onClick={handleTransferClose}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Checkpoint Modal */}
        <Modal
          title='Add Checkpoint'
          open={isCheckpointOpen}
          footer={null}
          onCancel={handleCheckpointClose}
          width={600}
        >
          <Form
            name='checkpoint'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            form={checkpointForm}
            autoComplete='off'
            onValuesChange={onCheckpointValuesChange}
            disabled={checkpointLoading}
          >
            {checkpointError ? (
              <Alert message='Error' description={checkpointError} type='error' showIcon />
            ) : null}

            <Form.Item
              label='Location'
              name='location'
              rules={[{ required: true, message: 'Please input the location!' }]}
            >
              <Input placeholder="e.g., Warehouse A - Loading Dock" />
            </Form.Item>

            <Form.Item
              label='Status'
              name='status'
              rules={[{ required: true, message: 'Please select a status!' }]}
              initialValue="IN_TRANSIT"
            >
              <Select>
                <Option value="REGISTERED">Registered</Option>
                <Option value="IN_TRANSIT">In Transit</Option>
                <Option value="DELIVERED">Delivered</Option>
                <Option value="VERIFIED">Verified</Option>
                <Option value="REJECTED">Rejected</Option>
              </Select>
            </Form.Item>

            <Form.Item label='Notes' name='notes'>
              <TextArea rows={4} placeholder="Optional notes about this checkpoint" />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button type='primary' onClick={handleCheckpointSubmit} loading={checkpointLoading}>
                  Submit
                </Button>
                <Button onClick={handleCheckpointClose}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Update Status Modal */}
        <Modal
          title='Update Status'
          open={isStatusOpen}
          footer={null}
          onCancel={handleStatusClose}
          width={600}
        >
          <Form
            name='status'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            form={statusForm}
            autoComplete='off'
            onValuesChange={onStatusValuesChange}
            disabled={statusLoading}
          >
            {statusError ? (
              <Alert message='Error' description={statusError} type='error' showIcon />
            ) : null}

            <Form.Item
              label='Location'
              name='location'
              rules={[{ required: true, message: 'Please input the location!' }]}
            >
              <Input placeholder="e.g., Distribution Center - Bay 5" />
            </Form.Item>

            <Form.Item
              label='New Status'
              name='new_status'
              rules={[{ required: true, message: 'Please select a status!' }]}
              initialValue="IN_TRANSIT"
            >
              <Select>
                <Option value="REGISTERED">Registered</Option>
                <Option value="IN_TRANSIT">In Transit</Option>
                <Option value="DELIVERED">Delivered</Option>
                <Option value="VERIFIED">Verified</Option>
                <Option value="REJECTED">Rejected</Option>
              </Select>
            </Form.Item>

            <Form.Item label='Notes' name='notes'>
              <TextArea rows={4} placeholder="Optional notes" />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button type='primary' onClick={handleStatusSubmit} loading={statusLoading}>
                  Submit
                </Button>
                <Button onClick={handleStatusClose}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Verify Product Modal */}
        <Modal
          title='Verify Product'
          open={isVerifyOpen}
          footer={null}
          onCancel={handleVerifyClose}
          width={600}
        >
          <Form
            name='verify'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            form={verifyForm}
            autoComplete='off'
            onValuesChange={onVerifyValuesChange}
            disabled={verifyLoading}
          >
            {verifyError ? (
              <Alert message='Error' description={verifyError} type='error' showIcon />
            ) : null}

            <Form.Item
              label='Result'
              name='passed'
              rules={[{ required: true, message: 'Please select verification result!' }]}
              initialValue={true}
            >
              <Select>
                <Option value={true}>Pass</Option>
                <Option value={false}>Reject</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label='Details'
              name='details'
              rules={[{ required: true, message: 'Please input verification details!' }]}
            >
              <TextArea rows={4} placeholder="Verification details or rejection reason" />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button type='primary' onClick={handleVerifySubmit} loading={verifyLoading}>
                  Submit
                </Button>
                <Button onClick={handleVerifyClose}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Product Details Modal */}
        <Modal
          title='Product Details'
          open={isDetailsOpen}
          footer={<Button onClick={handleDetailsClose}>Close</Button>}
          onCancel={handleDetailsClose}
          width={800}
        >
          {selectedProduct && (
            <Tabs
              items={[
                {
                  key: '1',
                  label: 'Overview',
                  children: (
                    <Descriptions column={1}>
                      <Descriptions.Item label="Token ID">
                        <Text code copyable>{selectedProduct.token_id}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Product Name">
                        {selectedProduct.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag icon={getStatusIcon(selectedProduct.status)} color={getStatusColor(selectedProduct.status)}>
                          {selectedProduct.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Manufacturer">
                        <Text code copyable>{selectedProduct.manufacturer}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: '2',
                  label: 'Checkpoint History',
                  children: productHistoryLoading ? (
                    <div>Loading...</div>
                  ) : productHistoryData?.productHistory ? (
                    <Timeline
                      items={productHistoryData.productHistory.map((checkpoint, index) => ({
                        color: getStatusColor(checkpoint.status),
                        children: (
                          <div key={index}>
                            <p><strong>{checkpoint.location}</strong></p>
                            <p>
                              <Tag icon={getStatusIcon(checkpoint.status)} color={getStatusColor(checkpoint.status)}>
                                {checkpoint.status}
                              </Tag>
                            </p>
                            <p><Text type="secondary">
                              {new Date(checkpoint.timestamp / 1000).toLocaleString()}
                            </Text></p>
                            {checkpoint.notes && <p><Text italic>{checkpoint.notes}</Text></p>}
                            <p><Text code>{checkpoint.party.substring(0, 16)}...</Text></p>
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <div>No checkpoint history available</div>
                  ),
                },
                {
                  key: '3',
                  label: 'Verification Records',
                  children: verificationRecordsLoading ? (
                    <div>Loading...</div>
                  ) : verificationRecordsData?.verificationRecords?.length > 0 ? (
                    <Timeline
                      items={verificationRecordsData.verificationRecords.map((record, index) => ({
                        color: record.passed ? 'green' : 'red',
                        dot: record.passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />,
                        children: (
                          <div key={index}>
                            <p>
                              <Tag color={record.passed ? 'green' : 'red'}>
                                {record.passed ? 'PASSED' : 'REJECTED'}
                              </Tag>
                            </p>
                            <p><Text>{record.details}</Text></p>
                            <p><Text type="secondary">
                              {new Date(record.timestamp / 1000).toLocaleString()}
                            </Text></p>
                            <p><Text code>Verifier: {record.verifier.substring(0, 16)}...</Text></p>
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <div>No verification records available</div>
                  ),
                },
              ]}
            />
          )}
        </Modal>
      </Card>
    </div>
  );
}

export default BrowseProducts;
