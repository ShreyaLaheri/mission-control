import React, { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Controlled as CodeMirror } from 'react-codemirror2';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, AutoComplete, Checkbox, Tooltip, Button, Input } from 'antd';
import FormItemLabel from "../form-item-label/FormItemLabel"
import 'codemirror/theme/material.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/edit/matchbrackets.js'
import 'codemirror/addon/edit/closebrackets.js'
import { notify, parseJSONSafely, canGenerateToken } from "../../utils";
import { get, set } from "automate-redux";
import GenerateTokenForm from "../explorer/generateToken/GenerateTokenForm"
import ConditionalFormBlock from "../conditional-form-block/ConditionalFormBlock";

const TriggerForm = ({ handleSubmit, eventTypes, initialEventType, secret, internalToken, projectId }) => {
  const [form] = Form.useForm()
  const [eventType, setEventType] = useState(initialEventType);

  const dispatch = useDispatch()
  const [generateTokenModalVisible, setGenerateTokenModalVisible] = useState(false)
  const [data, setData] = useState("{}")
  const [eventResponse, setEventResponse] = useState("")
  const [triggeredEventOnce, setTriggeredEventOnce] = useState(false)
  const useInternalToken = useSelector(state => get(state, "uiState.eventing.useInternalToken", true))
  const token = useSelector(state => get(state, "uiState.eventing.token", ""))
  const generateTokenAllowed = useSelector(state => canGenerateToken(state, projectId))

  const getToken = () => useInternalToken ? internalToken : token
  const setToken = token => {
    dispatch(set("uiState.eventing.token", token))
    form.setFieldsValue({ token })
  }

  const handleSearch = (value) => setEventType(value)

  const handleClickSubmit = e => {
    form.validateFields().then(fieldsValue => {
      try {
        handleSubmit(fieldsValue["eventType"], JSON.parse(data), fieldsValue["isSynchronous"], getToken())
          .then(res => {
            setEventResponse(JSON.stringify(parseJSONSafely(res), null, 2))
            if (!triggeredEventOnce) setTriggeredEventOnce(true)
          })
      } catch (ex) {
        notify("error", "Error", ex)
      }
    });
  };

  const formInitialValues = {
    eventType: initialEventType,
    isSynchronous: false,
    bypassSecurityRules: useInternalToken,
    token: token
  }

  return (
    <React.Fragment>
      <Form layout="vertical" form={form} initialValues={formInitialValues}
        onFinish={handleClickSubmit}>
        <FormItemLabel name='Event Type' />
        <Form.Item name="eventType" rules={[{ required: true, message: `Event type is required` }]}>
          <AutoComplete
            placeholder="Example: event-type"
            onSearch={handleSearch}
          >
            {eventTypes.filter(value => eventType ? (value.toLowerCase().includes(eventType.toLowerCase())) : true).map(type => (
              <AutoComplete.Option key={type}>{type}</AutoComplete.Option>
            ))}
          </AutoComplete>
        </Form.Item>
        <Form.Item name="isSynchronous" valuePropName="checked">
          <Checkbox>Trigger event synchronously</Checkbox>
        </Form.Item>
        <Form.Item>
          <Form.Item name="bypassSecurityRules" valuePropName="checked" noStyle>
            <Checkbox onChange={e => dispatch(set("uiState.eventing.useInternalToken", e.target.checked))}>Bypass security rules</Checkbox>
          </Form.Item>
          <Tooltip
            placement='bottomLeft'
            title='Use an internal token generated by Space Cloud to bypass all security rules for this request '
          >
            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
          </Tooltip>
        </Form.Item>
        <ConditionalFormBlock dependency="bypassSecurityRules" condition={() => !form.getFieldValue("bypassSecurityRules")} >
          <div style={{ display: "flex" }}>
            <Form.Item name="token" style={{ flex: 1 }}>
              <Input.Password
                value={token}
                placeholder='JWT Token'
                onChange={e => dispatch(set("uiState.eventing.token", e.target.value))}
              />
            </Form.Item>
            <Tooltip title={generateTokenAllowed ? "" : "You are not allowed to perform this action. This action requires modify permissions on project config"}>
              <Button disabled={!generateTokenAllowed} onClick={() => setGenerateTokenModalVisible(true)}>Generate Token</Button>
            </Tooltip>
          </div>
        </ConditionalFormBlock>
        <FormItemLabel name="Event data" description="JSON object" />
        <CodeMirror
          value={data}
          options={{
            mode: { name: "javascript", json: true },
            lineNumbers: true,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            tabSize: 2,
            autofocus: true
          }}
          onBeforeChange={(editor, data, value) => {
            setData(value)
          }}
        />
        <br />
        <Form.Item>
          <Button htmlType="submit">{triggeredEventOnce ? "Trigger another event" : "Trigger event"}</Button>
        </Form.Item>
      </Form>
      {generateTokenModalVisible && <GenerateTokenForm
        handleCancel={() => setGenerateTokenModalVisible(false)}
        handleSubmit={setToken}
        initialToken={token}
        secret={secret}
      />}
      {eventResponse && <React.Fragment>
        <br />
        <FormItemLabel name="Response" />
        <pre>{eventResponse}</pre>
      </React.Fragment>}
    </React.Fragment>
  );
}


export default TriggerForm

