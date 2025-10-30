import { useState } from 'react';
import React from 'react';
import { gql, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Form,
  Input,
  Space,
  Alert,
  Upload,
  Modal,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useClient } from '../GraphQLProvider';

const { Title } = Typography;

const REGISTER_PRODUCT = gql`
  mutation RegisterProduct(
    $manufacturer: AccountOwner!
    $name: String!
    $blobHash: DataBlobHash!
  ) {
    registerProduct(manufacturer: $manufacturer, name: $name, blobHash: $blobHash)
  }
`;

const PUBLISH_DATA_BLOB = gql`
  mutation PublishDataBlob($chainId: ChainId!, $bytes: [Int!]!) {
    publishDataBlob(chainId: $chainId, bytes: $bytes)
  }
`;

const getFileBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const normFile = (e) => {
  return e?.fileList[0];
};

function RegisterProduct({ chainId, owner }) {
  const navigate = useNavigate();
  const { appClient, nodeServiceClient } = useClient();

  // Errors
  const [registerError, setRegisterError] = useState('');

  // Form state
  const [productName, setProductName] = useState('');

  // Forms
  const [registerForm] = Form.useForm();

  // Upload state
  const [registerPreviewOpen, setRegisterPreviewOpen] = useState(false);
  const [registerPreviewImage, setRegisterPreviewImage] = useState('');
  const [registerPreviewTitle, setRegisterPreviewTitle] = useState('');
  const [registerUploadedFileList, setRegisterUploadedFileList] = useState([]);
  const [registerImageUrl, setRegisterImageUrl] = useState('');

  const [publishDataBlob, { loading: publishDataBlobLoading }] = useMutation(
    PUBLISH_DATA_BLOB,
    {
      client: nodeServiceClient,
      onError: (error) =>
        setRegisterError('Publish Data Blob Error: ' + error.message),
      onCompleted: () => {},
    }
  );

  const [registerProduct, { loading: registerLoading }] = useMutation(REGISTER_PRODUCT, {
    client: appClient,
    fetchPolicy: 'no-cache',
    onError: (error) => setRegisterError('Register Error: ' + error.message),
    onCompleted: () => {
      // Navigate back to browse page after successful registration
      navigate('/browse');
    },
  });

  // Submit handler
  const handleRegisterSubmit = () => {
    const encoder = new TextEncoder();
    const byteArrayFile = encoder.encode(registerImageUrl);

    // Ensure owner has 0x prefix
    const formattedOwner = owner.startsWith('0x') ? owner : `0x${owner}`;

    publishDataBlob({
      variables: {
        chainId: chainId,
        bytes: Array.from(byteArrayFile),
      },
    }).then((r) => {
      if ('errors' in r) {
        console.log(
          'Got error while publishing Data Blob: ' + JSON.stringify(r, null, 2)
        );
      } else {
        console.log('Data Blob published: ' + JSON.stringify(r, null, 2));
        const blobHash = r['data']['publishDataBlob'];
        registerProduct({
          variables: {
            manufacturer: formattedOwner,
            name: productName,
            blobHash: blobHash,
          },
        }).then((r) => {
          if ('errors' in r) {
            console.log(
              'Got error while registering product: ' + JSON.stringify(r, null, 2)
            );
          } else {
            console.log('Product registered: ' + JSON.stringify(r, null, 2));
          }
        });
      }
    });
  };

  // Value change handler
  const onRegisterValuesChange = (values) => {
    if (values.name !== undefined) {
      setProductName(values.name);
    }
  };

  // Upload handlers
  const handleRegisterPreviewCancel = () => setRegisterPreviewOpen(false);
  const handleRegisterPreview = (file) => {
    setRegisterPreviewImage(file.url || file.preview);
    setRegisterPreviewOpen(true);
    setRegisterPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf('/') + 1)
    );
  };

  const handleUploadChange = async ({ fileList: newFileList }) => {
    if (newFileList.length > 0) {
      const imageDataUrl = await getFileBase64(newFileList[0].originFileObj);
      newFileList[0].preview = imageDataUrl;
      if (newFileList[0] !== undefined) {
        delete newFileList[0].error;
        newFileList[0].status = 'done';
      }
      setRegisterImageUrl(imageDataUrl);
    } else {
      setRegisterImageUrl('');
    }
    setRegisterUploadedFileList(newFileList);
  };

  const uploadButton = (
    <button
      style={{
        border: 0,
        background: 'none',
      }}
      type='button'
    >
      <PlusOutlined />
      <div
        style={{
          marginTop: 8,
        }}
      >
        Upload
      </div>
    </button>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Space
          direction='vertical'
          style={{
            display: 'flex',
          }}
        >
          <Title level={2}>Register New Product</Title>

          <Form
            name='register'
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            form={registerForm}
            autoComplete='off'
            onValuesChange={onRegisterValuesChange}
            disabled={registerLoading || publishDataBlobLoading}
          >
            <Space direction='vertical' style={{ display: 'flex' }}>
              {registerError ? (
                <Alert
                  message='Error'
                  description={registerError}
                  type='error'
                  showIcon
                />
              ) : null}
              <Form.Item
                label='Product Name'
                name='name'
                rules={[{ required: true, message: 'Please input the product name!' }]}
              >
                <Input placeholder="e.g., iPhone 15 Pro - Serial#ABC123" />
              </Form.Item>

              <Form.Item label='Image/Document'>
                <Form.Item
                  rules={[{ required: true, message: 'Please upload an image!' }]}
                  name='image'
                  valuePropName='imageList'
                  getValueFromEvent={normFile}
                  noStyle
                >
                  <Upload
                    listType='picture-card'
                    fileList={registerUploadedFileList}
                    onPreview={handleRegisterPreview}
                    onChange={handleUploadChange}
                    accept='image/*'
                    beforeUpload={() => false}
                  >
                    {registerUploadedFileList.length >= 1 ? null : uploadButton}
                  </Upload>
                </Form.Item>
              </Form.Item>

              <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                <Space>
                  <Button
                    type='primary'
                    onClick={handleRegisterSubmit}
                    loading={registerLoading || publishDataBlobLoading}
                  >
                    Register Product
                  </Button>
                  <Button onClick={() => navigate('/browse')}>Cancel</Button>
                </Space>
              </Form.Item>
            </Space>
          </Form>
        </Space>
      </Card>

      <Modal
        open={registerPreviewOpen}
        title={registerPreviewTitle}
        footer={null}
        onCancel={handleRegisterPreviewCancel}
      >
        <img alt='' style={{ width: '100%' }} src={registerPreviewImage} />
      </Modal>
    </div>
  );
}

export default RegisterProduct;
